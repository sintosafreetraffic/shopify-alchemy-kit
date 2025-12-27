import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Webhook Handler - Receives sleep AND activity data from Garmin
// POST /garmin/webhook
// 
// Features:
// - Signature verification via X-Garmin-Signature
// - Indexed token hash lookup with backfill for existing users
// - Idempotency via dedupe_key / summary_id
// - Consent enforcement (rejects revoked sources)
// - UTC timestamp storage with timezone_offset_seconds
// - Device model propagation
// - Feature flag rollback support
// 
// Activity Types Handled:
// - activitySummaries (Push): Workout summary data
// - activityDetails (Push): Detailed workout data with samples
// - moveIQActivities (Push): Auto-detected activities
// - activityFiles (Ping): Callback URLs for FIT file download
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-garmin-signature',
};

type SourceStatus = 'pending' | 'connected' | 'revoked' | 'refresh_failed';

interface GarminSleepData {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds: number;
  durationInSeconds: number;
  validation: string;
  timeOffsetSleepRespiration?: unknown;
  timeOffsetSleepSpo2?: unknown;
  overallSleepScore?: {
    value: number;
    qualifierKey: string;
  };
  sleepLevelsMap?: {
    deep?: Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>;
    light?: Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>;
    rem?: Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>;
    awake?: Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>;
  };
  deviceId?: string;
  deviceName?: string;
}

// Activity Summary - Push data from Garmin
interface GarminActivitySummary {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  activityId?: number;
  activityName?: string;
  activityType?: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds?: number;
  durationInSeconds?: number;
  distanceInMeters?: number;
  activeKilocalories?: number;
  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  deviceName?: string;
  manual?: boolean;
  webUpload?: boolean;
}

// Activity Detail - Push data with samples/laps
interface GarminActivityDetail {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  activityId?: number;
  summary?: {
    startTimeInSeconds: number;
    durationInSeconds?: number;
    activityType?: string;
  };
  samples?: Array<unknown>;
  laps?: Array<unknown>;
}

// Activity File - Ping data with callback URL
interface GarminActivityFile {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  activityId?: number;
  activityName?: string;
  activityType?: string;
  startTimeInSeconds?: number;
  fileType?: string;
  callbackURL?: string;
  deviceName?: string;
  manual?: boolean;
}

// MoveIQ Activity - Auto-detected movements
interface GarminMoveIQActivity {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  calendarDate?: string;
  startTimeInSeconds: number;
  offsetInSeconds?: number;
  durationInSeconds?: number;
  activityType?: string;
  activitySubType?: string;
}

interface GarminWebhookPayload {
  sleeps?: GarminSleepData[];
  epochSummaries?: unknown[];
  activitySummaries?: GarminActivitySummary[];
  activityDetails?: GarminActivityDetail[];
  activityFiles?: GarminActivityFile[];
  moveIQActivities?: GarminMoveIQActivity[];
  bodyCompositions?: unknown[];
  stressDetails?: unknown[];
  userMetrics?: unknown[];
  allDayRespiration?: unknown[];
}

interface SourceRow {
  id: string;
  user_id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  user_timezone: string | null;
  garmin_token_hash: string | null;
  domains: string[];
}

type ProcessResult = { summaryId: string; status: string; type: string; error?: string };

// Generic supabase client type for edge functions
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  delete safeData.payload;
  delete safeData.raw_payload;
  delete safeData.access_token;
  delete safeData.userAccessToken;
  delete safeData.token_hash;
  delete safeData.garmin_token_hash;
  delete safeData.callbackURL;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-webhook',
    message,
    ...safeData,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (signature.length !== expectedHex.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    log('error', 'Signature verification error', { error: String(error) });
    return false;
  }
}

async function computeTokenHash(accessToken: string, pepper: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${accessToken}:${pepper}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function computePayloadHash(payload: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

async function computeCallbackUrlHash(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

function deriveNightDate(
  startTimeSeconds: number, 
  offsetSeconds: number, 
  userTimezone?: string | null
): string {
  const startTimeMs = startTimeSeconds * 1000;
  
  if (userTimezone) {
    try {
      const localDate = new Date(startTimeMs).toLocaleDateString('en-CA', { 
        timeZone: userTimezone 
      });
      return localDate;
    } catch {
      // Fallback to offset
    }
  }
  
  const localTimeMs = startTimeMs + (offsetSeconds * 1000);
  const localDate = new Date(localTimeMs);
  return localDate.toISOString().split('T')[0];
}

function transformGarminSleep(
  garminSleep: GarminSleepData, 
  deviceModel?: string,
  userTimezone?: string | null
) {
  const startTimeUtc = new Date(garminSleep.startTimeInSeconds * 1000).toISOString();
  const endTimeUtc = new Date((garminSleep.startTimeInSeconds + garminSleep.durationInSeconds) * 1000).toISOString();
  const timezoneOffsetSeconds = garminSleep.startTimeOffsetInSeconds;
  const nightDate = deriveNightDate(
    garminSleep.startTimeInSeconds,
    timezoneOffsetSeconds,
    userTimezone
  );
  
  const stages: Array<{ stage: string; start_time: string; end_time: string }> = [];
  
  if (garminSleep.sleepLevelsMap) {
    const stageMap = { deep: 'deep', light: 'light', rem: 'rem', awake: 'awake' };
    
    for (const [garminStage, intervals] of Object.entries(garminSleep.sleepLevelsMap)) {
      const ourStage = stageMap[garminStage as keyof typeof stageMap];
      if (!ourStage || !intervals) continue;
      
      for (const interval of intervals) {
        stages.push({
          stage: ourStage,
          start_time: new Date(interval.startTimeInSeconds * 1000).toISOString(),
          end_time: new Date(interval.endTimeInSeconds * 1000).toISOString(),
        });
      }
    }
    
    stages.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }
  
  return {
    source: 'garmin' as const,
    start_time: startTimeUtc,
    end_time: endTimeUtc,
    timezone_offset_seconds: timezoneOffsetSeconds,
    night_date: nightDate,
    stages,
    external_night_id: garminSleep.summaryId,
    device_model: deviceModel || garminSleep.deviceName || undefined,
    raw_payload: garminSleep,
  };
}

// Resolve user from token - returns null if not found or revoked
async function resolveUser(
  supabaseAdmin: SupabaseClient,
  accessToken: string,
  tokenHashPepper: string,
  requiredDomain?: string
): Promise<SourceRow | null> {
  const tokenHash = await computeTokenHash(accessToken, tokenHashPepper);
  
  // Try indexed lookup first
  const { data: indexedSource, error: indexedError } = await supabaseAdmin
    .from('sleep_sources')
    .select('id, user_id, status, metadata, user_timezone, garmin_token_hash, domains')
    .eq('source', 'garmin')
    .eq('garmin_token_hash', tokenHash)
    .limit(1)
    .single();
  
  if (!indexedError && indexedSource) {
    const source = indexedSource as SourceRow;
    // Check domain permission if required
    if (requiredDomain && !source.domains?.includes(requiredDomain)) {
      log('warn', 'User does not have required domain permission', { 
        userId: source.user_id, 
        requiredDomain,
        userDomains: source.domains 
      });
      return null;
    }
    return source;
  }
  
  // Fallback to legacy scan
  const { data: legacySources } = await supabaseAdmin
    .from('sleep_sources')
    .select('id, user_id, status, metadata, user_timezone, garmin_token_hash, domains')
    .eq('source', 'garmin')
    .is('garmin_token_hash', null)
    .not('metadata', 'is', null);
  
  const foundSource = (legacySources as SourceRow[] | null)?.find(s => {
    const meta = s.metadata as Record<string, unknown>;
    return meta?.access_token === accessToken;
  });
  
  if (foundSource) {
    // Backfill the hash
    await supabaseAdmin
      .from('sleep_sources')
      .update({
        garmin_token_hash: tokenHash,
        garmin_token_hash_updated_at: new Date().toISOString(),
      })
      .eq('id', foundSource.id);
    
    if (requiredDomain && !foundSource.domains?.includes(requiredDomain)) {
      return null;
    }
    return foundSource;
  }
  
  return null;
}

// Store raw event for tracing
async function storeRawEvent(
  supabaseAdmin: SupabaseClient,
  garminUserId: string,
  summaryType: string,
  summaryId: string | null,
  payload: unknown,
  uploadWindow?: { start: number; end: number }
): Promise<string | null> {
  const payloadHash = await computePayloadHash(payload);
  
  try {
    const { data, error } = await supabaseAdmin
      .from('garmin_events_raw')
      .insert({
        garmin_user_id: garminUserId,
        summary_type: summaryType,
        summary_id: summaryId,
        payload,
        payload_hash: payloadHash,
        domain: 'activities',
        upload_window_start: uploadWindow?.start || null,
        upload_window_end: uploadWindow?.end || null,
      })
      .select('id')
      .single();
    
    if (error) {
      // Check for duplicate
      if (error.code === '23505') {
        log('info', 'Duplicate raw event', { summaryType, summaryId });
        return null;
      }
      log('error', 'Failed to store raw event', { error: error.message, summaryType });
      return null;
    }
    
    return data?.id || null;
  } catch (e) {
    log('error', 'Exception storing raw event', { error: String(e) });
    return null;
  }
}

// Process Activity Summaries (Push)
async function processActivitySummaries(
  supabaseAdmin: SupabaseClient,
  summaries: GarminActivitySummary[],
  tokenHashPepper: string
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  
  for (const activity of summaries) {
    const summaryId = activity.summaryId;
    
    try {
      const source = await resolveUser(
        supabaseAdmin, 
        activity.userAccessToken, 
        tokenHashPepper, 
        'activities'
      );
      
      if (!source) {
        results.push({ summaryId, status: 'skipped', type: 'activitySummary', error: 'SOURCE_NOT_FOUND_OR_NO_PERMISSION' });
        continue;
      }
      
      if (source.status === 'revoked') {
        results.push({ summaryId, status: 'rejected', type: 'activitySummary', error: 'CONSENT_REVOKED' });
        continue;
      }
      
      // Store raw event
      const rawEventId = await storeRawEvent(
        supabaseAdmin,
        activity.userId,
        'activitySummary',
        summaryId,
        activity
      );
      
      // Insert into garmin_activity_summaries
      const { error } = await supabaseAdmin
        .from('garmin_activity_summaries')
        .upsert({
          garmin_user_id: activity.userId,
          user_id: source.user_id,
          summary_id: summaryId,
          activity_type: activity.activityType,
          activity_name: activity.activityName,
          start_time_seconds: activity.startTimeInSeconds,
          start_time_offset_seconds: activity.startTimeOffsetInSeconds,
          duration_seconds: activity.durationInSeconds,
          distance_meters: activity.distanceInMeters,
          active_kilocalories: activity.activeKilocalories,
          avg_heart_rate_bpm: activity.averageHeartRateInBeatsPerMinute,
          max_heart_rate_bpm: activity.maxHeartRateInBeatsPerMinute,
          device_name: activity.deviceName,
          is_manual: activity.manual || false,
          is_web_upload: activity.webUpload || false,
          raw_event_id: rawEventId,
        }, { onConflict: 'summary_id' });
      
      if (error) {
        log('error', 'Failed to insert activity summary', { summaryId, error: error.message });
        results.push({ summaryId, status: 'error', type: 'activitySummary', error: error.message });
        continue;
      }
      
      // Update activity sync timestamp
      await supabaseAdmin
        .from('sleep_sources')
        .update({ 
          activity_last_sync_at: new Date().toISOString(),
          activity_status: 'syncing',
        })
        .eq('id', source.id);
      
      log('info', 'Processed activity summary', { 
        userId: source.user_id, 
        summaryId, 
        activityType: activity.activityType 
      });
      results.push({ summaryId, status: 'success', type: 'activitySummary' });
      
    } catch (error) {
      log('error', 'Error processing activity summary', { summaryId, error: String(error) });
      results.push({ summaryId, status: 'error', type: 'activitySummary', error: String(error) });
    }
  }
  
  return results;
}

// Process Activity Details (Push)
async function processActivityDetails(
  supabaseAdmin: SupabaseClient,
  details: GarminActivityDetail[],
  tokenHashPepper: string
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  
  for (const detail of details) {
    const summaryId = detail.summaryId;
    
    try {
      const source = await resolveUser(
        supabaseAdmin, 
        detail.userAccessToken, 
        tokenHashPepper, 
        'activities'
      );
      
      if (!source) {
        results.push({ summaryId, status: 'skipped', type: 'activityDetail', error: 'SOURCE_NOT_FOUND_OR_NO_PERMISSION' });
        continue;
      }
      
      if (source.status === 'revoked') {
        results.push({ summaryId, status: 'rejected', type: 'activityDetail', error: 'CONSENT_REVOKED' });
        continue;
      }
      
      // Store raw event
      const rawEventId = await storeRawEvent(
        supabaseAdmin,
        detail.userId,
        'activityDetail',
        summaryId,
        detail
      );
      
      // Insert into garmin_activity_details
      const { error } = await supabaseAdmin
        .from('garmin_activity_details')
        .upsert({
          garmin_user_id: detail.userId,
          user_id: source.user_id,
          summary_id: summaryId,
          activity_id: detail.activityId?.toString(),
          start_time_seconds: detail.summary?.startTimeInSeconds || 0,
          duration_seconds: detail.summary?.durationInSeconds,
          has_samples: !!detail.samples?.length,
          samples_count: detail.samples?.length || 0,
          lap_count: detail.laps?.length || 0,
          raw_event_id: rawEventId,
        }, { onConflict: 'summary_id' });
      
      if (error) {
        log('error', 'Failed to insert activity detail', { summaryId, error: error.message });
        results.push({ summaryId, status: 'error', type: 'activityDetail', error: error.message });
        continue;
      }
      
      log('info', 'Processed activity detail', { 
        userId: source.user_id, 
        summaryId,
        hasSamples: !!detail.samples?.length 
      });
      results.push({ summaryId, status: 'success', type: 'activityDetail' });
      
    } catch (error) {
      log('error', 'Error processing activity detail', { summaryId, error: String(error) });
      results.push({ summaryId, status: 'error', type: 'activityDetail', error: String(error) });
    }
  }
  
  return results;
}

// Process Activity Files (Ping - stores callback URL for later download)
async function processActivityFiles(
  supabaseAdmin: SupabaseClient,
  files: GarminActivityFile[],
  tokenHashPepper: string
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  
  for (const file of files) {
    const summaryId = file.summaryId;
    
    try {
      const source = await resolveUser(
        supabaseAdmin, 
        file.userAccessToken, 
        tokenHashPepper, 
        'activities'
      );
      
      if (!source) {
        results.push({ summaryId, status: 'skipped', type: 'activityFile', error: 'SOURCE_NOT_FOUND_OR_NO_PERMISSION' });
        continue;
      }
      
      if (source.status === 'revoked') {
        results.push({ summaryId, status: 'rejected', type: 'activityFile', error: 'CONSENT_REVOKED' });
        continue;
      }
      
      if (!file.callbackURL) {
        log('warn', 'Activity file missing callbackURL', { summaryId });
        results.push({ summaryId, status: 'error', type: 'activityFile', error: 'MISSING_CALLBACK_URL' });
        continue;
      }
      
      // Store raw event (without callback URL for security)
      const rawEventId = await storeRawEvent(
        supabaseAdmin,
        file.userId,
        'activityFile',
        summaryId,
        { ...file, callbackURL: '[REDACTED]' }
      );
      
      // Hash callback URL for deduplication
      const callbackUrlHash = await computeCallbackUrlHash(file.callbackURL);
      
      // Store file record with callback URL - expires in 24h
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabaseAdmin
        .from('garmin_activity_files')
        .upsert({
          garmin_user_id: file.userId,
          user_id: source.user_id,
          summary_id: summaryId,
          activity_id: file.activityId?.toString(),
          activity_type: file.activityType,
          activity_name: file.activityName,
          file_type: file.fileType,
          device_name: file.deviceName,
          is_manual: file.manual || false,
          start_time_seconds: file.startTimeInSeconds,
          callback_url_hash: callbackUrlHash,
          callback_expires_at: expiresAt,
          download_status: 'pending',
          raw_event_id: rawEventId,
        }, { onConflict: 'summary_id' });
      
      if (error) {
        log('error', 'Failed to insert activity file record', { summaryId, error: error.message });
        results.push({ summaryId, status: 'error', type: 'activityFile', error: error.message });
        continue;
      }
      
      // Store encrypted callback URL in metadata (separate from public record)
      // For now, store in app_settings keyed by summary_id (short-lived)
      await supabaseAdmin
        .from('app_settings')
        .upsert({
          key: `garmin_callback:${summaryId}`,
          value: { 
            url: file.callbackURL, 
            user_id: source.user_id,
            expires_at: expiresAt 
          },
        }, { onConflict: 'key' });
      
      log('info', 'Stored activity file callback', { 
        userId: source.user_id, 
        summaryId,
        fileType: file.fileType,
        expiresAt 
      });
      results.push({ summaryId, status: 'success', type: 'activityFile' });
      
    } catch (error) {
      log('error', 'Error processing activity file', { summaryId, error: String(error) });
      results.push({ summaryId, status: 'error', type: 'activityFile', error: String(error) });
    }
  }
  
  return results;
}

// Process MoveIQ Activities (Push)
async function processMoveIQActivities(
  supabaseAdmin: SupabaseClient,
  activities: GarminMoveIQActivity[],
  tokenHashPepper: string
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  
  for (const activity of activities) {
    const summaryId = activity.summaryId;
    
    try {
      const source = await resolveUser(
        supabaseAdmin, 
        activity.userAccessToken, 
        tokenHashPepper, 
        'activities'
      );
      
      if (!source) {
        results.push({ summaryId, status: 'skipped', type: 'moveIQ', error: 'SOURCE_NOT_FOUND_OR_NO_PERMISSION' });
        continue;
      }
      
      if (source.status === 'revoked') {
        results.push({ summaryId, status: 'rejected', type: 'moveIQ', error: 'CONSENT_REVOKED' });
        continue;
      }
      
      // Store raw event
      const rawEventId = await storeRawEvent(
        supabaseAdmin,
        activity.userId,
        'moveIQActivity',
        summaryId,
        activity
      );
      
      // Insert into garmin_moveiq_events
      const { error } = await supabaseAdmin
        .from('garmin_moveiq_events')
        .upsert({
          garmin_user_id: activity.userId,
          user_id: source.user_id,
          summary_id: summaryId,
          calendar_date: activity.calendarDate || new Date(activity.startTimeInSeconds * 1000).toISOString().split('T')[0],
          start_time_seconds: activity.startTimeInSeconds,
          offset_seconds: activity.offsetInSeconds,
          duration_seconds: activity.durationInSeconds,
          activity_type: activity.activityType,
          activity_subtype: activity.activitySubType,
          raw_event_id: rawEventId,
        }, { onConflict: 'summary_id' });
      
      if (error) {
        log('error', 'Failed to insert moveIQ activity', { summaryId, error: error.message });
        results.push({ summaryId, status: 'error', type: 'moveIQ', error: error.message });
        continue;
      }
      
      log('info', 'Processed moveIQ activity', { 
        userId: source.user_id, 
        summaryId,
        activityType: activity.activityType 
      });
      results.push({ summaryId, status: 'success', type: 'moveIQ' });
      
    } catch (error) {
      log('error', 'Error processing moveIQ activity', { summaryId, error: String(error) });
      results.push({ summaryId, status: 'error', type: 'moveIQ', error: String(error) });
    }
  }
  
  return results;
}

// Process Sleep data (existing logic, refactored)
async function processSleepData(
  supabaseAdmin: SupabaseClient,
  sleeps: GarminSleepData[],
  tokenHashPepper: string
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  
  for (const garminSleep of sleeps) {
    const summaryId = garminSleep.summaryId;
    
    try {
      const tokenHash = await computeTokenHash(garminSleep.userAccessToken, tokenHashPepper);
      
      // Try indexed lookup first
      let matchingSource: SourceRow | null = null;
      
      const { data: indexedSource, error: indexedError } = await supabaseAdmin
        .from('sleep_sources')
        .select('id, user_id, status, metadata, user_timezone, garmin_token_hash, domains')
        .eq('source', 'garmin')
        .eq('garmin_token_hash', tokenHash)
        .limit(1)
        .single();
      
      if (!indexedError && indexedSource) {
        matchingSource = indexedSource as SourceRow;
        log('info', 'User resolved via indexed hash lookup', { 
          userId: matchingSource.user_id, 
          summaryId 
        });
      } else {
        // Fallback to legacy scan
        log('info', 'Indexed lookup failed, attempting backfill scan', { summaryId });
        
        const { data: legacySources, error: legacyError } = await supabaseAdmin
          .from('sleep_sources')
          .select('id, user_id, status, metadata, user_timezone, garmin_token_hash, domains')
          .eq('source', 'garmin')
          .is('garmin_token_hash', null)
          .not('metadata', 'is', null);
        
        if (legacyError) {
          log('error', 'Failed to query legacy sources', { error: legacyError.message });
          results.push({ summaryId, status: 'error', type: 'sleep', error: 'Database error' });
          continue;
        }
        
        const foundSource = (legacySources as SourceRow[] | null)?.find(s => {
          const meta = s.metadata as Record<string, unknown>;
          return meta?.access_token === garminSleep.userAccessToken;
        });
        
        if (foundSource) {
          matchingSource = foundSource;
          
          // Backfill the hash
          const { error: backfillError } = await supabaseAdmin
            .from('sleep_sources')
            .update({
              garmin_token_hash: tokenHash,
              garmin_token_hash_updated_at: new Date().toISOString(),
            })
            .eq('id', foundSource.id);
          
          if (backfillError) {
            log('warn', 'Failed to backfill token hash', { 
              userId: foundSource.user_id, 
              error: backfillError.message 
            });
          } else {
            log('info', 'Backfilled token hash for existing user', { 
              userId: foundSource.user_id 
            });
          }
        }
      }
      
      if (!matchingSource) {
        log('warn', 'No matching user for Garmin access token', { summaryId });
        results.push({ summaryId, status: 'skipped', type: 'sleep', error: 'SOURCE_NOT_FOUND' });
        continue;
      }
      
      const userId = matchingSource.user_id;
      const status = matchingSource.status as SourceStatus;
      const userTimezone = matchingSource.user_timezone;
      
      if (status === 'revoked') {
        log('warn', 'Source revoked, rejecting data', { userId, summaryId });
        results.push({ summaryId, status: 'rejected', type: 'sleep', error: 'CONSENT_REVOKED' });
        continue;
      }
      
      const metadata = matchingSource.metadata as Record<string, unknown>;
      const deviceModel = metadata?.device_model as string | undefined;
      const sleepData = transformGarminSleep(
        garminSleep, 
        deviceModel || garminSleep.deviceName,
        userTimezone
      );
      
      const dedupeKey = `garmin:${userId}:${summaryId}`;
      
      // Check for duplicate
      const { data: existing } = await supabaseAdmin
        .from('sleep_raw_events')
        .select('id')
        .eq('dedupe_key', dedupeKey)
        .single();
      
      if (existing) {
        log('info', 'Duplicate sleep event, skipping', { userId, summaryId, dedupeKey });
        results.push({ summaryId, status: 'duplicate', type: 'sleep' });
        continue;
      }
      
      // Insert raw event
      const { data: rawEvent, error: insertError } = await supabaseAdmin
        .from('sleep_raw_events')
        .insert({
          user_id: userId,
          source: 'garmin',
          start_time: sleepData.start_time,
          end_time: sleepData.end_time,
          timezone_offset_seconds: sleepData.timezone_offset_seconds,
          stages: sleepData.stages,
          dedupe_key: dedupeKey,
          external_night_id: summaryId,
          device_model: sleepData.device_model,
          raw_payload: sleepData.raw_payload,
          is_test: false,
        })
        .select('id')
        .single();
      
      if (insertError) {
        log('error', 'Failed to insert raw event', { userId, summaryId, error: insertError.message });
        results.push({ summaryId, status: 'error', type: 'sleep', error: insertError.message });
        continue;
      }
      
      // Calculate normalized metrics
      const totalMinutes = Math.round(
        (new Date(sleepData.end_time).getTime() - new Date(sleepData.start_time).getTime()) / 60000
      );
      
      let sleepMinutes = totalMinutes;
      let wakeEvents = 0;
      
      if (sleepData.stages.length > 0) {
        sleepMinutes = 0;
        for (const stage of sleepData.stages) {
          const duration = (new Date(stage.end_time).getTime() - new Date(stage.start_time).getTime()) / 60000;
          if (stage.stage === 'awake') {
            wakeEvents++;
          } else {
            sleepMinutes += duration;
          }
        }
        sleepMinutes = Math.round(sleepMinutes);
      }
      
      const efficiency = totalMinutes > 0 
        ? Math.round((sleepMinutes / totalMinutes) * 100 * 100) / 100 
        : null;
      
      const isBackfillData = metadata?.backfill_requested_at && !metadata?.backfill_completed_at;
      const dataOrigin = isBackfillData ? 'backfill' : 'webhook';
      
      // Insert normalized night
      const { error: nightError } = await supabaseAdmin
        .from('sleep_nights')
        .insert({
          user_id: userId,
          source: 'garmin',
          night_date: sleepData.night_date,
          start_time: sleepData.start_time,
          end_time: sleepData.end_time,
          timezone_offset_seconds: sleepData.timezone_offset_seconds,
          total_sleep_minutes: sleepMinutes,
          sleep_efficiency: efficiency,
          wake_events: wakeEvents,
          device_model: sleepData.device_model,
          raw_event_id: rawEvent.id,
          normalization_version: 1,
          is_test: false,
          data_origin: dataOrigin,
          ingested_at: new Date().toISOString(),
        });
      
      if (nightError) {
        log('error', 'Failed to insert sleep night', { userId, summaryId, error: nightError.message });
        results.push({ summaryId, status: 'partial', type: 'sleep', error: 'Night insert failed' });
        continue;
      }
      
      // Update source status
      const nowTs = new Date().toISOString();
      const updatePayload: Record<string, unknown> = {
        last_sync_at: nowTs,
        metadata: {
          ...metadata,
          device_model: sleepData.device_model || metadata?.device_model,
        },
      };

      if (status === 'pending') {
        updatePayload.status = 'connected';
      }

      if (dataOrigin === 'backfill') {
        const currentCount = (metadata?.backfill_nights_count as number) || 0;
        const newCount = currentCount + 1;
        updatePayload.backfill_nights_count = newCount;
        
        if (newCount >= 3 && !metadata?.backfill_completed_at) {
          updatePayload.backfill_completed_at = nowTs;
          updatePayload.backfill_status = 'completed';
          log('info', 'Backfill completed', { userId, nightsCount: newCount });
        }
      }

      try {
        await supabaseAdmin
          .from('sleep_sources')
          .update(updatePayload)
          .eq('user_id', userId)
          .eq('source', 'garmin');
      } catch (updateErr) {
        log('warn', 'Failed to update sleep_sources', { 
          userId, 
          error: updateErr instanceof Error ? updateErr.message : String(updateErr) 
        });
      }
      
      log('info', 'Successfully processed sleep data', { 
        userId, 
        summaryId, 
        nightDate: sleepData.night_date,
        sleepMinutes,
        deviceModel: sleepData.device_model,
      });
      
      results.push({ summaryId, status: 'success', type: 'sleep' });
      
    } catch (error) {
      log('error', 'Error processing sleep entry', { 
        summaryId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      results.push({ summaryId, status: 'error', type: 'sleep', error: String(error) });
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const garminWebhookSecret = Deno.env.get('GARMIN_WEBHOOK_SECRET');
    const tokenHashPepper = Deno.env.get('GARMIN_TOKEN_HASH_PEPPER');
    const garminSyncEnabled = Deno.env.get('GARMIN_SYNC_ENABLED') !== 'false';
    
    if (!garminSyncEnabled) {
      log('info', 'Garmin sync disabled via feature flag');
      return new Response(
        JSON.stringify({ error: 'Garmin sync temporarily disabled' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!garminWebhookSecret || !tokenHashPepper) {
      log('error', 'Missing required secrets');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const bodyText = await req.text();
    const signature = req.headers.get('x-garmin-signature') || req.headers.get('X-Garmin-Signature');
    
    if (!signature) {
      log('warn', 'Missing X-Garmin-Signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const isValid = await verifySignature(bodyText, signature, garminWebhookSecret);
    if (!isValid) {
      log('warn', 'Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let payload: GarminWebhookPayload;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      log('error', 'Malformed webhook payload', { error: String(e) });
      return new Response(
        JSON.stringify({ error: 'Malformed JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Count incoming data types
    const counts = {
      sleeps: payload.sleeps?.length || 0,
      activitySummaries: payload.activitySummaries?.length || 0,
      activityDetails: payload.activityDetails?.length || 0,
      activityFiles: payload.activityFiles?.length || 0,
      moveIQActivities: payload.moveIQActivities?.length || 0,
    };
    
    const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
    
    if (totalItems === 0) {
      log('info', 'Webhook received with no processable data');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No processable data in payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Processing Garmin webhook', counts);
    
    // Process all data types in parallel
    const [sleepResults, activitySummaryResults, activityDetailResults, activityFileResults, moveIQResults] = 
      await Promise.all([
        payload.sleeps?.length 
          ? processSleepData(supabaseAdmin, payload.sleeps, tokenHashPepper)
          : Promise.resolve([]),
        payload.activitySummaries?.length
          ? processActivitySummaries(supabaseAdmin, payload.activitySummaries, tokenHashPepper)
          : Promise.resolve([]),
        payload.activityDetails?.length
          ? processActivityDetails(supabaseAdmin, payload.activityDetails, tokenHashPepper)
          : Promise.resolve([]),
        payload.activityFiles?.length
          ? processActivityFiles(supabaseAdmin, payload.activityFiles, tokenHashPepper)
          : Promise.resolve([]),
        payload.moveIQActivities?.length
          ? processMoveIQActivities(supabaseAdmin, payload.moveIQActivities, tokenHashPepper)
          : Promise.resolve([]),
      ]);
    
    const allResults = [
      ...sleepResults,
      ...activitySummaryResults,
      ...activityDetailResults,
      ...activityFileResults,
      ...moveIQResults,
    ];
    
    const duration = Date.now() - startTime;
    const successCount = allResults.filter(r => r.status === 'success').length;
    const duplicateCount = allResults.filter(r => r.status === 'duplicate').length;
    
    log('info', 'Webhook processing complete', { 
      total: allResults.length,
      success: successCount,
      duplicate: duplicateCount,
      duration,
      ...counts,
    });
    
    return new Response(
      JSON.stringify({ 
        processed: allResults.length,
        success: successCount,
        duplicate: duplicateCount,
        results: allResults,
        counts,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    log('error', 'Unexpected error in garmin-webhook', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

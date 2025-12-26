import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Webhook Handler - Receives sleep data from Garmin
// POST /garmin/webhook
// 
// Features:
// - Signature verification via X-Garmin-Signature
// - Indexed token hash lookup with backfill for existing users
// - Idempotency via dedupe_key
// - Consent enforcement (rejects revoked sources)
// - UTC timestamp storage with timezone_offset_seconds
// - Device model propagation
// - Feature flag rollback support
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-garmin-signature',
};

type SourceStatus = 'pending' | 'connected' | 'revoked' | 'refresh_failed';

interface GarminSleepData {
  userId: string; // Garmin user ID
  userAccessToken: string; // Our stored OAuth token
  summaryId: string; // Unique sleep session ID
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
  // Device info may be included
  deviceId?: string;
  deviceName?: string;
}

interface GarminWebhookPayload {
  sleeps?: GarminSleepData[];
  epochSummaries?: unknown[];
  activitySummaries?: unknown[];
  bodyCompositions?: unknown[];
  stressDetails?: unknown[];
  userMetrics?: unknown[];
  moveIQActivities?: unknown[];
  allDayRespiration?: unknown[];
}

interface SourceRow {
  id: string;
  user_id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  user_timezone: string | null;
  garmin_token_hash: string | null;
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  // Never log tokens, hashes, or payloads
  delete safeData.payload;
  delete safeData.raw_payload;
  delete safeData.access_token;
  delete safeData.userAccessToken;
  delete safeData.token_hash;
  delete safeData.garmin_token_hash;
  
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

// Verify Garmin webhook signature
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
    
    // Constant-time comparison
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

// Compute SHA-256 hash of access token with pepper
async function computeTokenHash(accessToken: string, pepper: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${accessToken}:${pepper}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive night_date from UTC timestamp using timezone
function deriveNightDate(
  startTimeSeconds: number, 
  offsetSeconds: number, 
  userTimezone?: string | null
): string {
  // Get the local time at sleep start
  const startTimeMs = startTimeSeconds * 1000;
  
  if (userTimezone) {
    // Use IANA timezone for DST-safe derivation
    try {
      const localDate = new Date(startTimeMs).toLocaleDateString('en-CA', { 
        timeZone: userTimezone 
      });
      return localDate; // Returns YYYY-MM-DD format
    } catch {
      // Fallback to offset if timezone is invalid
    }
  }
  
  // Fallback: use offset to derive local date
  const localTimeMs = startTimeMs + (offsetSeconds * 1000);
  const localDate = new Date(localTimeMs);
  return localDate.toISOString().split('T')[0];
}

// Convert Garmin sleep data to our intake format with UTC timestamps
function transformGarminSleep(
  garminSleep: GarminSleepData, 
  deviceModel?: string,
  userTimezone?: string | null
) {
  // Store as UTC (Z suffix)
  const startTimeUtc = new Date(garminSleep.startTimeInSeconds * 1000).toISOString();
  const endTimeUtc = new Date((garminSleep.startTimeInSeconds + garminSleep.durationInSeconds) * 1000).toISOString();
  
  // Store offset for reference
  const timezoneOffsetSeconds = garminSleep.startTimeOffsetInSeconds;
  
  // Derive night_date using timezone or offset
  const nightDate = deriveNightDate(
    garminSleep.startTimeInSeconds,
    timezoneOffsetSeconds,
    userTimezone
  );
  
  // Transform sleep stages with UTC timestamps
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
    
    // Sort stages by start time
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
    const garminSyncEnabled = Deno.env.get('GARMIN_SYNC_ENABLED') !== 'false'; // Default enabled
    
    // Feature flag check - graceful disable
    if (!garminSyncEnabled) {
      log('info', 'Garmin sync disabled via feature flag, rejecting webhook');
      return new Response(
        JSON.stringify({ error: 'Garmin sync temporarily disabled' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!garminWebhookSecret) {
      log('error', 'GARMIN_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!tokenHashPepper) {
      log('error', 'GARMIN_TOKEN_HASH_PEPPER not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get raw body for signature verification
    const bodyText = await req.text();
    const signature = req.headers.get('x-garmin-signature') || req.headers.get('X-Garmin-Signature');
    
    if (!signature) {
      log('warn', 'Missing X-Garmin-Signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify signature
    const isValid = await verifySignature(bodyText, signature, garminWebhookSecret);
    if (!isValid) {
      log('warn', 'Invalid webhook signature', { 
        signatureLength: signature.length,
        bodyLength: bodyText.length,
      });
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse payload
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
    
    // Process sleep data
    const sleeps = payload.sleeps || [];
    if (sleeps.length === 0) {
      log('info', 'Webhook received with no sleep data', { 
        hasEpochs: !!payload.epochSummaries?.length,
        hasActivities: !!payload.activitySummaries?.length,
      });
      return new Response(
        JSON.stringify({ processed: 0, message: 'No sleep data in payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Processing Garmin webhook', { sleepCount: sleeps.length });
    
    const results: Array<{ summaryId: string; status: string; error?: string }> = [];
    
    for (const garminSleep of sleeps) {
      const summaryId = garminSleep.summaryId;
      
      try {
        // Compute token hash for lookup
        const tokenHash = await computeTokenHash(garminSleep.userAccessToken, tokenHashPepper);
        
        // STEP 1: Try indexed lookup first (O(1))
        let matchingSource: SourceRow | null = null;
        
        const { data: indexedSource, error: indexedError } = await supabaseAdmin
          .from('sleep_sources')
          .select('id, user_id, status, metadata, user_timezone, garmin_token_hash')
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
          // STEP 2: Fallback to legacy scan for users without hash (backfill)
          log('info', 'Indexed lookup failed, attempting backfill scan', { summaryId });
          
          const { data: legacySources, error: legacyError } = await supabaseAdmin
            .from('sleep_sources')
            .select('id, user_id, status, metadata, user_timezone, garmin_token_hash')
            .eq('source', 'garmin')
            .is('garmin_token_hash', null)
            .not('metadata', 'is', null);
          
          if (legacyError) {
            log('error', 'Failed to query legacy sources', { error: legacyError.message });
            results.push({ summaryId, status: 'error', error: 'Database error' });
            continue;
          }
          
          // Find matching user by access token
          const foundSource = legacySources?.find(s => {
            const meta = s.metadata as Record<string, unknown>;
            return meta?.access_token === garminSleep.userAccessToken;
          });
          
          if (foundSource) {
            matchingSource = foundSource as SourceRow;
            
            // Backfill the hash for future indexed lookups
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
        
        // No user found
        if (!matchingSource) {
          log('warn', 'No matching user for Garmin access token', { summaryId });
          // Return 200 to prevent Garmin retries
          results.push({ summaryId, status: 'skipped', error: 'SOURCE_NOT_FOUND' });
          continue;
        }
        
        const userId = matchingSource.user_id;
        const status = matchingSource.status as SourceStatus;
        const userTimezone = matchingSource.user_timezone;
        
        // Consent enforcement
        if (status === 'revoked') {
          log('warn', 'Source revoked, rejecting data', { userId, summaryId });
          results.push({ 
            summaryId, 
            status: 'rejected', 
            error: 'CONSENT_REVOKED' 
          });
          continue;
        }
        
        // Transform to our format with UTC timestamps
        const metadata = matchingSource.metadata as Record<string, unknown>;
        const deviceModel = metadata?.device_model as string | undefined;
        const sleepData = transformGarminSleep(
          garminSleep, 
          deviceModel || garminSleep.deviceName,
          userTimezone
        );
        
        // Generate dedupe key
        const dedupeKey = `garmin:${userId}:${summaryId}`;
        
        // Check for duplicate
        const { data: existing } = await supabaseAdmin
          .from('sleep_raw_events')
          .select('id')
          .eq('dedupe_key', dedupeKey)
          .single();
        
        if (existing) {
          log('info', 'Duplicate sleep event, skipping', { userId, summaryId, dedupeKey });
          results.push({ summaryId, status: 'duplicate' });
          continue;
        }
        
        // Insert raw event with UTC timestamps and timezone_offset_seconds
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
          results.push({ summaryId, status: 'error', error: insertError.message });
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
        
        // Insert normalized night with UTC timestamps and timezone_offset_seconds
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
          });
        
        if (nightError) {
          log('error', 'Failed to insert sleep night', { userId, summaryId, error: nightError.message });
          results.push({ summaryId, status: 'partial', error: 'Night insert failed' });
          continue;
        }
        
        // Update source status to connected on first successful ingest
        if (status === 'pending') {
          await supabaseAdmin
            .from('sleep_sources')
            .update({ 
              status: 'connected',
              last_sync_at: new Date().toISOString(),
              metadata: {
                ...metadata,
                device_model: sleepData.device_model || metadata?.device_model,
              },
            })
            .eq('user_id', userId)
            .eq('source', 'garmin');
        } else {
          // Just update last_sync_at and device_model
          await supabaseAdmin
            .from('sleep_sources')
            .update({ 
              last_sync_at: new Date().toISOString(),
              metadata: {
                ...metadata,
                device_model: sleepData.device_model || metadata?.device_model,
              },
            })
            .eq('user_id', userId)
            .eq('source', 'garmin');
        }
        
        log('info', 'Successfully processed sleep data', { 
          userId, 
          summaryId, 
          nightDate: sleepData.night_date,
          sleepMinutes,
          deviceModel: sleepData.device_model,
          timezoneOffsetSeconds: sleepData.timezone_offset_seconds,
        });
        
        results.push({ summaryId, status: 'success' });
        
      } catch (error) {
        log('error', 'Error processing sleep entry', { 
          summaryId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        results.push({ summaryId, status: 'error', error: String(error) });
      }
    }
    
    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const duplicateCount = results.filter(r => r.status === 'duplicate').length;
    
    log('info', 'Webhook processing complete', { 
      total: results.length,
      success: successCount,
      duplicate: duplicateCount,
      duration,
    });
    
    return new Response(
      JSON.stringify({ 
        processed: results.length,
        success: successCount,
        duplicate: duplicateCount,
        results,
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

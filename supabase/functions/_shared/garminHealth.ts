/**
 * Shared utilities for Garmin Health API ingestion
 * Handles raw storage, normalization, and user mapping
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Types
// ============================================================

export interface GarminDailyPayload {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  calendarDate: string;  // "yyyy-MM-dd"
  startTimeInSeconds: number;
  startTimeOffsetInSeconds?: number;
  durationInSeconds?: number;
  steps?: number;
  activeTimeInSeconds?: number;
  vigorousIntensityDurationInSeconds?: number;
  floorsClimbed?: number;
  intensityMinutesGoal?: number;
  averageStressLevel?: number;
  maxStressLevel?: number;
  stressDurationInSeconds?: number;
  restStressDurationInSeconds?: number;
  activityStressDurationInSeconds?: number;
  lowStressDurationInSeconds?: number;
  mediumStressDurationInSeconds?: number;
  highStressDurationInSeconds?: number;
}

export interface GarminSleepPayload {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  calendarDate: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds?: number;
  durationInSeconds?: number;
  unmeasurableSleepInSeconds?: number;
  deepSleepDurationInSeconds?: number;
  lightSleepDurationInSeconds?: number;
  remSleepInSeconds?: number;
  awakeDurationInSeconds?: number;
  validation?: string;
  overallSleepScore?: {
    value: number;
    qualifierKey: string;
  };
  sleepLevelsMap?: Record<string, Array<{ startTimeInSeconds: number; endTimeInSeconds: number }>>;
}

export interface HealthPingItem {
  userId: string;
  userAccessToken: string;
  callbackURL?: string;
  summaryId?: string;
  uploadStartTimeInSeconds?: number;
  uploadEndTimeInSeconds?: number;
}

export interface RawEventInsert {
  domain: string;
  summary_type: string;
  garmin_user_id: string;
  summary_id: string | null;
  upload_window_start: number | null;
  upload_window_end: number | null;
  payload: unknown;
  payload_hash: string;
}

// ============================================================
// Logging
// ============================================================

export function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-health',
    message,
    ...data,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ============================================================
// Hash computation for deduplication
// ============================================================

export async function computePayloadHash(payload: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// User resolution from Garmin token
// ============================================================

export async function resolveUserFromToken(
  supabase: SupabaseClient,
  accessToken: string,
  tokenHashPepper: string
): Promise<{ userId: string; garminUserId: string; timezone: string | null; onHold: boolean } | null> {
  // Compute token hash
  const encoder = new TextEncoder();
  const combined = `${accessToken}:${tokenHashPepper}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(combined));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const { data: source, error } = await supabase
    .from('sleep_sources')
    .select('user_id, user_timezone, on_hold, metadata')
    .eq('source', 'garmin')
    .eq('garmin_token_hash', tokenHash)
    .eq('status', 'connected')
    .limit(1)
    .single();

  if (error || !source) {
    return null;
  }

  // Extract garmin_user_id from metadata or first payload
  const metadata = source.metadata as Record<string, unknown> | null;
  const garminUserId = metadata?.garmin_user_id as string || '';

  return {
    userId: source.user_id,
    garminUserId,
    timezone: source.user_timezone,
    onHold: source.on_hold || false,
  };
}

// ============================================================
// Raw event storage (idempotent via payload_hash)
// ============================================================

export async function storeRawEvent(
  supabase: SupabaseClient,
  event: RawEventInsert
): Promise<{ inserted: boolean; id: string | null; error: string | null }> {
  // First check if exists (dedupe)
  const { data: existing } = await supabase
    .from('garmin_events_raw')
    .select('id')
    .eq('payload_hash', event.payload_hash)
    .limit(1)
    .single();

  if (existing) {
    return { inserted: false, id: existing.id, error: null };
  }

  // Insert new
  const { data: inserted, error } = await supabase
    .from('garmin_events_raw')
    .insert(event)
    .select('id')
    .single();

  if (error) {
    // Could be race condition duplicate - check again
    if (error.code === '23505') {
      const { data: raceExisting } = await supabase
        .from('garmin_events_raw')
        .select('id')
        .eq('payload_hash', event.payload_hash)
        .limit(1)
        .single();
      return { inserted: false, id: raceExisting?.id || null, error: null };
    }
    return { inserted: false, id: null, error: error.message };
  }

  return { inserted: true, id: inserted?.id || null, error: null };
}

// ============================================================
// Normalize Daily Summary
// ============================================================

export async function normalizeDaily(
  supabase: SupabaseClient,
  daily: GarminDailyPayload,
  rawEventId: string | null,
  userId: string | null
): Promise<{ success: boolean; error: string | null }> {
  const calendarDate = daily.calendarDate; // Already "yyyy-MM-dd"

  const { error } = await supabase
    .from('garmin_dailies')
    .upsert(
      {
        user_id: userId,
        garmin_user_id: daily.userId,
        calendar_date: calendarDate,
        summary_id: daily.summaryId,
        start_time_seconds: daily.startTimeInSeconds,
        duration_seconds: daily.durationInSeconds || null,
        steps: daily.steps || null,
        active_seconds: daily.activeTimeInSeconds || null,
        vigorous_activity_seconds: daily.vigorousIntensityDurationInSeconds || null,
        floors_climbed: daily.floorsClimbed || null,
        intensity_minutes_goal: daily.intensityMinutesGoal || null,
        raw_event_id: rawEventId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'garmin_user_id,calendar_date',
        ignoreDuplicates: false,
      }
    );

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}

// ============================================================
// Normalize Sleep Summary
// ============================================================

export async function normalizeSleep(
  supabase: SupabaseClient,
  sleep: GarminSleepPayload,
  rawEventId: string | null,
  userId: string | null
): Promise<{ success: boolean; error: string | null }> {
  const calendarDate = sleep.calendarDate;

  const { error } = await supabase
    .from('garmin_sleeps')
    .upsert(
      {
        user_id: userId,
        garmin_user_id: sleep.userId,
        summary_id: sleep.summaryId,
        calendar_date: calendarDate,
        start_time_seconds: sleep.startTimeInSeconds,
        duration_sleep_seconds: sleep.durationInSeconds || null,
        awake_seconds: sleep.awakeDurationInSeconds || null,
        light_seconds: sleep.lightSleepDurationInSeconds || null,
        deep_seconds: sleep.deepSleepDurationInSeconds || null,
        rem_seconds: sleep.remSleepInSeconds || null,
        validation: sleep.validation || null,
        raw_event_id: rawEventId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'garmin_user_id,start_time_seconds',
        ignoreDuplicates: false,
      }
    );

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}

// ============================================================
// Update health_last_sync_at
// ============================================================

export async function updateHealthLastSync(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from('sleep_sources')
    .update({ health_last_sync_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('source', 'garmin');
}

// ============================================================
// Process callback URL (async, fire-and-forget from ping)
// ============================================================

export async function fetchCallback(
  callbackUrl: string,
  timeoutMs: number = 25000
): Promise<{ success: boolean; data: unknown; error: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(callbackUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { 
        success: false, 
        data: null, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    const data = await response.json();
    return { success: true, data, error: null };
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, data: null, error: message };
  }
}

// ============================================================
// Create Supabase admin client
// ============================================================

export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

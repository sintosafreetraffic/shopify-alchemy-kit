import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Sleep Data Integration Foundation v2.3
// POST /sleep/intake - Unified vendor-agnostic intake endpoint
// 
// v2.3 Changes:
// - Added is_test column support for analytics isolation
// - Fixed timezone-correct test payload generation using user_timezone
// - Skip sleep_logs insert in test mode (no analytics pollution)
// - Deterministic dedupe_key uses night_date for test mode
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-source, x-signature',
};

// Types
type SleepSource = 'apple_health' | 'garmin';
type SleepStage = 'awake' | 'light' | 'deep' | 'rem';
type LogSource = 'manual' | 'whatsapp' | 'wearable_apple_health' | 'wearable_garmin';
type SourceStatus = 'pending' | 'connected' | 'revoked';

// Map sleep_sources.source to log_source enum
function mapSourceToLogSource(source: SleepSource): LogSource {
  switch (source) {
    case 'apple_health':
      return 'wearable_apple_health';
    case 'garmin':
      return 'wearable_garmin';
    default:
      return 'manual';
  }
}

interface RawSleepStage {
  stage: SleepStage;
  start_time: string;
  end_time: string;
  confidence?: number;
}

interface RawSleepInput {
  source: SleepSource;
  user_id?: string;
  email?: string;
  start_time: string;
  end_time: string;
  stages?: RawSleepStage[];
  external_night_id?: string;
  dedupe_key?: string;
  raw_payload?: Record<string, unknown>;
  test_mode?: boolean; // Dev-only test mode flag
}

interface IntakeResponse {
  status: 'success' | 'duplicate' | 'error';
  code?: string;
  sleep_night_id?: string;
  existing_raw_event_id?: string;
  message?: string;
  test_mode?: boolean;
}

interface SourceRow {
  id: string;
  status: SourceStatus;
  user_timezone: string | null;
  connected_at: string | null;
}

// Constants
const RATE_LIMIT_MAX = 100;
const NORMALIZATION_VERSION = 1;
const VALID_SOURCES: SleepSource[] = ['apple_health', 'garmin'];
const VALID_STAGES: SleepStage[] = ['awake', 'light', 'deep', 'rem'];

// ============================================================
// Utility Functions
// ============================================================

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  delete safeData.raw_payload;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'sleep-intake',
    message,
    ...safeData,
  };
  
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

function isValidISO8601WithOffset(dateStr: string): boolean {
  const iso8601WithOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  if (!iso8601WithOffset.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function extractTimezoneOffset(dateStr: string): number {
  const match = dateStr.match(/([+-])(\d{2}):(\d{2})$/);
  if (match) {
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    return sign * (hours * 60 + minutes);
  }
  return 0;
}

/**
 * Derive night_date from start_time, respecting user's timezone.
 * If userTimezone is provided (IANA format like "Europe/Copenhagen"), use it.
 * Otherwise fall back to offset extracted from the timestamp.
 */
function deriveNightDate(startTime: string, userTimezone?: string): string {
  const startDate = new Date(startTime);
  
  if (userTimezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(startDate);
    } catch {
      // Fall through to offset-based derivation
    }
  }
  
  const offsetMinutes = extractTimezoneOffset(startTime);
  const localDate = new Date(startDate.getTime() + offsetMinutes * 60 * 1000);
  return localDate.toISOString().split('T')[0];
}

function computeDedupeKey(input: RawSleepInput, userId: string): string {
  if (input.external_night_id) {
    return `${input.source}:${userId}:${input.external_night_id}`;
  }
  
  const stagesCount = input.stages?.length || 0;
  const payloadSignature = input.raw_payload 
    ? JSON.stringify(input.raw_payload).length.toString() 
    : '0';
  
  const data = `${userId}:${input.source}:${input.start_time}:${input.end_time}:${stagesCount}:${payloadSignature}`;
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `${input.source}:${userId}:${Math.abs(hash).toString(16)}`;
}

function normalizeToNightlyMetrics(input: RawSleepInput): {
  total_sleep_minutes: number | null;
  sleep_efficiency: number | null;
  wake_events: number;
} {
  const startTime = new Date(input.start_time).getTime();
  const endTime = new Date(input.end_time).getTime();
  const totalTimeInBedMinutes = (endTime - startTime) / (1000 * 60);
  
  if (!input.stages || input.stages.length === 0) {
    return {
      total_sleep_minutes: Math.round(totalTimeInBedMinutes),
      sleep_efficiency: null,
      wake_events: 0,
    };
  }
  
  let sleepMinutes = 0;
  let wakeEvents = 0;
  
  for (const stage of input.stages) {
    const stageStart = new Date(stage.start_time).getTime();
    const stageEnd = new Date(stage.end_time).getTime();
    const duration = (stageEnd - stageStart) / (1000 * 60);
    
    if (stage.stage === 'awake') {
      wakeEvents++;
    } else {
      sleepMinutes += duration;
    }
  }
  
  const efficiency = totalTimeInBedMinutes > 0 
    ? Math.round((sleepMinutes / totalTimeInBedMinutes) * 100 * 100) / 100
    : null;
  
  return {
    total_sleep_minutes: Math.round(sleepMinutes),
    sleep_efficiency: efficiency,
    wake_events: wakeEvents,
  };
}

function validateInput(input: RawSleepInput): string | null {
  if (!input.source || !VALID_SOURCES.includes(input.source)) {
    return `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`;
  }
  
  // In test_mode, we generate payload so skip timestamp validation
  if (input.test_mode) {
    return null;
  }
  
  if (!input.start_time || !isValidISO8601WithOffset(input.start_time)) {
    return 'start_time must be a valid ISO8601 string with timezone offset';
  }
  
  if (!input.end_time || !isValidISO8601WithOffset(input.end_time)) {
    return 'end_time must be a valid ISO8601 string with timezone offset';
  }
  
  if (new Date(input.end_time) <= new Date(input.start_time)) {
    return 'end_time must be after start_time';
  }
  
  if (input.stages) {
    for (const stage of input.stages) {
      if (!VALID_STAGES.includes(stage.stage)) {
        return `Invalid stage type: ${stage.stage}. Must be one of: ${VALID_STAGES.join(', ')}`;
      }
      if (!isValidISO8601WithOffset(stage.start_time) || !isValidISO8601WithOffset(stage.end_time)) {
        return 'All stage times must be valid ISO8601 strings with timezone offset';
      }
      if (stage.confidence !== undefined && (stage.confidence < 0 || stage.confidence > 1)) {
        return 'Stage confidence must be between 0 and 1';
      }
    }
  }
  
  return null;
}

// ============================================================
// Test Mode Payload Generation (DST-safe with deterministic night_date)
// ============================================================

/**
 * Derive test night_date deterministically from user's timezone.
 * 
 * In test_mode, we generate night_date directly (not derived from timestamps)
 * to avoid any DST/UTC drift causing split-night flags.
 * 
 * Uses "yesterday" in the user's local timezone as the test night.
 */
function deriveTestNightDate(userTimezone?: string): string {
  const now = new Date();
  
  if (userTimezone) {
    try {
      // Get "now" in user's timezone, then subtract 1 day for "yesterday"
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      
      // Format current date in user's timezone
      const localToday = formatter.format(now);
      
      // Parse and subtract 1 day
      const [year, month, day] = localToday.split('-').map(Number);
      const yesterday = new Date(year, month - 1, day);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Format back to YYYY-MM-DD
      return yesterday.toISOString().split('T')[0];
    } catch {
      // Fall through to UTC fallback
    }
  }
  
  // UTC fallback: yesterday in UTC
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Generate a DST-safe test payload using UTC timestamps.
 * 
 * Key guarantee: night_date is derived FIRST (deterministic for user's TZ),
 * then timestamps are generated to be consistent. The night_date will be
 * used directly during insertion, NOT re-derived from timestamps.
 * 
 * This prevents split-night flags from timezone/UTC drift in test mode.
 */
function generateTestPayload(userId: string, source: SleepSource, userTimezone?: string): { input: RawSleepInput; testNightDate: string } {
  // Step 1: Derive night_date FIRST (deterministic)
  const testNightDate = deriveTestNightDate(userTimezone);
  
  // Step 2: Generate UTC timestamps that span the night
  // Use testNightDate as the base, sleep 23:00 -> 06:00 next day
  const startTime = `${testNightDate}T23:00:00Z`;
  
  // Calculate next day for end time
  const [year, month, day] = testNightDate.split('-').map(Number);
  const nextDay = new Date(year, month - 1, day);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  const endTime = `${nextDayStr}T06:00:00Z`;
  
  // Generate minimal stages: 3.5h light + 3.5h deep (7h total)
  const lightStart = `${testNightDate}T23:00:00Z`;
  const lightEnd = `${nextDayStr}T02:30:00Z`;
  const deepStart = `${nextDayStr}T02:30:00Z`;
  const deepEnd = `${nextDayStr}T06:00:00Z`;
  
  // Deterministic dedupe key using night_date (not colliding with real vendor data)
  const dedupeKey = `test:${userId}:${source}:${testNightDate}`;
  
  return {
    input: {
      source,
      start_time: startTime,
      end_time: endTime,
      stages: [
        { stage: 'light', start_time: lightStart, end_time: lightEnd, confidence: 0.9 },
        { stage: 'deep', start_time: deepStart, end_time: deepEnd, confidence: 0.9 },
      ],
      dedupe_key: dedupeKey,
      test_mode: true,
    },
    testNightDate,
  };
}

// ============================================================
// Authentication
// ============================================================

interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  mode: 'jwt' | 'hmac' | 'none';
  error?: string;
}

async function authenticateRequest(req: Request, supabaseAdmin: SupabaseClient): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization');
  const xSource = req.headers.get('x-source');
  const xSignature = req.headers.get('x-signature');
  
  // Mode 1: JWT Authentication
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return { authenticated: false, mode: 'jwt', error: 'Invalid JWT token' };
    }
    
    return {
      authenticated: true,
      userId: user.id,
      email: user.email,
      mode: 'jwt',
    };
  }
  
  // Mode 2: HMAC Signature (server-to-server)
  if (xSource && xSignature) {
    log('warn', 'HMAC authentication attempted but not yet implemented', { source: xSource });
    return { 
      authenticated: false, 
      mode: 'hmac', 
      error: 'HMAC authentication not yet implemented. TODO: Garmin webhook verification.' 
    };
  }
  
  return { authenticated: false, mode: 'none', error: 'No authentication provided' };
}

// ============================================================
// Rate Limiting
// ============================================================

async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  userId: string,
  source: string
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);
  
  const { data, error } = await supabaseAdmin
    .from('sleep_intake_rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('source', source)
    .gte('window_start', windowStart.toISOString())
    .single();
  
  const currentCount = (data as { request_count: number } | null)?.request_count || 0;
  
  if (currentCount >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  
  if (data) {
    await supabaseAdmin
      .from('sleep_intake_rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('user_id', userId)
      .eq('source', source)
      .gte('window_start', windowStart.toISOString());
  } else {
    await supabaseAdmin
      .from('sleep_intake_rate_limits')
      .insert({
        user_id: userId,
        source,
        request_count: 1,
        window_start: windowStart.toISOString(),
      });
  }
  
  return { allowed: true, remaining: RATE_LIMIT_MAX - currentCount - 1 };
}

// ============================================================
// Main Handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const allowTestSync = Deno.env.get('ALLOW_TEST_SYNC') === 'true';
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // 1. Authenticate
    const authResult = await authenticateRequest(req, supabaseAdmin);
    
    if (!authResult.authenticated) {
      log('warn', 'Authentication failed', { mode: authResult.mode, error: authResult.error });
      return new Response(
        JSON.stringify({ status: 'error', message: authResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = authResult.userId!;
    
    // 2. Parse body
    let rawInput: RawSleepInput;
    try {
      rawInput = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Check test_mode permission
    if (rawInput.test_mode && !allowTestSync) {
      log('warn', 'Test mode attempted but disabled', { userId });
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          code: 'TEST_MODE_DISABLED',
          message: 'Test mode is not enabled.' 
        } as IntakeResponse),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 4. Validate input (source must be valid for both real and test mode)
    const validationError = validateInput(rawInput);
    if (validationError) {
      log('warn', 'Validation failed', { error: validationError, source: rawInput.source });
      return new Response(
        JSON.stringify({ status: 'error', message: validationError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 5. CONSENT CHECK: Verify source row exists and status is valid
    // This happens AFTER auth + validation, BEFORE any DB writes
    const { data: sourceRow, error: sourceError } = await supabaseAdmin
      .from('sleep_sources')
      .select('id, status, user_timezone, connected_at')
      .eq('user_id', userId)
      .eq('source', rawInput.source)
      .single();
    
    if (sourceError || !sourceRow) {
      log('warn', 'Source not found', { userId, source: rawInput.source });
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          code: 'SOURCE_NOT_FOUND',
          message: 'No connected source found. Please connect this source first.' 
        } as IntakeResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const typedSourceRow = sourceRow as SourceRow;
    
    // 5b. Check if source is revoked - never auto-reactivate
    if (typedSourceRow.status === 'revoked') {
      log('warn', 'Revoked source attempted intake', { userId, source: rawInput.source });
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          code: 'SOURCE_REVOKED',
          message: 'This source was disconnected. Please reconnect to resume syncing.' 
        } as IntakeResponse),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // At this point, status is either 'pending' or 'connected' - both are allowed
    const userTimezone = typedSourceRow.user_timezone || undefined;
    const isTestMode = rawInput.test_mode === true;
    
    // 6. Generate or use provided payload
    let input: RawSleepInput;
    let testNightDate: string | undefined;
    
    if (isTestMode) {
      const testPayload = generateTestPayload(userId, rawInput.source, userTimezone);
      input = testPayload.input;
      testNightDate = testPayload.testNightDate;
      log('info', 'Test mode: generated DST-safe payload with deterministic night_date', { 
        userId, 
        source: input.source, 
        dedupeKey: input.dedupe_key,
        testNightDate,
        userTimezone: userTimezone || 'UTC',
      });
    } else {
      input = rawInput;
    }
    
    // 7. Rate limit
    const rateLimit = await checkRateLimit(supabaseAdmin, userId, input.source);
    if (!rateLimit.allowed) {
      log('warn', 'Rate limit exceeded', { userId, source: input.source });
      return new Response(
        JSON.stringify({ status: 'error', message: 'Rate limit exceeded. Max 100 requests per hour.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '3600',
          } 
        }
      );
    }
    
    // 8. Dedupe key
    const dedupeKey = input.dedupe_key || computeDedupeKey(input, userId);
    
    // 9. Check duplicate
    const { data: existingRawEvent } = await supabaseAdmin
      .from('sleep_raw_events')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .single();
    
    if (existingRawEvent) {
      log('info', 'Duplicate intake ignored', { dedupeKey, existingId: (existingRawEvent as { id: string }).id, testMode: isTestMode });
      return new Response(
        JSON.stringify({ 
          status: 'duplicate', 
          existing_raw_event_id: (existingRawEvent as { id: string }).id,
          message: 'This sleep data has already been processed',
          test_mode: isTestMode || undefined,
        } as IntakeResponse),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          } 
        }
      );
    }
    
    // 10. Insert raw event (with is_test flag, no raw_payload in test mode)
    const { data: rawEvent, error: rawInsertError } = await supabaseAdmin
      .from('sleep_raw_events')
      .insert({
        user_id: userId,
        source: input.source,
        dedupe_key: dedupeKey,
        external_night_id: input.external_night_id || null,
        start_time: input.start_time,
        end_time: input.end_time,
        stages: input.stages || null,
        raw_payload: isTestMode ? null : (input.raw_payload || null), // Never store raw_payload in test mode
        is_test: isTestMode, // Mark test data
      })
      .select('id')
      .single();
    
    if (rawInsertError) {
      log('error', 'Failed to insert raw event', { error: rawInsertError.message, dedupeKey });
      throw new Error(`Failed to store raw event: ${rawInsertError.message}`);
    }
    
    const rawEventId = (rawEvent as { id: string }).id;
    log('info', 'Raw event stored', { rawEventId, source: input.source, isTest: isTestMode });
    
    // 11. Normalize
    const metrics = normalizeToNightlyMetrics(input);
    
    // In test_mode, use the pre-computed testNightDate directly (DST-safe)
    // In real mode, derive from timestamps respecting user's timezone
    const nightDate = isTestMode && testNightDate ? testNightDate : deriveNightDate(input.start_time, userTimezone);
    
    // 12. Check for existing night (split-night detection)
    const { data: existingNights } = await supabaseAdmin
      .from('sleep_nights')
      .select('id')
      .eq('user_id', userId)
      .eq('source', input.source)
      .eq('night_date', nightDate);
    
    const isSplitNight = existingNights && existingNights.length > 0;
    
    // If split night detected, mark existing records
    if (isSplitNight) {
      log('info', 'Split night detected', { nightDate, existingCount: existingNights.length });
      await supabaseAdmin
        .from('sleep_nights')
        .update({ is_split_segment: true })
        .eq('user_id', userId)
        .eq('source', input.source)
        .eq('night_date', nightDate);
    }
    
    // Insert new sleep_night (with is_test flag)
    const { data: sleepNight, error: nightInsertError } = await supabaseAdmin
      .from('sleep_nights')
      .insert({
        user_id: userId,
        source: input.source,
        night_date: nightDate,
        start_time: input.start_time,
        end_time: input.end_time,
        total_sleep_minutes: metrics.total_sleep_minutes,
        sleep_efficiency: metrics.sleep_efficiency,
        wake_events: metrics.wake_events,
        is_split_segment: isSplitNight,
        normalization_version: NORMALIZATION_VERSION,
        raw_event_id: rawEventId,
        is_test: isTestMode, // Mark test data
      })
      .select('id')
      .single();
    
    if (nightInsertError) {
      log('error', 'Failed to insert sleep night', { error: nightInsertError.message, rawEventId });
      throw new Error(`Failed to store normalized night: ${nightInsertError.message}`);
    }
    
    const sleepNightId = (sleepNight as { id: string }).id;
    log('info', 'Sleep night normalized', { sleepNightId, nightDate, totalSleepMinutes: metrics.total_sleep_minutes, isSplitNight, isTest: isTestMode });
    
    // 13. Update sleep_sources: pending→connected on first sync, always update last_sync_at
    const now = new Date().toISOString();
    
    if (typedSourceRow.status === 'pending') {
      // First successful sync: activate and set connected_at
      // COALESCE: defensive guard - only set connected_at if not already set
      const newConnectedAt = typedSourceRow.connected_at || now;
      
      await supabaseAdmin
        .from('sleep_sources')
        .update({ 
          last_sync_at: now,
          status: 'connected',
          connected_at: newConnectedAt, // COALESCE(connected_at, NOW())
        })
        .eq('id', typedSourceRow.id);
      
      log('info', 'Source activated on first sync', { userId, source: input.source, isTest: isTestMode });
    } else {
      // Already connected: just update last_sync_at (preserve original connected_at)
      await supabaseAdmin
        .from('sleep_sources')
        .update({ 
          last_sync_at: now,
        })
        .eq('id', typedSourceRow.id);
    }
    
    // 14. Link to Sleep Coach — SKIP ENTIRELY IN TEST MODE (no analytics pollution)
    // Test mode validates normalization pipeline but avoids creating dirty sleep_logs
    const userEmail = authResult.email || input.email;
    
    if (!isTestMode && userEmail) {
      // Real mode: create sleep_log for Sleep Coach
      const logSource = mapSourceToLogSource(input.source);
      
      const { error: logInsertError } = await supabaseAdmin
        .from('sleep_logs')
        .insert({
          email: userEmail,
          date: nightDate,
          sleep_quality: metrics.sleep_efficiency ? Math.round(metrics.sleep_efficiency / 10) : 5,
          pain_level_morning: 0,
          time_to_sleep_minutes: null,
          wake_ups_per_night: metrics.wake_events,
          felt_hot: false,
          felt_stressed: false,
          source: logSource,
          notes: `Auto-imported from ${input.source}`,
          sleep_night_id: sleepNightId,
        });
      
      if (logInsertError) {
        log('warn', 'Failed to create sleep_log linkage', { error: logInsertError.message, sleepNightId });
      } else {
        log('info', 'Sleep Coach linkage created', { sleepNightId, email: userEmail, logSource });
      }
    } else if (isTestMode) {
      log('info', 'Test mode: skipped sleep_logs insert (no analytics pollution)', { sleepNightId });
    }
    
    // 15. Emit event
    log('info', 'sleep_data_received event emitted', { userId, source: input.source, sleepNightId, nightDate, isTest: isTestMode });
    
    const duration = Date.now() - startTime;
    log('info', 'Intake completed successfully', { duration, sleepNightId, isTest: isTestMode });
    
    return new Response(
      JSON.stringify({
        status: 'success',
        sleep_night_id: sleepNightId,
        message: isTestMode ? 'Test sync complete' : 'Sleep data processed and linked to Sleep Coach',
        test_mode: isTestMode || undefined,
      } as IntakeResponse),
      { 
        status: 201, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        } 
      }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', 'Intake failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
    
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

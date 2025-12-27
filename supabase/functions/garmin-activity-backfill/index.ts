import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Activity Backfill - Request historical activity data
// POST /garmin-activity-backfill
// 
// Requests historical activity data from Garmin for a user.
// Max 30 days of history per Garmin API specification.
// 
// API: POST https://apis.garmin.com/wellness-api/rest/backfill/activitySummary
// Response: 202 = accepted, 409 = duplicate request, 412 = missing permissions
//
// Rate Limits:
// - Partner-wide: 100 requests/minute (tracked in DB)
// - Per-user: serialized, one backfill at a time
// - 429 handling: exponential backoff with jitter
//
// Requires: JWT authentication (user must be logged in)
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const GARMIN_BACKFILL_API = 'https://apis.garmin.com/wellness-api/rest/backfill';
const MAX_BACKFILL_DAYS = 30;

// Rate limit config: 100 req/min, but we use 80 to be safe
const RATE_LIMIT_REQUESTS = 80;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

interface SourceRow {
  id: string;
  user_id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  domains: string[];
  backfill_status: string | null;
  backfill_requested_at: string | null;
}

interface BackfillResult {
  success: boolean;
  status: number;
  body?: string;
  error?: string;
  retryAfter?: number;
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  delete safeData.access_token;
  delete safeData.token_secret;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-activity-backfill',
    message,
    ...safeData,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// Create OAuth 1.0a signature for Garmin API
async function createOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): Promise<string> {
  const sortedParams = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Partner-wide rate limit check using DB
async function checkAndIncrementRateLimit(supabase: SupabaseClient): Promise<{ allowed: boolean; waitMs?: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  
  // Count requests in current window
  const { count, error } = await supabase
    .from('garmin_events_raw')
    .select('*', { count: 'exact', head: true })
    .eq('domain', 'backfill_rate_limit')
    .gte('received_at', windowStart);
  
  if (error) {
    log('warn', 'Rate limit check failed, proceeding cautiously', { error: error.message });
    return { allowed: true };
  }
  
  if ((count || 0) >= RATE_LIMIT_REQUESTS) {
    const waitMs = RATE_LIMIT_WINDOW_MS - (Date.now() - new Date(windowStart).getTime());
    log('info', 'Rate limit reached', { count, limit: RATE_LIMIT_REQUESTS, waitMs });
    return { allowed: false, waitMs: Math.max(waitMs, 5000) };
  }
  
  return { allowed: true };
}

// Record a rate limit event
async function recordRateLimitEvent(supabase: SupabaseClient, userId: string) {
  await supabase.from('garmin_events_raw').insert({
    garmin_user_id: userId,
    domain: 'backfill_rate_limit',
    summary_type: 'rate_limit_marker',
    payload: { marker: true },
    payload_hash: crypto.randomUUID(),
  }).catch(() => {
    // Ignore errors - rate limiting is best effort
  });
}

// Sleep with jitter
function sleepWithJitter(baseMs: number, jitterMs: number = 1000): Promise<void> {
  const jitter = Math.random() * jitterMs;
  return new Promise(resolve => setTimeout(resolve, baseMs + jitter));
}

// OAuth 2.0 Bearer token backfill request with retry logic
async function requestBackfillOAuth2(
  endpoint: string,
  accessToken: string,
  summaryStartTimeInSeconds: number,
  summaryEndTimeInSeconds: number,
  maxRetries: number = 2
): Promise<BackfillResult> {
  const url = `${GARMIN_BACKFILL_API}/${endpoint}`;
  const queryString = `summaryStartTimeInSeconds=${summaryStartTimeInSeconds}&summaryEndTimeInSeconds=${summaryEndTimeInSeconds}`;
  const fullUrl = `${url}?${queryString}`;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    log('info', 'OAuth 2.0 backfill request', { 
      endpoint,
      attempt,
      maxRetries,
    });
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      const body = await response.text();
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;
      
      log('info', 'OAuth 2.0 backfill response', { 
        endpoint,
        status: response.status,
        statusText: response.statusText,
        body: body.substring(0, 300),
        retryAfter,
        attempt,
      });
      
      // Success
      if (response.status === 202) {
        return { success: true, status: 202, body };
      }
      
      // Duplicate - auth works, window already requested
      if (response.status === 409) {
        return { success: true, status: 409, body, error: 'DUPLICATE_REQUEST' };
      }
      
      // Missing permissions - auth works, need user to grant
      if (response.status === 412) {
        return { success: false, status: 412, body, error: 'MISSING_PERMISSION' };
      }
      
      // Auth errors - don't retry
      if (response.status === 401 || response.status === 403) {
        return { success: false, status: response.status, body, error: `AUTH_ERROR_${response.status}` };
      }
      
      // Rate limit - retry with backoff
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const backoffMs = retryAfter || (60000 * Math.pow(2, attempt));
          log('info', 'Rate limited, backing off', { endpoint, backoffMs, attempt });
          await sleepWithJitter(backoffMs, 5000);
          continue;
        }
        return { success: false, status: 429, body, error: 'RATE_LIMITED', retryAfter };
      }
      
      // Other errors
      return { success: false, status: response.status, body, error: body || `HTTP_${response.status}` };
      
    } catch (error) {
      log('error', 'OAuth 2.0 backfill request failed', { endpoint, error: String(error), attempt });
      if (attempt < maxRetries) {
        await sleepWithJitter(5000, 2000);
        continue;
      }
      return { success: false, status: 0, error: String(error) };
    }
  }
  
  return { success: false, status: 0, error: 'MAX_RETRIES_EXCEEDED' };
}

// OAuth 1.0a signed backfill request with retry logic
async function requestBackfillOAuth1(
  endpoint: string,
  accessToken: string,
  tokenSecret: string,
  consumerKey: string,
  consumerSecret: string,
  summaryStartTimeInSeconds: number,
  summaryEndTimeInSeconds: number,
  maxRetries: number = 2
): Promise<BackfillResult> {
  const url = `${GARMIN_BACKFILL_API}/${endpoint}`;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // OAuth 1.0a parameters - must regenerate each attempt (new timestamp/nonce)
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_token: accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
      oauth_version: '1.0',
    };
    
    const requestParams: Record<string, string> = {
      summaryStartTimeInSeconds: summaryStartTimeInSeconds.toString(),
      summaryEndTimeInSeconds: summaryEndTimeInSeconds.toString(),
    };
    
    const allParams = { ...oauthParams, ...requestParams };
    const signature = await createOAuthSignature('POST', url, allParams, consumerSecret, tokenSecret);
    oauthParams.oauth_signature = signature;
    
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ');
    
    const queryString = Object.keys(requestParams)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(requestParams[k])}`)
      .join('&');
    
    log('info', 'OAuth 1.0a backfill request', { endpoint, attempt });
    
    try {
      const response = await fetch(`${url}?${queryString}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      const body = await response.text();
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;
      
      log('info', 'OAuth 1.0a backfill response', { 
        endpoint,
        status: response.status,
        body: body.substring(0, 300),
        attempt,
      });
      
      if (response.status === 202) {
        return { success: true, status: 202, body };
      }
      
      if (response.status === 409) {
        return { success: true, status: 409, body, error: 'DUPLICATE_REQUEST' };
      }
      
      if (response.status === 412) {
        return { success: false, status: 412, body, error: 'MISSING_PERMISSION' };
      }
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, status: response.status, body, error: `AUTH_ERROR_${response.status}` };
      }
      
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const backoffMs = retryAfter || (60000 * Math.pow(2, attempt));
          log('info', 'Rate limited, backing off', { endpoint, backoffMs, attempt });
          await sleepWithJitter(backoffMs, 5000);
          continue;
        }
        return { success: false, status: 429, body, error: 'RATE_LIMITED', retryAfter };
      }
      
      return { success: false, status: response.status, body, error: body || `HTTP_${response.status}` };
      
    } catch (error) {
      log('error', 'OAuth 1.0a backfill request failed', { endpoint, error: String(error), attempt });
      if (attempt < maxRetries) {
        await sleepWithJitter(5000, 2000);
        continue;
      }
      return { success: false, status: 0, error: String(error) };
    }
  }
  
  return { success: false, status: 0, error: 'MAX_RETRIES_EXCEEDED' };
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
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const garminClientId = Deno.env.get('GARMIN_CLIENT_ID');
    const garminClientSecret = Deno.env.get('GARMIN_CLIENT_SECRET');
    const debugSecret = Deno.env.get('DEBUG_SECRET');
    
    if (!garminClientId || !garminClientSecret) {
      log('error', 'Garmin credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Parse request body
    let body: { 
      days?: number; 
      endpoints?: string[]; 
      user_id?: string; 
      debug_secret?: string;
      single_endpoint?: string; // For testing single endpoint
    } = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Use defaults
    }
    
    let userId: string;
    
    // Admin bypass
    if (body.user_id && body.debug_secret && debugSecret && body.debug_secret === debugSecret) {
      userId = body.user_id;
      log('info', 'Admin bypass activated', { targetUserId: userId });
    } else {
      // Normal path: verify JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ code: 401, message: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
    }
    
    const days = Math.min(body.days || 14, MAX_BACKFILL_DAYS);
    // Support single endpoint for testing
    const endpoints = body.single_endpoint 
      ? [body.single_endpoint]
      : (body.endpoints || ['activitySummary']);
    
    // Get user's Garmin source
    const { data: source, error: sourceError } = await supabaseAdmin
      .from('sleep_sources')
      .select('id, user_id, status, metadata, domains, backfill_status, backfill_requested_at')
      .eq('user_id', userId)
      .eq('source', 'garmin')
      .single();
    
    if (sourceError || !source) {
      return new Response(
        JSON.stringify({ error: 'Garmin not connected' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const sourceRow = source as SourceRow;
    
    if (sourceRow.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'Garmin connection revoked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!sourceRow.domains?.includes('activity')) {
      return new Response(
        JSON.stringify({ error: 'Activity sync not enabled', domains: sourceRow.domains }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check partner-wide rate limit
    const rateLimitCheck = await checkAndIncrementRateLimit(supabaseAdmin);
    if (!rateLimitCheck.allowed) {
      log('warn', 'Partner rate limit exceeded', { waitMs: rateLimitCheck.waitMs });
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          retry_after_ms: rateLimitCheck.waitMs,
          message: 'Too many requests to Garmin API. Please try again in a minute.'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get OAuth tokens
    const metadata = sourceRow.metadata as Record<string, unknown>;
    const oauthVersion = metadata?.oauth_version as string;
    const accessToken = metadata?.access_token as string;
    const tokenSecret = metadata?.token_secret as string;
    
    if (!accessToken) {
      log('error', 'Missing access token', { userId });
      return new Response(
        JSON.stringify({ error: 'Invalid Garmin connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const useOAuth2 = oauthVersion === '2.0' || !tokenSecret;
    
    log('info', 'OAuth version detected', { 
      userId, 
      oauthVersion, 
      useOAuth2,
      hasTokenSecret: !!tokenSecret,
    });
    
    // Calculate time range
    const now = Math.floor(Date.now() / 1000);
    const summaryEndTimeInSeconds = now;
    const summaryStartTimeInSeconds = now - (days * 24 * 60 * 60);
    
    log('info', 'Starting activity backfill', { 
      userId, 
      days, 
      endpoints,
      authMethod: useOAuth2 ? 'OAuth2_Bearer' : 'OAuth1_Signed',
      startTime: new Date(summaryStartTimeInSeconds * 1000).toISOString(),
      endTime: new Date(summaryEndTimeInSeconds * 1000).toISOString(),
    });
    
    // Request backfill for each endpoint (serialized to respect rate limits)
    const results: Record<string, BackfillResult> = {};
    
    for (const endpoint of endpoints) {
      // Record rate limit marker before each request
      await recordRateLimitEvent(supabaseAdmin, userId);
      
      let result: BackfillResult;
      
      if (useOAuth2) {
        result = await requestBackfillOAuth2(
          endpoint,
          accessToken,
          summaryStartTimeInSeconds,
          summaryEndTimeInSeconds,
          2 // max retries
        );
      } else {
        result = await requestBackfillOAuth1(
          endpoint,
          accessToken,
          tokenSecret,
          garminClientId,
          garminClientSecret,
          summaryStartTimeInSeconds,
          summaryEndTimeInSeconds,
          2 // max retries
        );
      }
      
      results[endpoint] = result;
      
      log('info', `Backfill request for ${endpoint}`, { 
        userId, 
        success: result.success, 
        status: result.status,
        error: result.error,
      });
      
      // If we hit rate limit even after retries, stop
      if (result.status === 429) {
        log('warn', 'Rate limit hit, stopping backfill', { endpoint });
        break;
      }
      
      // Small delay between endpoints
      if (endpoints.length > 1) {
        await sleepWithJitter(1000, 500);
      }
    }
    
    // Determine overall success
    const allSucceeded = Object.values(results).every(r => r.success || r.status === 409);
    const anySucceeded = Object.values(results).some(r => r.success);
    const anyRateLimited = Object.values(results).some(r => r.status === 429);
    
    // Update source with backfill status
    const newStatus = anyRateLimited 
      ? 'activity_rate_limited' 
      : (anySucceeded ? 'activity_requested' : 'activity_failed');
    
    await supabaseAdmin
      .from('sleep_sources')
      .update({
        backfill_requested_at: new Date().toISOString(),
        backfill_status: newStatus,
        backfill_days: days,
        metadata: {
          ...metadata,
          activity_backfill_endpoints: endpoints,
          activity_backfill_start: summaryStartTimeInSeconds,
          activity_backfill_end: summaryEndTimeInSeconds,
          activity_backfill_results: results,
        },
      })
      .eq('id', sourceRow.id);
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const duplicateCount = Object.values(results).filter(r => r.status === 409).length;
    
    log('info', 'Activity backfill request complete', { 
      userId,
      successCount,
      duplicateCount,
      allSucceeded,
      anyRateLimited,
    });
    
    return new Response(
      JSON.stringify({ 
        success: allSucceeded,
        rate_limited: anyRateLimited,
        results,
        days,
        endpoints,
        startTime: new Date(summaryStartTimeInSeconds * 1000).toISOString(),
        endTime: new Date(summaryEndTimeInSeconds * 1000).toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    log('error', 'Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

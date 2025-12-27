import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Activity Backfill - Request historical activity data
// POST /garmin-activity-backfill
// 
// Requests historical activity data from Garmin for a user.
// Max 30 days of history per Garmin API specification.
// 
// API: POST https://apis.garmin.com/wellness-api/rest/backfill/activitySummary
// Response: 202 = accepted, 409 = duplicate request
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

interface SourceRow {
  id: string;
  user_id: string;
  status: string;
  metadata: Record<string, unknown> | null;
  domains: string[];
  backfill_status: string | null;
  backfill_requested_at: string | null;
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
  // Sort parameters
  const sortedParams = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  
  // Create signature base string
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Sign with HMAC-SHA1
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

// OAuth 2.0 Bearer token backfill request
async function requestBackfillOAuth2(
  endpoint: string,
  accessToken: string,
  summaryStartTimeInSeconds: number,
  summaryEndTimeInSeconds: number
): Promise<{ success: boolean; status: number; body?: string; error?: string }> {
  const url = `${GARMIN_BACKFILL_API}/${endpoint}`;
  
  // Build query string
  const queryString = `summaryStartTimeInSeconds=${summaryStartTimeInSeconds}&summaryEndTimeInSeconds=${summaryEndTimeInSeconds}`;
  const fullUrl = `${url}?${queryString}`;
  
  log('info', 'OAuth 2.0 backfill request', { 
    url: fullUrl.replace(accessToken, '[REDACTED]'),
    endpoint,
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
    
    log('info', 'OAuth 2.0 backfill response', { 
      endpoint,
      status: response.status,
      statusText: response.statusText,
      body: body.substring(0, 500), // Truncate for logging
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    if (response.status === 202) {
      return { success: true, status: 202, body };
    }
    
    return { success: false, status: response.status, body, error: body || `HTTP_${response.status}` };
    
  } catch (error) {
    log('error', 'OAuth 2.0 backfill request failed', { endpoint, error: String(error) });
    return { success: false, status: 0, error: String(error) };
  }
}

// OAuth 1.0a signed backfill request
async function requestBackfillOAuth1(
  endpoint: string,
  accessToken: string,
  tokenSecret: string,
  consumerKey: string,
  consumerSecret: string,
  summaryStartTimeInSeconds: number,
  summaryEndTimeInSeconds: number
): Promise<{ success: boolean; status: number; body?: string; error?: string }> {
  const url = `${GARMIN_BACKFILL_API}/${endpoint}`;
  
  // OAuth 1.0a parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_version: '1.0',
  };
  
  // Request parameters
  const requestParams: Record<string, string> = {
    summaryStartTimeInSeconds: summaryStartTimeInSeconds.toString(),
    summaryEndTimeInSeconds: summaryEndTimeInSeconds.toString(),
  };
  
  // Combine all params for signature
  const allParams = { ...oauthParams, ...requestParams };
  
  // Create signature
  const signature = await createOAuthSignature(
    'POST',
    url,
    allParams,
    consumerSecret,
    tokenSecret
  );
  
  oauthParams.oauth_signature = signature;
  
  // Build Authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');
  
  // Build query string
  const queryString = Object.keys(requestParams)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(requestParams[k])}`)
    .join('&');
  
  try {
    const response = await fetch(`${url}?${queryString}`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const body = await response.text();
    
    log('info', 'OAuth 1.0a backfill response', { 
      endpoint,
      status: response.status,
      body: body.substring(0, 500),
    });
    
    if (response.status === 202) {
      return { success: true, status: 202, body };
    }
    
    if (response.status === 409) {
      return { success: false, status: 409, body, error: 'DUPLICATE_REQUEST' };
    }
    
    return { success: false, status: response.status, body, error: body || `HTTP_${response.status}` };
    
  } catch (error) {
    log('error', 'OAuth 1.0a backfill request failed', { endpoint, error: String(error) });
    return { success: false, status: 0, error: String(error) };
  }
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
    
    // Parse request body first to check for admin bypass
    let body: { days?: number; endpoints?: string[]; user_id?: string; debug_secret?: string } = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Use defaults
    }
    
    let userId: string;
    
    // Admin bypass: allow triggering for specific user with debug secret
    if (body.user_id && body.debug_secret && debugSecret && body.debug_secret === debugSecret) {
      userId = body.user_id;
      log('info', 'Admin bypass activated', { targetUserId: userId });
    } else {
      // Normal path: verify JWT and get user
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
    const endpoints = body.endpoints || ['activitySummary', 'activityDetails', 'moveIQActivities'];
    
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
    
    // Check if activity domain is enabled
    if (!sourceRow.domains?.includes('activity')) {
      return new Response(
        JSON.stringify({ error: 'Activity sync not enabled', domains: sourceRow.domains }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get OAuth tokens from metadata
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
    
    // Determine which auth method to use
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
    
    // Request backfill for each endpoint
    const results: Record<string, { success: boolean; status: number; body?: string; error?: string }> = {};
    
    for (const endpoint of endpoints) {
      let result: { success: boolean; status: number; body?: string; error?: string };
      
      if (useOAuth2) {
        // Try OAuth 2.0 Bearer token
        result = await requestBackfillOAuth2(
          endpoint,
          accessToken,
          summaryStartTimeInSeconds,
          summaryEndTimeInSeconds
        );
      } else {
        // Use OAuth 1.0a signed request
        result = await requestBackfillOAuth1(
          endpoint,
          accessToken,
          tokenSecret,
          garminClientId,
          garminClientSecret,
          summaryStartTimeInSeconds,
          summaryEndTimeInSeconds
        );
      }
      
      results[endpoint] = result;
      
      log('info', `Backfill request for ${endpoint}`, { 
        userId, 
        success: result.success, 
        status: result.status,
        body: result.body?.substring(0, 200),
      });
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Update source with backfill request tracking
    const allSucceeded = Object.values(results).every(r => r.success || r.status === 409);
    const anySucceeded = Object.values(results).some(r => r.success);
    
    if (anySucceeded) {
      await supabaseAdmin
        .from('sleep_sources')
        .update({
          backfill_requested_at: new Date().toISOString(),
          backfill_status: 'activity_requested',
          backfill_days: days,
          metadata: {
            ...metadata,
            activity_backfill_endpoints: endpoints,
            activity_backfill_start: summaryStartTimeInSeconds,
            activity_backfill_end: summaryEndTimeInSeconds,
          },
        })
        .eq('id', sourceRow.id);
    }
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const duplicateCount = Object.values(results).filter(r => r.status === 409).length;
    
    log('info', 'Activity backfill request complete', { 
      userId,
      successCount,
      duplicateCount,
      allSucceeded,
    });
    
    return new Response(
      JSON.stringify({ 
        success: allSucceeded,
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

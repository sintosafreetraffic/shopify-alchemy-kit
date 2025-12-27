import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Backfill Worker - Process queued backfill jobs
// POST /garmin-backfill-worker
// 
// Scheduled worker that processes due backfill jobs from the queue.
// Implements exponential backoff for retries and rate limit handling.
//
// Backoff schedule: 10s, 30s, 90s, 5m, 15m, then fail
// Rate limit: respects Retry-After header or defaults to 60s
//
// Requires: CRON_SECRET for authentication
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// Backfill API - uses Wellness API for all OAuth versions
// Note: Even OAuth 2.0 tokens use the Wellness API for backfill endpoints
const GARMIN_BACKFILL_API = 'https://apis.garmin.com/wellness-api/rest/backfill';

const MAX_JOBS_PER_RUN = 10;
const MAX_ATTEMPTS = 6;
const BACKOFF_SCHEDULE_SECONDS = [10, 30, 90, 300, 900]; // 10s, 30s, 90s, 5m, 15m

// Endpoint mapping - consistent naming for backfill endpoints
// Both OAuth 1.0a and 2.0 use the same Wellness API endpoints
const ENDPOINT_MAP: Record<string, string> = {
  'activitySummary': 'activities',
  'activityDetails': 'activityDetails', 
  'activityFile': 'manuallyUploadedActivities',
  'moveIQActivities': 'moveIQActivities',
  'sleeps': 'sleeps',
  'sleep': 'sleeps',
};

function getEndpoint(summaryType: string): string {
  return ENDPOINT_MAP[summaryType] || summaryType;
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  delete safeData.access_token;
  delete safeData.token_secret;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-backfill-worker',
    message,
    ...safeData,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// Determine response kind for logging
function getResponseKind(body: string): 'json' | 'html' | 'empty' {
  if (!body || body.trim() === '') return 'empty';
  if (body.trim().startsWith('{') || body.trim().startsWith('[')) return 'json';
  if (body.includes('<!DOCTYPE') || body.includes('<html')) return 'html';
  return 'json'; // Default to json for other text
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

interface BackfillJob {
  id: string;
  user_id: string;
  summary_type: string;
  start_seconds: number;
  end_seconds: number;
  status: string;
  attempt_count: number;
}

interface ProcessResult {
  success: boolean;
  newStatus: string;
  httpStatus?: number;
  errorMessage?: string;
  responseKind?: 'json' | 'html' | 'empty';
  retryAfterSeconds?: number;
}

// Process a single job
async function processJob(
  supabase: SupabaseClient,
  job: BackfillJob,
  garminClientId: string,
  garminClientSecret: string
): Promise<ProcessResult> {
  // Get user's Garmin credentials
  const { data: source, error: sourceError } = await supabase
    .from('sleep_sources')
    .select('id, status, metadata')
    .eq('user_id', job.user_id)
    .eq('source', 'garmin')
    .single();
  
  if (sourceError || !source) {
    return {
      success: false,
      newStatus: 'failed',
      errorMessage: 'Garmin connection not found',
    };
  }
  
  if (source.status === 'revoked') {
    return {
      success: false,
      newStatus: 'failed',
      errorMessage: 'Garmin connection revoked',
    };
  }
  
  const metadata = source.metadata as Record<string, unknown>;
  const oauthVersion = metadata?.oauth_version as string;
  const accessToken = metadata?.access_token as string;
  const tokenSecret = metadata?.token_secret as string;
  
  if (!accessToken) {
    return {
      success: false,
      newStatus: 'failed',
      errorMessage: 'Missing access token',
    };
  }
  
  const useOAuth2 = oauthVersion === '2.0' || !tokenSecret;
  
  // IMPORTANT: The Wellness API backfill endpoints ONLY support OAuth 1.0a
  // OAuth 2.0 users cannot use backfill - the API returns 502 with Cloudflare error
  if (useOAuth2) {
    log('info', 'OAuth 2.0 user - backfill not supported', {
      jobId: job.id,
      userId: job.user_id,
      summaryType: job.summary_type,
    });
    return {
      success: false,
      newStatus: 'needs_permission',
      httpStatus: undefined,
      errorMessage: 'Backfill not available for OAuth 2.0 connections. Activity history will sync as new data arrives.',
    };
  }
  
  const endpoint = getEndpoint(job.summary_type);
  const url = `${GARMIN_BACKFILL_API}/${endpoint}`;
  const queryString = `summaryStartTimeInSeconds=${job.start_seconds}&summaryEndTimeInSeconds=${job.end_seconds}`;
  const fullUrl = `${url}?${queryString}`;
  
  try {
    let response: Response;
    
    // OAuth 1.0a signed request
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: garminClientId,
      oauth_token: accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
      oauth_version: '1.0',
    };
    
    const requestParams: Record<string, string> = {
      summaryStartTimeInSeconds: job.start_seconds.toString(),
      summaryEndTimeInSeconds: job.end_seconds.toString(),
    };
    
    const allParams = { ...oauthParams, ...requestParams };
    const signature = await createOAuthSignature('POST', url, allParams, garminClientSecret, tokenSecret);
    oauthParams.oauth_signature = signature;
    
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(k => `${encodeURIComponent(k)}=\"${encodeURIComponent(oauthParams[k])}\"`)
      .join(', ');
    
    response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const body = await response.text();
    const responseKind = getResponseKind(body);
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
    
    log('info', 'Garmin API response', {
      jobId: job.id,
      userId: job.user_id,
      summaryType: job.summary_type,
      status: response.status,
      responseKind,
      bodyPreview: body.substring(0, 200),
    });
    
    // Handle response codes
    if (response.status === 202) {
      return { success: true, newStatus: 'success', httpStatus: 202, responseKind };
    }
    
    if (response.status === 409) {
      // Duplicate request - consider success
      return { success: true, newStatus: 'success', httpStatus: 409, responseKind, errorMessage: 'Duplicate request' };
    }
    
    if (response.status === 412) {
      // Missing permissions
      return { success: false, newStatus: 'needs_permission', httpStatus: 412, responseKind, errorMessage: 'Missing Garmin permissions' };
    }
    
    if (response.status === 401 || response.status === 403) {
      // Auth error - mark connection as having issues
      await supabase
        .from('sleep_sources')
        .update({ 
          activity_status: 'auth_error',
          activity_error_code: `HTTP_${response.status}`,
          activity_error_message: 'Authorization failed',
        })
        .eq('user_id', job.user_id)
        .eq('source', 'garmin');
      
      return { 
        success: false, 
        newStatus: 'failed', 
        httpStatus: response.status, 
        responseKind, 
        errorMessage: `Auth error: ${response.status}` 
      };
    }
    
    if (response.status === 429) {
      // Rate limited
      return { 
        success: false, 
        newStatus: 'rate_limited', 
        httpStatus: 429, 
        responseKind, 
        errorMessage: 'Rate limited',
        retryAfterSeconds: retryAfterSeconds || 60,
      };
    }
    
    if (response.status >= 500) {
      // Server error - retry
      return { 
        success: false, 
        newStatus: 'retrying', 
        httpStatus: response.status, 
        responseKind, 
        errorMessage: `Server error: ${response.status}` 
      };
    }
    
    // Other errors
    return { 
      success: false, 
      newStatus: 'failed', 
      httpStatus: response.status, 
      responseKind, 
      errorMessage: body.substring(0, 500) 
    };
    
  } catch (error) {
    log('error', 'Request failed', { jobId: job.id, error: String(error) });
    return { 
      success: false, 
      newStatus: 'retrying', 
      errorMessage: `Request error: ${String(error).substring(0, 200)}` 
    };
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
    const cronSecret = Deno.env.get('CRON_SECRET');
    const garminClientId = Deno.env.get('GARMIN_CLIENT_ID');
    const garminClientSecret = Deno.env.get('GARMIN_CLIENT_SECRET');
    
    // Verify CRON_SECRET - check both header and body for flexibility
    const headerSecret = req.headers.get('x-cron-secret');
    let bodySecret: string | undefined;
    try {
      const text = await req.text();
      if (text) {
        const body = JSON.parse(text);
        bodySecret = body.cron_secret;
      }
    } catch {
      // Ignore parse errors
    }
    
    const providedSecret = headerSecret || bodySecret;
    if (!cronSecret || providedSecret !== cronSecret) {
      log('warn', 'Unauthorized request', { hasHeaderSecret: !!headerSecret, hasBodySecret: !!bodySecret });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
    
    // Fetch due jobs
    const now = new Date().toISOString();
    const { data: jobs, error: fetchError } = await supabaseAdmin
      .from('garmin_backfill_jobs')
      .select('*')
      .in('status', ['queued', 'rate_limited', 'retrying'])
      .lte('next_attempt_at', now)
      .order('created_at', { ascending: true })
      .limit(MAX_JOBS_PER_RUN);
    
    if (fetchError) {
      log('error', 'Failed to fetch jobs', { error: fetchError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to fetch jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!jobs || jobs.length === 0) {
      log('info', 'No due jobs found');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No due jobs' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Processing jobs', { count: jobs.length });
    
    const results: Array<{ jobId: string; status: string; httpStatus?: number }> = [];
    
    for (const job of jobs as BackfillJob[]) {
      // Mark as running
      await supabaseAdmin
        .from('garmin_backfill_jobs')
        .update({ status: 'running' })
        .eq('id', job.id);
      
      const result = await processJob(supabaseAdmin, job, garminClientId, garminClientSecret);
      const newAttemptCount = job.attempt_count + 1;
      
      // Calculate next attempt time for retrying/rate_limited
      let nextAttemptAt: string | null = null;
      let finalStatus = result.newStatus;
      
      if (result.newStatus === 'retrying') {
        if (newAttemptCount >= MAX_ATTEMPTS) {
          finalStatus = 'failed';
          log('warn', 'Job exceeded max attempts', { jobId: job.id, attempts: newAttemptCount });
        } else {
          const backoffIndex = Math.min(newAttemptCount - 1, BACKOFF_SCHEDULE_SECONDS.length - 1);
          const backoffSeconds = BACKOFF_SCHEDULE_SECONDS[backoffIndex];
          nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
        }
      } else if (result.newStatus === 'rate_limited') {
        const waitSeconds = result.retryAfterSeconds || 60;
        nextAttemptAt = new Date(Date.now() + waitSeconds * 1000).toISOString();
      }
      
      // Update job
      await supabaseAdmin
        .from('garmin_backfill_jobs')
        .update({
          status: finalStatus,
          attempt_count: newAttemptCount,
          next_attempt_at: nextAttemptAt,
          last_http_status: result.httpStatus,
          last_error_message: result.errorMessage?.substring(0, 1000),
          last_response_kind: result.responseKind,
        })
        .eq('id', job.id);
      
      results.push({
        jobId: job.id,
        status: finalStatus,
        httpStatus: result.httpStatus,
      });
      
      log('info', 'Job processed', {
        jobId: job.id,
        userId: job.user_id,
        summaryType: job.summary_type,
        status: finalStatus,
        httpStatus: result.httpStatus,
        attemptCount: newAttemptCount,
      });
      
      // Small delay between jobs to avoid hammering
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Update sleep_sources status for affected users
    const userIds = [...new Set(jobs.map((j: BackfillJob) => j.user_id))];
    for (const userId of userIds) {
      // Get aggregate status for user's jobs
      const { data: userJobs } = await supabaseAdmin
        .from('garmin_backfill_jobs')
        .select('status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (userJobs && userJobs.length > 0) {
        const hasQueued = userJobs.some((j: { status: string }) => ['queued', 'running', 'retrying', 'rate_limited'].includes(j.status));
        const hasFailed = userJobs.some((j: { status: string }) => j.status === 'failed');
        const hasNeedsPermission = userJobs.some((j: { status: string }) => j.status === 'needs_permission');
        const allSuccess = userJobs.every((j: { status: string }) => j.status === 'success');
        
        let backfillStatus = 'unknown';
        if (allSuccess) backfillStatus = 'complete';
        else if (hasQueued) backfillStatus = 'processing';
        else if (hasNeedsPermission) backfillStatus = 'needs_permission';
        else if (hasFailed) backfillStatus = 'failed';
        
        await supabaseAdmin
          .from('sleep_sources')
          .update({ backfill_status: backfillStatus })
          .eq('user_id', userId)
          .eq('source', 'garmin');
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results,
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

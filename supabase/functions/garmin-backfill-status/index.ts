import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Backfill Status - Get current backfill job status
// GET /garmin-backfill-status
// 
// Returns aggregated status of backfill jobs for the current user.
// Used by the UI to show sync status.
//
// Requires: JWT authentication
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-backfill-status',
    message,
    ...data,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// Map backend status to user-friendly labels
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'queued': 'Waiting to sync',
    'running': 'Syncing...',
    'rate_limited': 'Paused (rate limit)',
    'retrying': 'Retrying...',
    'success': 'Complete',
    'failed': 'Failed',
    'needs_permission': 'Permissions needed',
  };
  return labels[status] || status;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Accept both GET and POST (supabase.functions.invoke uses POST by default)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
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
    
    // Get jobs for this user
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('garmin_backfill_jobs')
      .select('id, summary_type, status, attempt_count, next_attempt_at, last_http_status, last_error_message, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (jobsError) {
      log('error', 'Failed to fetch jobs', { error: jobsError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to fetch status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // No jobs
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          has_jobs: false,
          status: 'none',
          status_label: 'No sync history',
          can_retry: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate aggregate status
    const statusCounts: Record<string, number> = {};
    let lastAttemptAt: string | null = null;
    let nextRetryAt: string | null = null;
    
    for (const job of jobs) {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      
      if (!lastAttemptAt || job.updated_at > lastAttemptAt) {
        lastAttemptAt = job.updated_at;
      }
      
      if (job.next_attempt_at && ['rate_limited', 'retrying'].includes(job.status)) {
        if (!nextRetryAt || job.next_attempt_at < nextRetryAt) {
          nextRetryAt = job.next_attempt_at;
        }
      }
    }
    
    // Determine overall status
    let overallStatus = 'unknown';
    let isInProgress = false;
    let canRetry = false;
    
    const pendingStatuses = ['queued', 'running', 'rate_limited', 'retrying'];
    const hasPending = pendingStatuses.some(s => statusCounts[s] > 0);
    const hasFailed = (statusCounts['failed'] || 0) > 0;
    const hasNeedsPermission = (statusCounts['needs_permission'] || 0) > 0;
    const allSuccess = jobs.every(j => j.status === 'success');
    
    if (allSuccess) {
      overallStatus = 'success';
    } else if (hasPending) {
      isInProgress = true;
      if (statusCounts['running'] > 0) {
        overallStatus = 'running';
      } else if (statusCounts['rate_limited'] > 0) {
        overallStatus = 'rate_limited';
      } else if (statusCounts['retrying'] > 0) {
        overallStatus = 'retrying';
      } else {
        overallStatus = 'queued';
      }
    } else if (hasNeedsPermission) {
      overallStatus = 'needs_permission';
      // "needs_permission" is not retryable for activity backfill (e.g. OAuth 2.0 cannot use backfill endpoints)
      canRetry = false;
    } else if (hasFailed) {
      overallStatus = 'failed';
      canRetry = true;
    }
    
    // Get recent error for display (but sanitize it)
    let lastError: string | null = null;
    const failedJob = jobs.find(j => j.status === 'failed' || j.status === 'needs_permission');
    if (failedJob?.last_error_message) {
      // Don't show raw HTML errors
      if (failedJob.last_error_message.includes('<!DOCTYPE') || failedJob.last_error_message.includes('<html')) {
        lastError = 'Server temporarily unavailable';
      } else {
        lastError = failedJob.last_error_message.substring(0, 100);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        has_jobs: true,
        status: overallStatus,
        status_label: getStatusLabel(overallStatus),
        is_in_progress: isInProgress,
        can_retry: canRetry,
        job_counts: statusCounts,
        total_jobs: jobs.length,
        last_attempt_at: lastAttemptAt,
        next_retry_at: isInProgress ? nextRetryAt : null,
        last_error: lastError,
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

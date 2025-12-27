import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Activity Backfill - Enqueue historical activity data requests
// POST /garmin-activity-backfill
// 
// Creates backfill jobs in the queue for the worker to process.
// Max 30 days of history per Garmin API specification.
// 
// This endpoint NO LONGER calls Garmin directly - it creates job records
// that are processed by the garmin-backfill-worker function.
//
// Requires: JWT authentication (user must be logged in)
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_BACKFILL_DAYS = 30;
const CHUNK_SIZE_DAYS = 7; // Split into 7-day chunks for better reliability

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-activity-backfill',
    message,
    ...data,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
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
    const debugSecret = Deno.env.get('DEBUG_SECRET');
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Parse request body
    let body: { 
      days?: number; 
      summary_types?: string[]; 
      user_id?: string; 
      debug_secret?: string;
      retry_failed?: boolean; // Re-enqueue failed jobs
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
    
    // If retry_failed is true, re-enqueue failed/needs_permission jobs
    if (body.retry_failed) {
      const { data: failedJobs, error: fetchError } = await supabaseAdmin
        .from('garmin_backfill_jobs')
        .select('id')
        .eq('user_id', userId)
        .in('status', ['failed', 'needs_permission']);
      
      if (fetchError) {
        log('error', 'Failed to fetch failed jobs', { error: fetchError.message });
        return new Response(
          JSON.stringify({ error: 'Failed to fetch jobs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (failedJobs && failedJobs.length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('garmin_backfill_jobs')
          .update({ 
            status: 'queued', 
            attempt_count: 0,
            next_attempt_at: new Date().toISOString(),
            last_error_message: null,
          })
          .eq('user_id', userId)
          .in('status', ['failed', 'needs_permission']);
        
        if (updateError) {
          log('error', 'Failed to re-enqueue jobs', { error: updateError.message });
          return new Response(
            JSON.stringify({ error: 'Failed to re-enqueue jobs' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        log('info', 'Re-enqueued failed jobs', { userId, count: failedJobs.length });
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Re-enqueued ${failedJobs.length} failed jobs`,
            jobs_requeued: failedJobs.length,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'No failed jobs to retry', jobs_requeued: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const days = Math.min(body.days || 14, MAX_BACKFILL_DAYS);
    const summaryTypes = body.summary_types || ['activitySummary'];
    
    // Check if user has Garmin connected
    const { data: source, error: sourceError } = await supabaseAdmin
      .from('sleep_sources')
      .select('id, user_id, status, domains')
      .eq('user_id', userId)
      .eq('source', 'garmin')
      .single();
    
    if (sourceError || !source) {
      return new Response(
        JSON.stringify({ error: 'Garmin not connected' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (source.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'Garmin connection revoked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!source.domains?.includes('activity')) {
      return new Response(
        JSON.stringify({ error: 'Activity sync not enabled', domains: source.domains }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for existing pending jobs
    const { data: existingJobs } = await supabaseAdmin
      .from('garmin_backfill_jobs')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['queued', 'running', 'rate_limited', 'retrying']);
    
    if (existingJobs && existingJobs.length > 0) {
      log('info', 'User already has pending jobs', { userId, count: existingJobs.length });
      return new Response(
        JSON.stringify({ 
          error: 'Backfill already in progress',
          pending_jobs: existingJobs.length,
          message: 'Please wait for current jobs to complete before starting new ones.'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate time range and create chunks
    const now = Math.floor(Date.now() / 1000);
    const startSeconds = now - (days * 24 * 60 * 60);
    
    // Create jobs for each summary type, chunked into CHUNK_SIZE_DAYS periods
    const jobsToCreate: Array<{
      user_id: string;
      summary_type: string;
      start_seconds: number;
      end_seconds: number;
      status: string;
      next_attempt_at: string;
    }> = [];
    
    for (const summaryType of summaryTypes) {
      let chunkStart = startSeconds;
      while (chunkStart < now) {
        const chunkEnd = Math.min(chunkStart + (CHUNK_SIZE_DAYS * 24 * 60 * 60), now);
        jobsToCreate.push({
          user_id: userId,
          summary_type: summaryType,
          start_seconds: chunkStart,
          end_seconds: chunkEnd,
          status: 'queued',
          next_attempt_at: new Date().toISOString(),
        });
        chunkStart = chunkEnd;
      }
    }
    
    // Insert all jobs
    const { data: createdJobs, error: insertError } = await supabaseAdmin
      .from('garmin_backfill_jobs')
      .insert(jobsToCreate)
      .select('id, summary_type, start_seconds, end_seconds');
    
    if (insertError) {
      log('error', 'Failed to create backfill jobs', { error: insertError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to create backfill jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Created backfill jobs', { 
      userId, 
      jobCount: createdJobs?.length || 0,
      summaryTypes,
      days,
    });
    
    // Update sleep_sources with backfill status
    await supabaseAdmin
      .from('sleep_sources')
      .update({
        backfill_requested_at: new Date().toISOString(),
        backfill_status: 'queued',
        backfill_days: days,
      })
      .eq('id', source.id);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        jobs_created: createdJobs?.length || 0,
        summary_types: summaryTypes,
        days,
        start_time: new Date(startSeconds * 1000).toISOString(),
        end_time: new Date(now * 1000).toISOString(),
        message: 'Backfill jobs queued. They will be processed automatically.',
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

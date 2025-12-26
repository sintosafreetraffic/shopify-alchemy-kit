/**
 * Garmin Backfill Edge Function
 * 
 * Requests historical sleep data from Garmin after OAuth connection.
 * 
 * IMPORTANT: Garmin uses PUSH-based backfill:
 * 1. We POST to their backfill endpoint
 * 2. Garmin sends historical data via webhook over next 1-4 hours
 * 3. garmin-webhook handles deduplication and storage
 * 
 * This is "fire and forget" - we just request the backfill and track status.
 * 
 * POST /garmin-backfill
 * Body: { days?: number } (default 30, max 90)
 * Requires: JWT authentication
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  delete safeData.access_token;
  delete safeData.refresh_token;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-backfill',
    message,
    ...safeData,
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const garminClientId = Deno.env.get('GARMIN_CLIENT_ID');
    const garminClientSecret = Deno.env.get('GARMIN_CLIENT_SECRET');

    if (!garminClientId || !garminClientSecret) {
      log('error', 'Missing Garmin credentials');
      return new Response(
        JSON.stringify({ error: 'Garmin not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body
    let days = 30;
    try {
      const body = await req.json();
      if (body.days && typeof body.days === 'number') {
        days = Math.min(Math.max(body.days, 7), 90); // Clamp between 7-90
      }
    } catch {
      // Use default
    }

    log('info', 'Backfill requested', { userId, days });

    // Get Garmin source with access token
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: source, error: sourceError } = await supabaseAdmin
      .from('sleep_sources')
      .select('id, status, metadata, backfill_requested_at')
      .eq('user_id', userId)
      .eq('source', 'garmin')
      .single();

    if (sourceError || !source) {
      log('warn', 'Garmin source not found', { userId });
      return new Response(
        JSON.stringify({ error: 'Garmin not connected', code: 'NOT_CONNECTED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (source.status === 'revoked') {
      log('warn', 'Garmin source revoked', { userId });
      return new Response(
        JSON.stringify({ error: 'Garmin disconnected', code: 'REVOKED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if backfill was already requested recently (within 1 hour)
    if (source.backfill_requested_at) {
      const requestedAt = new Date(source.backfill_requested_at);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (requestedAt > hourAgo) {
        log('info', 'Backfill already requested recently', { userId, requestedAt: source.backfill_requested_at });
        return new Response(
          JSON.stringify({ 
            status: 'already_requested', 
            message: 'Historical data request already in progress. Data will arrive via webhook within a few hours.',
            requested_at: source.backfill_requested_at,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const metadata = source.metadata as Record<string, unknown>;
    const accessToken = metadata?.access_token as string;

    if (!accessToken) {
      log('error', 'No access token in Garmin source', { userId });
      return new Response(
        JSON.stringify({ error: 'Garmin authentication expired', code: 'TOKEN_MISSING' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range for backfill
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Request backfill from Garmin Health API
    // Garmin's backfill endpoint: POST /wellness-api/rest/backfill/sleepData
    const backfillUrl = 'https://healthapi.garmin.com/wellness-api/rest/backfill/sleepData';
    
    log('info', 'Calling Garmin backfill API', { 
      userId, 
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    const backfillResponse = await fetch(backfillUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summaryStartTimeInSeconds: startTimestamp,
        summaryEndTimeInSeconds: endTimestamp,
      }),
    });

    if (!backfillResponse.ok) {
      const errorText = await backfillResponse.text();
      log('error', 'Garmin backfill request failed', { 
        userId, 
        status: backfillResponse.status,
        error: errorText.substring(0, 200), // Truncate for safety
      });

      // Persist failure status
      const sanitizedError = errorText.substring(0, 500).replace(/token|secret|key/gi, '[REDACTED]');
      await supabaseAdmin
        .from('sleep_sources')
        .update({
          backfill_error: sanitizedError,
          backfill_status: 'failed',
          backfill_days: days,
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id);

      // Handle specific errors
      if (backfillResponse.status === 401 || backfillResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Garmin authentication expired. Please reconnect.', 
            code: 'AUTH_EXPIRED' 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to request historical data from Garmin', code: 'BACKFILL_FAILED' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse response (Garmin returns job info)
    let backfillData: { jobId?: string } = {};
    try {
      backfillData = await backfillResponse.json();
    } catch {
      // Some endpoints return empty body on success
    }

    // Update source with backfill request timestamp and clear any previous error
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('sleep_sources')
      .update({
        backfill_requested_at: now,
        backfill_status: 'requested',
        backfill_days: days,
        backfill_error: null,
        updated_at: now,
      })
      .eq('id', source.id);

    log('info', 'Backfill requested successfully', { 
      userId, 
      days,
      jobId: backfillData.jobId,
    });

    return new Response(
      JSON.stringify({
        status: 'requested',
        message: `Requested ${days} days of historical sleep data. Data will arrive via webhook within a few hours.`,
        days,
        requested_at: now,
        job_id: backfillData.jobId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('error', 'Unexpected error in garmin-backfill', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

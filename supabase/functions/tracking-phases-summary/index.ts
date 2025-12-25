/**
 * Tracking Phases Summary Edge Function
 * 
 * Returns Phase 0-3.5 data in a single call for the /risebynight/tracking page.
 * Auth: Requires admin role via JWT
 * 
 * NO PII: excludes email, phone, ip, user_agent, address, name fields
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Phase1Data {
  purchase_events_created_24h: number;
  purchase_events_created_7d: number;
  unique_orders_24h: number;
  unique_orders_7d: number;
  pending_stale_over_5m: number;
  missing_detected_24h: number;
  missing_detected_7d: number;
  reconcile_last_run: {
    success: boolean;
    duration_ms: number | null;
    created_at: string;
  } | null;
}

interface Phase2Data {
  today: {
    day: string;
    orders_seen: number;
    success_count: number;
    error_count: number;
    pending_count: number;
    unknown_status: number;
    success_rate: number;
    error_rate: number;
    context_rows: number;
    with_epik: number;
    with_ip: number;
    with_ua: number;
    consent_granted: number;
    epik_rate: number;
    ip_rate: number;
    ua_rate: number;
    consent_rate: number;
    reconciliation_mismatches: number;
    total_value_eur: number;
  } | null;
  yesterday: {
    day: string;
    success_rate: number;
    error_rate: number;
  } | null;
  drift: {
    success_rate_drop_abs: number | null;
    error_rate_increase_abs: number | null;
    skipped: boolean;
  };
  alerts: Array<{
    id: string;
    severity: string;
    type: string;
    message: string;
    status: string;
  }>;
}

interface Phase3Data {
  recover_runs_7d: number;
  attempts_total_7d: number;
  dead_letters_total_7d: number;
  recovered_total_7d: number | null;
  last_recover_job: {
    success: boolean;
    duration_ms: number | null;
    created_at: string;
  } | null;
}

interface Phase35Data {
  chaos_supported_webhook: boolean;
  chaos_supported_recovery: boolean;
  chaos_supported_reconcile: boolean;
  chaos_rows_last_7d: number;
}

interface PhasesSummary {
  phase0: { checklist_state_local_only: true };
  phase1: Phase1Data;
  phase2: Phase2Data;
  phase3: Phase3Data;
  phase35: Phase35Data;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role using the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: isAdmin, error: roleError } = await userClient.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for data queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate time windows
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Execute all queries in parallel for performance
    const [
      // Phase 1 queries
      purchaseEvents24h,
      purchaseEvents7d,
      uniqueOrders24h,
      uniqueOrders7d,
      pendingStale,
      missingDetected24h,
      missingDetected7d,
      reconcileLastRun,
      // Phase 2 queries
      healthToday,
      healthYesterday,
      alertsToday,
      // Phase 3 queries
      recoverRuns7d,
      attempts7d,
      deadLetters7d,
      recovered7d,
      lastRecoverJob,
      // Phase 3.5 queries
      chaosRows7d,
    ] = await Promise.all([
      // Phase 1
      supabase.from('pinterest_purchase_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo.toISOString()),
      supabase.from('pinterest_purchase_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('pinterest_purchase_events')
        .select('order_id')
        .gte('created_at', twentyFourHoursAgo.toISOString()),
      supabase.from('pinterest_purchase_events')
        .select('order_id')
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('pinterest_purchase_events')
        .select('id', { count: 'exact', head: true })
        .or('render_status.is.null,render_status.eq.pending')
        .lt('created_at', fiveMinutesAgo.toISOString()),
      supabase.from('missing_purchase_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'detected')
        .gte('detected_at', twentyFourHoursAgo.toISOString()),
      supabase.from('missing_purchase_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'detected')
        .gte('detected_at', sevenDaysAgo.toISOString()),
      supabase.from('tracking_jobs')
        .select('success, duration_ms, created_at')
        .eq('job_name', 'reconcile-shopify-orders')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Phase 2
      supabase.from('tracking_health_daily')
        .select('*')
        .eq('day', todayStr)
        .maybeSingle(),
      supabase.from('tracking_health_daily')
        .select('day, success_rate, error_rate')
        .eq('day', yesterdayStr)
        .maybeSingle(),
      supabase.from('tracking_alerts')
        .select('id, severity, type, message, status')
        .eq('day', todayStr)
        .order('created_at', { ascending: false })
        .limit(10),
      // Phase 3
      supabase.from('tracking_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('job_name', 'recover-missing-purchases')
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('recovery_purchase_attempts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('recovery_dead_letters')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('missing_purchase_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'recovered')
        .gte('detected_at', sevenDaysAgo.toISOString()),
      supabase.from('tracking_jobs')
        .select('success, duration_ms, created_at')
        .eq('job_name', 'recover-missing-purchases')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Phase 3.5
      supabase.from('pinterest_purchase_events')
        .select('id', { count: 'exact', head: true })
        .ilike('render_status', 'chaos_%')
        .gte('created_at', sevenDaysAgo.toISOString()),
    ]);

    // Compute unique order counts
    const uniqueOrders24hSet = new Set(uniqueOrders24h.data?.map(r => r.order_id) || []);
    const uniqueOrders7dSet = new Set(uniqueOrders7d.data?.map(r => r.order_id) || []);

    // Build Phase 1 data
    const phase1: Phase1Data = {
      purchase_events_created_24h: purchaseEvents24h.count || 0,
      purchase_events_created_7d: purchaseEvents7d.count || 0,
      unique_orders_24h: uniqueOrders24hSet.size,
      unique_orders_7d: uniqueOrders7dSet.size,
      pending_stale_over_5m: pendingStale.count || 0,
      missing_detected_24h: missingDetected24h.count || 0,
      missing_detected_7d: missingDetected7d.count || 0,
      reconcile_last_run: reconcileLastRun.data ? {
        success: reconcileLastRun.data.success,
        duration_ms: reconcileLastRun.data.duration_ms,
        created_at: reconcileLastRun.data.created_at,
      } : null,
    };

    // Build Phase 2 data
    const todayData = healthToday.data;
    const yesterdayData = healthYesterday.data;
    
    let drift: Phase2Data['drift'];
    if (todayData && yesterdayData) {
      drift = {
        success_rate_drop_abs: Number(yesterdayData.success_rate) - Number(todayData.success_rate),
        error_rate_increase_abs: Number(todayData.error_rate) - Number(yesterdayData.error_rate),
        skipped: false,
      };
    } else {
      drift = {
        success_rate_drop_abs: null,
        error_rate_increase_abs: null,
        skipped: true,
      };
    }

    const phase2: Phase2Data = {
      today: todayData ? {
        day: todayData.day,
        orders_seen: todayData.orders_seen,
        success_count: todayData.success_count,
        error_count: todayData.error_count,
        pending_count: todayData.pending_count,
        unknown_status: todayData.unknown_status,
        success_rate: Number(todayData.success_rate),
        error_rate: Number(todayData.error_rate),
        context_rows: todayData.context_rows,
        with_epik: todayData.with_epik,
        with_ip: todayData.with_ip,
        with_ua: todayData.with_ua,
        consent_granted: todayData.consent_granted,
        epik_rate: Number(todayData.epik_rate),
        ip_rate: Number(todayData.ip_rate),
        ua_rate: Number(todayData.ua_rate),
        consent_rate: Number(todayData.consent_rate),
        reconciliation_mismatches: todayData.reconciliation_mismatches,
        total_value_eur: Number(todayData.total_value_eur),
      } : null,
      yesterday: yesterdayData ? {
        day: yesterdayData.day,
        success_rate: Number(yesterdayData.success_rate),
        error_rate: Number(yesterdayData.error_rate),
      } : null,
      drift,
      alerts: alertsToday.data || [],
    };

    // Build Phase 3 data
    const phase3: Phase3Data = {
      recover_runs_7d: recoverRuns7d.count || 0,
      attempts_total_7d: attempts7d.count || 0,
      dead_letters_total_7d: deadLetters7d.count || 0,
      recovered_total_7d: recovered7d.count,
      last_recover_job: lastRecoverJob.data ? {
        success: lastRecoverJob.data.success,
        duration_ms: lastRecoverJob.data.duration_ms,
        created_at: lastRecoverJob.data.created_at,
      } : null,
    };

    // Build Phase 3.5 data
    // Chaos support is statically known from code inspection
    const phase35: Phase35Data = {
      chaos_supported_webhook: true, // shopify-order-webhook has extractChaosMode
      chaos_supported_recovery: true, // recover-missing-purchases has extractChaosMode
      chaos_supported_reconcile: true, // reconcile-shopify-orders has chaos handling
      chaos_rows_last_7d: chaosRows7d.count || 0,
    };

    const result: PhasesSummary = {
      phase0: { checklist_state_local_only: true },
      phase1,
      phase2,
      phase3,
      phase35,
    };

    console.log('[tracking-phases-summary] Returning phases data');

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[tracking-phases-summary] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Garmin Compute Coach Signals
 * CRON job to compute qualitative sleep coach signals from Health API data
 * 
 * Signals computed (qualitative only, no numbers exposed to UI):
 * - bedtime_consistency: consistent / moderate / irregular
 * - sleep_fragmentation: improved / stable / worse
 * - recovery_proxy: low / moderate / strong
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-compute-coach-signals',
    message,
    ...data,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

function createAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface SleepNight {
  start_time_seconds: number;
  duration_sleep_seconds: number | null;
  awake_seconds: number | null;
  deep_seconds: number | null;
}

interface CoachSignal {
  user_id: string;
  calendar_date: string;
  signal_key: string;
  signal_value: string;
  data_sources: string[];
}

// Compute bedtime consistency
function computeBedtimeConsistency(sleeps: SleepNight[]): string {
  if (sleeps.length < 3) return 'baseline_building';
  
  // Extract bedtimes (hour of day in local-ish time)
  const bedtimeHours = sleeps.map(s => {
    const date = new Date(s.start_time_seconds * 1000);
    return date.getUTCHours() + date.getUTCMinutes() / 60;
  });
  
  // Calculate standard deviation
  const mean = bedtimeHours.reduce((a, b) => a + b, 0) / bedtimeHours.length;
  const variance = bedtimeHours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / bedtimeHours.length;
  const stdDev = Math.sqrt(variance);
  
  // Classify
  if (stdDev < 0.5) return 'consistent';
  if (stdDev < 1.5) return 'moderate';
  return 'irregular';
}

// Compute sleep fragmentation trend
function computeFragmentationTrend(recentSleeps: SleepNight[], baselineSleeps: SleepNight[]): string {
  if (recentSleeps.length < 3 || baselineSleeps.length < 7) return 'baseline_building';
  
  // Calculate average awake ratio
  const calcAwakeRatio = (sleeps: SleepNight[]) => {
    const validSleeps = sleeps.filter(s => s.duration_sleep_seconds && s.awake_seconds);
    if (validSleeps.length === 0) return null;
    const totalAwake = validSleeps.reduce((sum, s) => sum + (s.awake_seconds || 0), 0);
    const totalDuration = validSleeps.reduce((sum, s) => sum + (s.duration_sleep_seconds || 0), 0);
    return totalAwake / totalDuration;
  };
  
  const recentRatio = calcAwakeRatio(recentSleeps);
  const baselineRatio = calcAwakeRatio(baselineSleeps);
  
  if (recentRatio === null || baselineRatio === null) return 'baseline_building';
  
  const diff = recentRatio - baselineRatio;
  
  if (diff < -0.02) return 'improved';
  if (diff > 0.02) return 'worse';
  return 'stable';
}

// Compute recovery proxy (deep sleep trend)
function computeRecoveryProxy(recentSleeps: SleepNight[]): string {
  if (recentSleeps.length < 3) return 'baseline_building';
  
  // Calculate average deep sleep percentage
  const validSleeps = recentSleeps.filter(s => s.duration_sleep_seconds && s.deep_seconds);
  if (validSleeps.length === 0) return 'baseline_building';
  
  const avgDeepPct = validSleeps.reduce((sum, s) => {
    return sum + ((s.deep_seconds || 0) / (s.duration_sleep_seconds || 1));
  }, 0) / validSleeps.length;
  
  // Classify (typical adult deep sleep is 13-23%)
  if (avgDeepPct < 0.10) return 'low';
  if (avgDeepPct < 0.20) return 'moderate';
  return 'strong';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate CRON_SECRET for scheduled calls
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('authorization') || '';
  const providedSecret = authHeader.replace('Bearer ', '');
  
  if (cronSecret && providedSecret !== cronSecret) {
    log('warn', 'Unauthorized call attempt');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();
  const supabase = createAdminClient();

  try {
    // Get all users with health data in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoSeconds = Math.floor(thirtyDaysAgo.getTime() / 1000);

    const { data: usersWithData, error: usersError } = await supabase
      .from('garmin_sleeps')
      .select('user_id')
      .not('user_id', 'is', null)
      .gte('start_time_seconds', thirtyDaysAgoSeconds)
      .limit(1000);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Dedupe users
    const uniqueUsers = [...new Set((usersWithData || []).map(u => u.user_id).filter(Boolean))];
    
    log('info', 'Processing coach signals', { userCount: uniqueUsers.length });

    const today = new Date().toISOString().split('T')[0];
    const signalsToUpsert: CoachSignal[] = [];
    let usersProcessed = 0;
    let signalsComputed = 0;

    for (const userId of uniqueUsers) {
      // Get recent sleeps (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoSeconds = Math.floor(sevenDaysAgo.getTime() / 1000);

      const { data: recentSleeps } = await supabase
        .from('garmin_sleeps')
        .select('start_time_seconds, duration_sleep_seconds, awake_seconds, deep_seconds')
        .eq('user_id', userId)
        .gte('start_time_seconds', sevenDaysAgoSeconds)
        .order('start_time_seconds', { ascending: false });

      // Get baseline sleeps (8-30 days ago)
      const { data: baselineSleeps } = await supabase
        .from('garmin_sleeps')
        .select('start_time_seconds, duration_sleep_seconds, awake_seconds, deep_seconds')
        .eq('user_id', userId)
        .gte('start_time_seconds', thirtyDaysAgoSeconds)
        .lt('start_time_seconds', sevenDaysAgoSeconds)
        .order('start_time_seconds', { ascending: false });

      const recent = (recentSleeps || []) as SleepNight[];
      const baseline = (baselineSleeps || []) as SleepNight[];
      const allSleeps = [...recent, ...baseline];

      // Compute signals
      const bedtimeConsistency = computeBedtimeConsistency(allSleeps);
      const fragmentationTrend = computeFragmentationTrend(recent, baseline);
      const recoveryProxy = computeRecoveryProxy(recent);

      // Add signals
      signalsToUpsert.push(
        {
          user_id: userId,
          calendar_date: today,
          signal_key: 'bedtime_consistency',
          signal_value: bedtimeConsistency,
          data_sources: ['garmin_health'],
        },
        {
          user_id: userId,
          calendar_date: today,
          signal_key: 'sleep_fragmentation',
          signal_value: fragmentationTrend,
          data_sources: ['garmin_health'],
        },
        {
          user_id: userId,
          calendar_date: today,
          signal_key: 'recovery_proxy',
          signal_value: recoveryProxy,
          data_sources: ['garmin_health'],
        }
      );

      usersProcessed++;
      signalsComputed += 3;
    }

    // Batch upsert signals
    if (signalsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('sleep_coach_metrics_daily')
        .upsert(signalsToUpsert, {
          onConflict: 'user_id,calendar_date,signal_key',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        log('error', 'Failed to upsert signals', { error: upsertError.message });
      }
    }

    log('info', 'Coach signals computation complete', {
      usersProcessed,
      signalsComputed,
      durationMs: Date.now() - startTime,
    });

    return new Response(JSON.stringify({
      success: true,
      users_processed: usersProcessed,
      signals_computed: signalsComputed,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log('error', 'Coach signals computation failed', { error: String(err) });
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

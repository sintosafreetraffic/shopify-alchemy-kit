import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ActivitySummary {
  user_id: string | null;
  garmin_user_id: string;
  start_time_seconds: number;
  start_time_offset_seconds: number | null;
  duration_seconds: number | null;
  activity_type: string | null;
  is_manual: boolean;
}

interface SignalResult {
  user_id: string;
  date: string;
  training_load_label: 'unknown' | 'low' | 'moderate' | 'high' | 'very_high';
  workouts_count_7d: number;
  baseline_workouts_count_30d: number;
  most_common_activity_type: string | null;
  late_workout_flag: boolean;
  late_workout_days_7d: number;
  signal_freshness: 'fresh' | 'stale' | 'insufficient_data';
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const logData = { timestamp: new Date().toISOString(), level, message, ...data };
  console.log(JSON.stringify(logData));
}

/**
 * Determine training load label based on comparison of 7-day vs 30-day baseline
 */
function computeTrainingLoadLabel(
  workouts7d: number,
  workouts30d: number
): 'unknown' | 'low' | 'moderate' | 'high' | 'very_high' {
  if (workouts30d === 0 && workouts7d === 0) return 'unknown';
  if (workouts30d === 0 && workouts7d > 0) return 'moderate'; // New activity, assume moderate
  
  // Normalize 30-day to 7-day equivalent
  const baseline7dEquivalent = (workouts30d / 30) * 7;
  
  if (baseline7dEquivalent === 0) {
    if (workouts7d === 0) return 'unknown';
    if (workouts7d <= 2) return 'low';
    if (workouts7d <= 4) return 'moderate';
    return 'high';
  }
  
  const ratio = workouts7d / baseline7dEquivalent;
  
  if (ratio < 0.5) return 'low';
  if (ratio < 0.9) return 'moderate';
  if (ratio < 1.3) return 'moderate';
  if (ratio < 1.7) return 'high';
  return 'very_high';
}

/**
 * Check if an activity ended "late" (after 8 PM local time)
 * Late workouts can affect sleep quality
 */
function isLateWorkout(
  startTimeSeconds: number,
  durationSeconds: number | null,
  offsetSeconds: number | null
): boolean {
  const duration = durationSeconds || 0;
  const endTimeSeconds = startTimeSeconds + duration;
  const offset = offsetSeconds || 0;
  
  // Convert to local time
  const localEndSeconds = endTimeSeconds + offset;
  
  // Get hour of day (0-23)
  const localDate = new Date(localEndSeconds * 1000);
  const localHour = localDate.getUTCHours();
  
  // Consider "late" as after 8 PM (20:00)
  return localHour >= 20;
}

/**
 * Get most common activity type from array
 */
function getMostCommonActivityType(activities: ActivitySummary[]): string | null {
  const typeCounts: Record<string, number> = {};
  
  for (const activity of activities) {
    const type = activity.activity_type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  
  let maxCount = 0;
  let mostCommon: string | null = null;
  
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = type;
    }
  }
  
  return mostCommon;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    let targetUserId: string | null = null;
    let targetDate: string | null = null;
    
    try {
      const body = await req.json();
      targetUserId = body.user_id || null;
      targetDate = body.date || null;
    } catch {
      // No body or invalid JSON - process all users for today
    }
    
    const today = targetDate || new Date().toISOString().split('T')[0];
    const todayTimestamp = Math.floor(new Date(today).getTime() / 1000);
    
    // Calculate date windows
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = Math.floor(sevenDaysAgo.getTime() / 1000);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);
    
    log('info', 'Computing activity signals', {
      targetUserId,
      date: today,
      windows: { sevenDaysAgo: sevenDaysAgo.toISOString().split('T')[0], thirtyDaysAgo: thirtyDaysAgo.toISOString().split('T')[0] }
    });
    
    // Get users with activity data
    let userQuery = supabase
      .from('sleep_sources')
      .select('user_id')
      .contains('domains', ['activity'])
      .eq('status', 'connected')
      .eq('activity_status', 'enabled');
    
    if (targetUserId) {
      userQuery = userQuery.eq('user_id', targetUserId);
    }
    
    const { data: users, error: usersError } = await userQuery;
    
    if (usersError) {
      log('error', 'Failed to fetch users', { error: usersError.message });
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!users || users.length === 0) {
      log('info', 'No users with activity enabled');
      return new Response(JSON.stringify({ processed: 0, message: 'No users with activity enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const results: SignalResult[] = [];
    const errors: Array<{ user_id: string; error: string }> = [];
    
    for (const { user_id } of users) {
      try {
        // Fetch activities for last 30 days
        const { data: activities, error: activitiesError } = await supabase
          .from('garmin_activity_summaries')
          .select('user_id, garmin_user_id, start_time_seconds, start_time_offset_seconds, duration_seconds, activity_type, is_manual')
          .eq('user_id', user_id)
          .gte('start_time_seconds', thirtyDaysAgoTimestamp)
          .lte('start_time_seconds', todayTimestamp + 86400) // Include today
          .eq('is_manual', false); // Exclude manual entries
        
        if (activitiesError) {
          log('warn', 'Failed to fetch activities for user', { user_id, error: activitiesError.message });
          errors.push({ user_id, error: activitiesError.message });
          continue;
        }
        
        const allActivities = (activities || []) as ActivitySummary[];
        
        // Split into 7-day and 30-day windows
        const activities7d = allActivities.filter(a => a.start_time_seconds >= sevenDaysAgoTimestamp);
        const activities30d = allActivities.filter(a => a.start_time_seconds < sevenDaysAgoTimestamp);
        
        // Compute signals
        const workouts7d = activities7d.length;
        const workouts30d = activities30d.length;
        
        const trainingLoadLabel = computeTrainingLoadLabel(workouts7d, workouts30d);
        const mostCommonType = getMostCommonActivityType(allActivities);
        
        // Check for late workouts in last 7 days
        const lateWorkouts7d = activities7d.filter(a => 
          isLateWorkout(a.start_time_seconds, a.duration_seconds, a.start_time_offset_seconds)
        );
        const lateWorkoutFlag = lateWorkouts7d.length > 0;
        
        // Count unique days with late workouts
        const lateWorkoutDays = new Set(
          lateWorkouts7d.map(a => {
            const date = new Date(a.start_time_seconds * 1000);
            return date.toISOString().split('T')[0];
          })
        ).size;
        
        // Determine signal freshness
        let signalFreshness: 'fresh' | 'stale' | 'insufficient_data' = 'insufficient_data';
        if (activities7d.length >= 1) {
          // Check if most recent activity is within 3 days
          const mostRecentActivity = activities7d.reduce((latest, a) => 
            a.start_time_seconds > latest.start_time_seconds ? a : latest
          , activities7d[0]);
          
          const threeDaysAgoTimestamp = todayTimestamp - (3 * 86400);
          signalFreshness = mostRecentActivity.start_time_seconds >= threeDaysAgoTimestamp ? 'fresh' : 'stale';
        }
        
        const signal: SignalResult = {
          user_id,
          date: today,
          training_load_label: trainingLoadLabel,
          workouts_count_7d: workouts7d,
          baseline_workouts_count_30d: workouts30d,
          most_common_activity_type: mostCommonType,
          late_workout_flag: lateWorkoutFlag,
          late_workout_days_7d: lateWorkoutDays,
          signal_freshness: signalFreshness
        };
        
        // Upsert signal to database
        const { error: upsertError } = await supabase
          .from('sleep_coach_activity_signals_daily')
          .upsert({
            ...signal,
            computed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,date'
          });
        
        if (upsertError) {
          log('warn', 'Failed to upsert signal', { user_id, error: upsertError.message });
          errors.push({ user_id, error: upsertError.message });
        } else {
          results.push(signal);
          log('info', 'Computed signal for user', { 
            user_id, 
            training_load: trainingLoadLabel,
            workouts_7d: workouts7d,
            late_workout: lateWorkoutFlag
          });
        }
        
      } catch (userError) {
        const errorMessage = userError instanceof Error ? userError.message : 'Unknown error';
        log('error', 'Error processing user', { user_id, error: errorMessage });
        errors.push({ user_id, error: errorMessage });
      }
    }
    
    log('info', 'Activity signals computation complete', {
      processed: results.length,
      errors: errors.length,
      date: today
    });
    
    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      errors: errors.length,
      date: today,
      results: results.map(r => ({
        user_id: r.user_id,
        training_load: r.training_load_label,
        late_workout: r.late_workout_flag
      })),
      errorDetails: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Unexpected error', { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

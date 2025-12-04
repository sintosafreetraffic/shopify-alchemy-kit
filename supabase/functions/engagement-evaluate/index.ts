import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { email } = await req.json();

    console.log(`Evaluating engagement for ${email}`);

    // Get recent logs
    const { data: logs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('email', email)
      .order('date', { ascending: false })
      .limit(14);

    // Get engagement meta
    const { data: meta } = await supabase
      .from('engagement_meta')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // Calculate metrics
    const now = new Date();
    const lastLog = logs?.[0];
    const daysSinceLastLog = lastLog 
      ? Math.floor((now.getTime() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const inactivityDetected = daysSinceLastLog >= 3;
    
    // Calculate streak based on unique days the user actually logged (created_at), not sleep dates
    // This means logging multiple past dates in one session counts as 1 streak day
    let streak = 0;
    if (logs && logs.length > 0) {
      // Get unique logging days based on created_at timestamp
      const loggingDays = new Set<string>();
      logs.forEach(log => {
        const createdAt = new Date(log.created_at);
        const dayKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}`;
        loggingDays.add(dayKey);
      });
      
      // Convert to sorted array of dates
      const sortedLoggingDays = Array.from(loggingDays)
        .map(key => {
          const [year, month, day] = key.split('-').map(Number);
          return new Date(year, month, day);
        })
        .sort((a, b) => b.getTime() - a.getTime());
      
      // Calculate consecutive days streak
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (const logDate of sortedLoggingDays) {
        logDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          streak++;
          currentDate = logDate;
        } else {
          break;
        }
      }
    }

    // Analyze trends
    const recentLogs = logs?.slice(0, 7) || [];
    const olderLogs = logs?.slice(7, 14) || [];
    
    let declineDetected = false;
    let improvementDetected = false;
    
    if (recentLogs.length >= 3 && olderLogs.length >= 3) {
      const recentAvg = recentLogs.reduce((s, l) => s + l.sleep_quality, 0) / recentLogs.length;
      const olderAvg = olderLogs.reduce((s, l) => s + l.sleep_quality, 0) / olderLogs.length;
      
      if (olderAvg - recentAvg > 0.5) declineDetected = true;
      if (recentAvg - olderAvg > 0.5) improvementDetected = true;
    }

    // Update engagement meta
    const { error: upsertError } = await supabase
      .from('engagement_meta')
      .upsert({
        email,
        last_evaluation_at: now.toISOString(),
        total_streak_days: streak,
        inactivity_detected: inactivityDetected,
        decline_detected: declineDetected,
        improvement_detected: improvementDetected,
        updated_at: now.toISOString(),
      }, { onConflict: 'email' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
    }

    console.log(`Engagement evaluation complete: streak=${streak}, inactive=${inactivityDetected}, decline=${declineDetected}, improvement=${improvementDetected}`);

    return new Response(JSON.stringify({
      email,
      streak,
      daysSinceLastLog,
      inactivityDetected,
      declineDetected,
      improvementDetected,
      logsCount: logs?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in engagement-evaluate:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

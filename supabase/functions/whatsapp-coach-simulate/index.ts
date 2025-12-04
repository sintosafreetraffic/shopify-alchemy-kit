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

    console.log(`Simulating WhatsApp message for ${email}`);

    // Fetch user data
    const { data: logs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('email', email)
      .order('date', { ascending: false })
      .limit(14);

    const { data: profile } = await supabase
      .from('sleep_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const { data: meta } = await supabase
      .from('engagement_meta')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // Calculate context
    const now = new Date();
    const lastLog = logs?.[0];
    const daysSinceLastLog = lastLog 
      ? Math.floor((now.getTime() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const streak = meta?.total_streak_days || 0;
    const trends = analyzeTrends(logs || []);
    
    // Generate appropriate message
    const { message, messageType } = selectBestMessage({
      daysSinceLastLog,
      streak,
      trends,
      profile,
      lastLog,
      meta,
    });

    // Update last nudge time
    await supabase
      .from('engagement_meta')
      .upsert({
        email,
        last_whatsapp_nudge_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'email' });

    console.log(`Generated ${messageType} message`);

    return new Response(JSON.stringify({
      message,
      messageType,
      context: { daysSinceLastLog, streak, trends },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in whatsapp-coach-simulate:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeTrends(logs: any[]): any {
  if (logs.length === 0) return { trend: 'stable', avgQuality: 0, avgPain: 0 };
  
  const avgQuality = logs.reduce((s, l) => s + l.sleep_quality, 0) / logs.length;
  const avgPain = logs.reduce((s, l) => s + l.pain_level_morning, 0) / logs.length;
  
  const recent = logs.slice(0, 7);
  const older = logs.slice(7, 14);
  
  let trend = 'stable';
  if (older.length >= 3) {
    const recentAvg = recent.reduce((s, l) => s + l.sleep_quality, 0) / recent.length;
    const olderAvg = older.reduce((s, l) => s + l.sleep_quality, 0) / older.length;
    if (recentAvg - olderAvg > 0.5) trend = 'improving';
    else if (olderAvg - recentAvg > 0.5) trend = 'worsening';
  }
  
  return { trend, avgQuality, avgPain };
}

function selectBestMessage(ctx: any): { message: string; messageType: string } {
  const { daysSinceLastLog, streak, trends, profile, lastLog } = ctx;
  
  // Inactivity reminder
  if (daysSinceLastLog >= 3) {
    return {
      message: `Hey! 👋 We noticed you haven't logged your sleep in ${daysSinceLastLog} days. How have you been sleeping with your Rise By Night pillow? Reply with a number 1-5 to log tonight!`,
      messageType: 'inactivity_reminder',
    };
  }
  
  // Streak celebration
  if (streak >= 7 && streak % 7 === 0) {
    return {
      message: `🎉 Amazing! You've logged ${streak} days in a row! Your consistency is paying off. Keep up the great work with your Rise By Night sleep routine!`,
      messageType: 'streak_celebration',
    };
  }
  
  // Improvement acknowledgment
  if (trends.trend === 'improving') {
    return {
      message: `📈 Great news! Your sleep quality has been improving. Whatever you're doing with your Rise By Night pillow setup, it's working! Keep up those good habits.`,
      messageType: 'improvement_acknowledgment',
    };
  }
  
  // Decline support
  if (trends.trend === 'worsening') {
    return {
      message: `I noticed your sleep has been a bit tougher lately. That's okay - sleep can be affected by many things. Would you like some tips to optimize your Rise By Night pillow position? Reply YES for personalized suggestions.`,
      messageType: 'decline_support',
    };
  }
  
  // Pain follow-up
  if (lastLog && lastLog.pain_level_morning >= 6) {
    return {
      message: `I saw your pain level was ${lastLog.pain_level_morning}/10 this morning. Have you tried adjusting your Rise By Night pillow height? Sometimes a small change makes a big difference.`,
      messageType: 'pain_followup',
    };
  }
  
  // Morning check-in
  const hour = new Date().getHours();
  if (hour >= 6 && hour <= 10) {
    return {
      message: `Good morning! ☀️ How did you sleep last night with your Rise By Night pillow? Reply with a number 1-5 (1=terrible, 5=amazing) to log your sleep.`,
      messageType: 'morning_checkin',
    };
  }
  
  // General tip
  const tips = [
    "💡 Tip: Keep your bedroom between 60-67°F (15-19°C) for optimal sleep with your ergonomic pillow.",
    "💡 Tip: Try to go to bed and wake up at the same time every day to maximize the benefits of your Rise By Night pillow.",
    "💡 Tip: Avoid screens for 1 hour before bed - pair this with your Rise By Night pillow for best results.",
    "💡 Tip: If you're a side sleeper, make sure your Rise By Night pillow fills the gap between your shoulder and head completely.",
  ];
  
  return {
    message: tips[Math.floor(Math.random() * tips.length)],
    messageType: 'general_tip',
  };
}

/**
 * WhatsApp Coach Simulate Edge Function
 * 
 * Simulates WhatsApp message generation for testing.
 * Uses centralized env/cors helpers and AI Brain for tip generation.
 * 
 * PROTECTED: Requires DEBUG_SECRET or CRON_SECRET for authorization.
 * This is a debug/testing endpoint and should not be publicly accessible.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  hasOpenAIKey,
  validateDebugSecret,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import { generateWhatsAppTip } from "../_shared/ai-brain.ts";
import { generateSleepAttributes } from "../_shared/sleep-sync.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================================
    // AUTH BLOCK: Validate debug/testing access
    // Requires DEBUG_SECRET or CRON_SECRET for authorization
    // ============================================================
    const authHeader = req.headers.get('Authorization');
    if (!validateDebugSecret(authHeader)) {
      console.warn('[WhatsApp Simulate] Unauthorized access attempt');
      return createErrorResponse('Unauthorized', 401);
    }

    // Use centralized env helpers
    const SUPABASE_URL = requireEnvVar('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { email, tipType = "micro_tip" } = await req.json();

    if (!email) {
      return createErrorResponse('Email is required', 400);
    }

    console.log(`[WhatsApp Simulate] Generating message for ${email}, type: ${tipType}`);

    // Fetch user profile first to check if WhatsApp is enabled
    const { data: profile } = await supabase
      .from('sleep_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // Check if WhatsApp is enabled for this user
    if (!profile?.whatsapp_enabled) {
      console.log(`[WhatsApp Simulate] WhatsApp not enabled for ${email}`);
      return createSuccessResponse({ 
        error: 'WhatsApp updates not enabled',
        message: 'Please enable WhatsApp updates in your profile settings to receive messages.',
        enabled: false 
      });
    }

    // Fetch sleep logs
    const { data: logs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('email', email)
      .order('date', { ascending: false })
      .limit(14);

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

    // Determine tip type based on context
    let actualTipType = tipType;
    if (daysSinceLastLog >= 3) {
      actualTipType = "streak_reminder";
    } else if (streak >= 7 && streak % 7 === 0) {
      actualTipType = "celebration";
    } else if (trends.trend === "improving") {
      actualTipType = "celebration";
    }

    // Generate message using AI Brain if available
    let message: string;
    let messageType = actualTipType;

    if (hasOpenAIKey()) {
      // Use centralized AI Brain for message generation
      const attributes = await generateSleepAttributes(supabase, email);
      message = await generateWhatsAppTip(
        profile,
        attributes,
        logs || [],
        actualTipType as "morning_checkin" | "micro_tip" | "celebration" | "streak_reminder"
      );
      console.log(`[WhatsApp Simulate] Generated AI message for ${email}`);
    } else {
      // Use fallback static message selection
      const result = selectBestMessage({
        daysSinceLastLog,
        streak,
        trends,
        profile,
        lastLog,
        meta,
      });
      message = result.message;
      messageType = result.messageType;
      console.log(`[WhatsApp Simulate] Generated fallback message for ${email}`);
    }

    // Update last nudge time
    await supabase
      .from('engagement_meta')
      .upsert({
        email,
        last_whatsapp_nudge_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'email' });

    console.log(`[WhatsApp Simulate] Generated ${messageType} message`);

    return createSuccessResponse({
      message,
      messageType,
      context: { daysSinceLastLog, streak, trends },
    });
  } catch (error: any) {
    console.error('[WhatsApp Simulate] Error:', error);
    return createErrorResponse(error.message, 500);
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

// Static fallback message selection when AI is not available
function selectBestMessage(ctx: any): { message: string; messageType: string } {
  const { daysSinceLastLog, streak, trends, lastLog } = ctx;
  
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
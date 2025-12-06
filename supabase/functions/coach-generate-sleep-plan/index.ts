import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SleepProfile {
  email: string;
  sleep_position: string;
  pain_points: string[];
  temperature_preference: string;
  stress_level: string;
  wake_up_condition: string;
  whatsapp_enabled?: boolean;
  purchase_count?: number;
  delivery_date?: string;
}

interface SleepLog {
  date: string;
  sleep_quality: number;
  pain_level_morning: number;
  felt_hot: boolean;
  felt_stressed: boolean;
  notes: string | null;
}

interface TrendData {
  avgSleepQuality: number;
  avgPain: number;
  trend: 'improving' | 'stable' | 'worsening';
  hotNights: number;
  stressedNights: number;
  goodNights: number;
  poorNights: number;
}

// Sleep Sync types
type Level3 = "low" | "medium" | "high";
type Trend3 = "improving" | "stable" | "worsening" | "unknown";

interface SleepSyncAttributes {
  email: string;
  sleep_stress_level: Level3;
  sleep_trend: Trend3;
  pain_trend: Trend3;
  avg_sleep_quality_7d: number | null;
  avg_sleep_quality_14d: number | null;
  avg_pain_7d: number | null;
  avg_pain_14d: number | null;
  hot_nights_7d: number;
  hot_nights_14d: number;
  stressed_nights_7d: number;
  stressed_nights_14d: number;
  streak_days: number;
  last_log_days_ago: number | null;
  log_consistency_score: number;
  temperature_sensitive: boolean;
  engagement_level: Level3;
  last_dashboard_visit_days_ago: number | null;
  last_whatsapp_interaction_days_ago: number | null;
  ai_coach_engagement_level: Level3;
  pdf_opens_last_30d: number;
  email_opens_last_30d: number;
  whatsapp_enabled: boolean;
  purchase_status: "not_bought" | "bought_once" | "repeat_buyer";
  orders_count: number;
  days_since_last_order: number | null;
  is_new_customer: boolean;
  has_returned_pillow: boolean;
  refund_risk_flag: boolean;
  complaint_flag: boolean;
  app_usage_type: "none" | "quiz_only" | "sleep_log_user" | "dashboard_user" | "full_user";
  used_sleep_quiz: boolean;
  used_sleep_plan: boolean;
  used_pillow_wizard: boolean;
  deep_sleep_supported: boolean;
  wearable_connected: boolean;
  risk_level: Level3;
  upsell_score: number;
  churn_risk_score: number;
  affiliate_potential_score: number;
  prefers_channel: "email" | "whatsapp" | "both" | "unknown";
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    // Extract user from JWT - this is the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's JWT to get their identity
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user?.email) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the authenticated user's email - ignore any email in request body
    const email = user.email;
    const { planType = 'initial' } = await req.json();

    console.log(`Generating ${planType} sleep plan for authenticated user: ${email}`);

    // Use service role for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch profile
    const { data: profile } = await supabase
      .from('sleep_profiles')
      .select('*')
      .eq('email', email)
      .single();

    // Fetch recent logs
    const { data: logs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('email', email)
      .order('date', { ascending: false })
      .limit(14);

    const trends = calculateTrends(logs || []);
    const systemPrompt = buildSystemPrompt(planType, trends);
    const userContext = buildUserContext(profile, logs || [], trends);

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContext }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_sleep_plan",
              description: "Create a personalized 7-day sleep improvement plan",
              parameters: {
                type: "object",
                properties: {
                  weeklyPlan: {
                    type: "object",
                    properties: {
                      day1: { type: "object", properties: { focus: { type: "string" }, morningTask: { type: "string" }, eveningTask: { type: "string" }, tip: { type: "string" } }, required: ["focus", "morningTask", "eveningTask", "tip"] },
                      day2: { type: "object", properties: { focus: { type: "string" }, morningTask: { type: "string" }, eveningTask: { type: "string" }, tip: { type: "string" } }, required: ["focus", "morningTask", "eveningTask", "tip"] },
                      day3: { type: "object", properties: { focus: { type: "string" }, morningTask: { type: "string" }, eveningTask: { type: "string" }, tip: { type: "string" } }, required: ["focus", "morningTask", "eveningTask", "tip"] },
                      day4: { type: "object", properties: { focus: { type: "string" }, morningTask: { type: "string" }, eveningTask: { type: "string" }, tip: { type: "string" } }, required: ["focus", "morningTask", "eveningTask", "tip"] },
                      day5: { type: "object", properties: { focus: { type: "string" }, morningTask: { type: "string" }, eveningTask: { type: "string" }, tip: { type: "string" } }, required: ["focus", "morningTask", "eveningTask", "tip"] },
                      day6: { type: "object", properties: { focus: { type: "string" }, morningTask: { type: "string" }, eveningTask: { type: "string" }, tip: { type: "string" } }, required: ["focus", "morningTask", "eveningTask", "tip"] },
                      day7: { type: "object", properties: { focus: { type: "string" }, morningTask: { type: "string" }, eveningTask: { type: "string" }, tip: { type: "string" } }, required: ["focus", "morningTask", "eveningTask", "tip"] },
                    },
                    required: ["day1", "day2", "day3", "day4", "day5", "day6", "day7"]
                  },
                  encouragement: { type: "string", description: "A warm, personalized encouragement message (2-3 sentences)" },
                  focusAreas: { type: "array", items: { type: "string" }, description: "3 main focus areas for this week" },
                  pdfs: { type: "array", items: { type: "string" }, description: "Recommended PDF resources" },
                  todayActions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        time: { type: "string", enum: ["morning", "evening"] },
                        action: { type: "string" },
                        duration: { type: "string" }
                      },
                      required: ["time", "action", "duration"]
                    }
                  },
                  spineScore: { type: "number", description: "Spine health score from 0-100 based on user data" }
                },
                required: ["weeklyPlan", "encouragement", "focusAreas", "todayActions", "spineScore"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_sleep_plan" } },
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received:', JSON.stringify(aiData).substring(0, 500));
    
    // Extract tool call arguments
    const parsed = parseToolCallResponse(aiData);

    // Save to database
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const { data: plan, error } = await supabase
      .from('coach_plans')
      .insert({
        email,
        plan_type: planType,
        sleep_plan: parsed.weeklyPlan,
        encouragement_message: parsed.encouragement,
        main_focus_this_week: parsed.focusAreas,
        recommended_pdfs: parsed.pdfs || ['Ergonomic Sleep Guide', 'Pain Relief Stretches'],
        recommended_actions_today: parsed.todayActions,
        whatsapp_messages: [],
        klaviyo_events: [],
        spine_health_score: parsed.spineScore,
        raw_ai_response: JSON.stringify(aiData),
        valid_until: validUntil.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Plan saved successfully:', plan.id);

    // Trigger Klaviyo events for email reminders
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
    if (KLAVIYO_PRIVATE_API_KEY && parsed.todayActions?.length > 0) {
      try {
        await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, 'RBN_SleepPlan_Created', {
          plan_type: planType,
          focus_areas: parsed.focusAreas?.join(', ') || '',
          encouragement: parsed.encouragement || '',
          spine_score: parsed.spineScore || 0,
          morning_task: parsed.todayActions.find((a: any) => a.time === 'morning')?.action || '',
          evening_task: parsed.todayActions.find((a: any) => a.time === 'evening')?.action || '',
          week_day1_focus: parsed.weeklyPlan?.day1?.focus || '',
          valid_until: validUntil.toISOString(),
        });
        console.log('Klaviyo event sent successfully');
      } catch (klaviyoError) {
        console.error('Failed to send Klaviyo events:', klaviyoError);
      }
    }

    // Generate and store Sleep Sync attributes after plan creation
    try {
      const sleepSyncAttrs = await generateSleepSyncAttributes(supabase, email, logs || [], trends, profile);
      const sleepSyncEvent = buildSleepSyncEvent(sleepSyncAttrs);
      
      // Store attributes
      await supabase
        .from('sleep_attributes_state')
        .upsert({
          email,
          data: sleepSyncAttrs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      // Also add to plan's klaviyo_events for later sending
      await supabase
        .from('coach_plans')
        .update({
          klaviyo_events: [sleepSyncEvent]
        })
        .eq('id', plan.id);

      // Send Sleep Sync event to Klaviyo
      if (KLAVIYO_PRIVATE_API_KEY) {
        await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, sleepSyncEvent.eventName, sleepSyncEvent.payload);
        console.log('Sleep Sync event sent to Klaviyo');
      }
    } catch (syncError) {
      console.error('Failed to generate Sleep Sync attributes:', syncError);
      // Non-blocking - don't fail the plan creation
    }

    return new Response(JSON.stringify({ success: true, plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in coach-generate-sleep-plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(planType: string, trends: TrendData): string {
  return `You are Rise by Night's AI Sleep Coach. Create a personalized 7-day sleep improvement plan for customers who purchased Rise By Night ergonomic pillows.

Your goal is to help users improve their sleep quality through:
1. Proper pillow positioning and sleep posture
2. Evening wind-down routines
3. Morning stretching to reduce stiffness
4. Temperature and environment optimization

Available Rise By Night Products:
- Rise By Night™ Ergonomic Sleep Pillow ($129.99) - Contoured memory foam for neck/back pain relief
- Rise By Night™ Ergonomic Knee Pillow ($69.99) - Memory foam for hip alignment
- Rise By Night™ Silk Deep Sleep Mask ($29.99) - Premium silk for light blocking

${planType === 'weekly_update' ? `
User's recent trends: ${JSON.stringify(trends)}
If improving, celebrate and maintain. If declining, offer gentle adjustments.
` : ''}

Create specific, actionable tasks. Morning tasks should take 5-10 minutes. Evening tasks should be relaxing pre-sleep activities.`;
}

function buildUserContext(profile: SleepProfile | null, logs: SleepLog[], trends: TrendData): string {
  if (!profile) return 'New user with no profile data. Create a general sleep improvement plan focused on pillow positioning and sleep hygiene.';
  
  return `User Profile:
- Sleep Position: ${profile.sleep_position}
- Pain Points: ${profile.pain_points?.join(', ') || 'None specified'}
- Temperature Preference: ${profile.temperature_preference}
- Stress Level: ${profile.stress_level}
- Wake Up Condition: ${profile.wake_up_condition}

Sleep Data (${logs.length} nights logged):
- Average Sleep Quality: ${trends.avgSleepQuality.toFixed(1)}/5
- Average Pain Level: ${trends.avgPain.toFixed(1)}/10
- Trend: ${trends.trend}
- Hot Nights: ${trends.hotNights}
- Stressed Nights: ${trends.stressedNights}

Create a personalized 7-day plan addressing their specific pain points and sleep position.`;
}

function calculateTrends(logs: SleepLog[]): TrendData {
  if (logs.length === 0) {
    return { avgSleepQuality: 3, avgPain: 5, trend: 'stable', hotNights: 0, stressedNights: 0, goodNights: 0, poorNights: 0 };
  }

  const avgSleepQuality = logs.reduce((sum, l) => sum + l.sleep_quality, 0) / logs.length;
  const avgPain = logs.reduce((sum, l) => sum + l.pain_level_morning, 0) / logs.length;
  const hotNights = logs.filter(l => l.felt_hot).length;
  const stressedNights = logs.filter(l => l.felt_stressed).length;
  const goodNights = logs.filter(l => l.sleep_quality >= 4).length;
  const poorNights = logs.filter(l => l.sleep_quality <= 2).length;

  const recentLogs = logs.slice(0, 7);
  const olderLogs = logs.slice(7, 14);
  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  
  if (olderLogs.length >= 3) {
    const recentAvg = recentLogs.reduce((s, l) => s + l.sleep_quality, 0) / recentLogs.length;
    const olderAvg = olderLogs.reduce((s, l) => s + l.sleep_quality, 0) / olderLogs.length;
    if (recentAvg - olderAvg > 0.5) trend = 'improving';
    else if (olderAvg - recentAvg > 0.5) trend = 'worsening';
  }

  return { avgSleepQuality, avgPain, trend, hotNights, stressedNights, goodNights, poorNights };
}

function parseToolCallResponse(aiData: any): any {
  try {
    // First, try to extract from tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
      console.log('Parsed tool call arguments:', JSON.stringify(args).substring(0, 300));
      
      // Validate it has the expected structure
      if (args.weeklyPlan && args.weeklyPlan.day1) {
        return args;
      }
    }
    
    // Fallback: try to extract from content (may be wrapped in markdown)
    const content = aiData.choices?.[0]?.message?.content;
    if (content) {
      // Strip markdown code blocks
      let cleanContent = content;
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (content.includes('```')) {
        cleanContent = content.replace(/```\s*/g, '');
      }
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Parsed content JSON:', Object.keys(parsed).join(', '));
        
        // Check if it has expected structure
        if (parsed.weeklyPlan && parsed.weeklyPlan.day1) {
          return parsed;
        }
        
        // AI returned different structure - extract what we can for notes
        console.log('AI returned non-standard format, using default plan with AI notes');
      }
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  
  // Return default plan if parsing fails or AI returned different format
  return getDefaultPlan();
}

function getDefaultPlan() {
  return {
    weeklyPlan: {
      day1: { focus: "Pillow Setup", morningTask: "Check your pillow height - it should keep your neck aligned with your spine", eveningTask: "Position your pillow in the cervical curve of your neck before sleep", tip: "Side sleepers need a higher pillow than back sleepers" },
      day2: { focus: "Sleep Posture", morningTask: "Notice which position you woke up in", eveningTask: "Try sleeping on your back with pillow under your knees", tip: "Back sleeping reduces facial wrinkles and neck strain" },
      day3: { focus: "Evening Routine", morningTask: "5 gentle neck stretches upon waking", eveningTask: "Wind down 30 minutes before bed - no screens", tip: "Blue light suppresses melatonin production" },
      day4: { focus: "Temperature", morningTask: "Rate your sleep temperature 1-10", eveningTask: "Keep bedroom at 65-68°F (18-20°C)", tip: "A cool room promotes deeper sleep stages" },
      day5: { focus: "Pain Prevention", morningTask: "Shoulder rolls and neck rotations (2 min)", eveningTask: "Light stretching before bed to release tension", tip: "Tension in muscles builds up throughout the day" },
      day6: { focus: "Deep Sleep", morningTask: "Avoid caffeine after 2 PM today", eveningTask: "Try a 10-minute meditation or breathing exercise", tip: "Caffeine has a 6-hour half-life in your system" },
      day7: { focus: "Review & Adjust", morningTask: "Log how you feel compared to day 1", eveningTask: "Plan adjustments for next week", tip: "Consistency is key - stick with what works" }
    },
    encouragement: "Welcome to your personalized sleep improvement journey with Rise By Night! Small daily changes lead to big improvements in sleep quality. You've got this!",
    focusAreas: ['Pillow Positioning', 'Sleep Hygiene', 'Pain Prevention'],
    pdfs: ['Ergonomic Sleep Guide', 'Pain Relief Stretches'],
    todayActions: [
      { time: 'morning', action: 'Check pillow height and adjust for your sleep position', duration: '5 min' },
      { time: 'evening', action: 'Position pillow in cervical curve, wind down 30 min before bed', duration: '10 min' }
    ],
    spineScore: 65,
  };
}

async function sendKlaviyoEvent(apiKey: string, email: string, eventName: string, properties: Record<string, any>) {
  const response = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'Content-Type': 'application/json',
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          metric: { data: { type: 'metric', attributes: { name: eventName } } },
          profile: { data: { type: 'profile', attributes: { email } } },
          properties,
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Klaviyo API error: ${errorText}`);
  }

  return response;
}

// Sleep Sync helper functions
function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

async function generateSleepSyncAttributes(
  supabase: any,
  email: string,
  logs: SleepLog[],
  trends: TrendData,
  profile: SleepProfile | null
): Promise<SleepSyncAttributes> {
  const now = new Date();
  
  // Get engagement meta
  const { data: engagementMeta } = await supabase
    .from('engagement_meta')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  // Get coach plans count
  const { data: plans } = await supabase
    .from('coach_plans')
    .select('id, created_at')
    .eq('email', email);

  const logs7d = logs.filter(l => daysBetween(new Date(l.date), now) <= 7);
  const logs14d = logs.filter(l => daysBetween(new Date(l.date), now) <= 14);

  const stressedNights7d = logs7d.filter(l => l.felt_stressed).length;
  const stressedNights14d = logs14d.filter(l => l.felt_stressed).length;
  const hotNights7d = logs7d.filter(l => l.felt_hot).length;
  const hotNights14d = logs14d.filter(l => l.felt_hot).length;

  const sleepStressLevel: Level3 = stressedNights14d >= 4 ? "high" : stressedNights14d >= 2 ? "medium" : "low";
  const sleepTrend: Trend3 = trends.trend === 'improving' ? 'improving' : trends.trend === 'worsening' ? 'worsening' : 'stable';
  
  const lastLogDaysAgo = logs.length > 0 ? daysBetween(new Date(logs[0].date), now) : null;
  const logConsistency = Math.round((logs14d.length / 14) * 100);
  const streakDays = engagementMeta?.total_streak_days || 0;
  
  const ordersCount = profile?.purchase_count || 0;
  const purchaseStatus: "not_bought" | "bought_once" | "repeat_buyer" = ordersCount === 0 ? "not_bought" : ordersCount === 1 ? "bought_once" : "repeat_buyer";
  
  const engagementLevel: Level3 = logConsistency >= 60 ? "high" : logConsistency >= 30 ? "medium" : "low";
  const riskLevel: Level3 = sleepTrend === "worsening" || engagementLevel === "low" ? "high" : engagementLevel === "medium" ? "medium" : "low";

  return {
    email,
    sleep_stress_level: sleepStressLevel,
    sleep_trend: sleepTrend,
    pain_trend: trends.avgPain > 5 ? "worsening" : trends.avgPain < 3 ? "improving" : "stable",
    avg_sleep_quality_7d: calculateAvg(logs7d.map(l => l.sleep_quality / 2)),
    avg_sleep_quality_14d: calculateAvg(logs14d.map(l => l.sleep_quality / 2)),
    avg_pain_7d: calculateAvg(logs7d.map(l => l.pain_level_morning)),
    avg_pain_14d: calculateAvg(logs14d.map(l => l.pain_level_morning)),
    hot_nights_7d: hotNights7d,
    hot_nights_14d: hotNights14d,
    stressed_nights_7d: stressedNights7d,
    stressed_nights_14d: stressedNights14d,
    streak_days: streakDays,
    last_log_days_ago: lastLogDaysAgo,
    log_consistency_score: logConsistency,
    temperature_sensitive: hotNights14d >= 3,
    engagement_level: engagementLevel,
    last_dashboard_visit_days_ago: engagementMeta?.last_seen_at ? daysBetween(new Date(engagementMeta.last_seen_at), now) : null,
    last_whatsapp_interaction_days_ago: engagementMeta?.last_whatsapp_nudge_at ? daysBetween(new Date(engagementMeta.last_whatsapp_nudge_at), now) : null,
    ai_coach_engagement_level: (plans?.length || 0) >= 3 ? "high" : (plans?.length || 0) >= 1 ? "medium" : "low",
    pdf_opens_last_30d: 0,
    email_opens_last_30d: 0,
    whatsapp_enabled: profile?.whatsapp_enabled || false,
    purchase_status: purchaseStatus,
    orders_count: ordersCount,
    days_since_last_order: profile?.delivery_date ? daysBetween(new Date(profile.delivery_date), now) : null,
    is_new_customer: profile?.delivery_date ? daysBetween(new Date(profile.delivery_date), now) <= 30 : false,
    has_returned_pillow: false,
    refund_risk_flag: sleepTrend === "worsening" && trends.avgPain >= 6,
    complaint_flag: false,
    app_usage_type: logs.length > 0 && (plans?.length || 0) > 0 ? "full_user" : logs.length > 0 ? "sleep_log_user" : profile ? "quiz_only" : "none",
    used_sleep_quiz: !!profile,
    used_sleep_plan: (plans?.length || 0) > 0,
    used_pillow_wizard: false,
    deep_sleep_supported: false,
    wearable_connected: false,
    risk_level: riskLevel,
    upsell_score: Math.min(100, (sleepTrend === "improving" ? 40 : 20) + (engagementLevel === "high" ? 40 : 20) + (ordersCount > 0 ? 20 : 0)),
    churn_risk_score: Math.min(100, (lastLogDaysAgo !== null && lastLogDaysAgo >= 14 ? 40 : 0) + (engagementLevel === "low" ? 30 : 0) + (sleepTrend === "worsening" ? 30 : 0)),
    affiliate_potential_score: Math.min(100, (sleepTrend === "improving" ? 35 : 10) + (engagementLevel === "high" ? 35 : 10) + (ordersCount >= 2 ? 30 : ordersCount >= 1 ? 15 : 0)),
    prefers_channel: profile?.whatsapp_enabled ? "whatsapp" : "email",
  };
}

function buildSleepSyncEvent(attrs: SleepSyncAttributes) {
  return {
    eventName: "RBN_SleepSync_Updated",
    payload: { ...attrs, source: "sleep_sync_v1", timestamp: new Date().toISOString() }
  };
}

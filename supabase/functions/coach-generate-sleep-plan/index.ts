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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { email, planType = 'initial' } = await req.json();

    console.log(`Generating ${planType} sleep plan for ${email}`);

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
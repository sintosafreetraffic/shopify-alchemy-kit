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
    const systemPrompt = planType === 'initial' 
      ? buildInitialPlanPrompt() 
      : buildWeeklyUpdatePrompt(trends);
    const userContext = buildUserContext(profile, logs || [], trends);

    // Call Lovable AI
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
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || '';
    console.log('AI response received:', content.substring(0, 200));
    
    const parsed = parseAIResponse(content);

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
        recommended_pdfs: parsed.pdfs,
        recommended_actions_today: parsed.todayActions,
        whatsapp_messages: parsed.whatsappMessages,
        klaviyo_events: parsed.klaviyoEvents,
        spine_health_score: parsed.spineScore,
        raw_ai_response: content,
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
        // Send "Sleep Plan Created" event with morning/evening tasks
        await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, 'RBN_SleepPlan_Created', {
          plan_type: planType,
          focus_areas: parsed.focusAreas?.join(', ') || '',
          encouragement: parsed.encouragement || '',
          spine_score: parsed.spineScore || 0,
          morning_task: parsed.todayActions.find((a: any) => a.time === 'morning')?.action || '',
          evening_task: parsed.todayActions.find((a: any) => a.time === 'evening')?.action || '',
          week_day1_focus: parsed.weeklyPlan?.day1?.focus || '',
          week_day1_morning: parsed.weeklyPlan?.day1?.morningTask || '',
          week_day1_evening: parsed.weeklyPlan?.day1?.eveningTask || '',
          valid_until: validUntil.toISOString(),
        });

        // Schedule morning reminder event
        const morningTask = parsed.todayActions.find((a: any) => a.time === 'morning');
        if (morningTask) {
          await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, 'RBN_Morning_Reminder', {
            task: morningTask.action,
            duration: morningTask.duration || '5 min',
            day_focus: parsed.weeklyPlan?.day1?.focus || 'Sleep Improvement',
            tip: parsed.weeklyPlan?.day1?.tip || '',
          });
        }

        // Schedule evening reminder event
        const eveningTask = parsed.todayActions.find((a: any) => a.time === 'evening');
        if (eveningTask) {
          await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, 'RBN_Evening_Reminder', {
            task: eveningTask.action,
            duration: eveningTask.duration || '10 min',
            day_focus: parsed.weeklyPlan?.day1?.focus || 'Sleep Improvement',
            tip: parsed.weeklyPlan?.day1?.tip || '',
          });
        }

        console.log('Klaviyo reminder events sent successfully');
      } catch (klaviyoError) {
        console.error('Failed to send Klaviyo events:', klaviyoError);
        // Don't fail the whole request if Klaviyo fails
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

function buildInitialPlanPrompt(): string {
  return `You are Rise by Night's AI Sleep Coach. Create a personalized 7-day sleep improvement plan for customers who purchased Rise By Night ergonomic pillows.

Available Rise By Night Products to recommend:
1. Rise By Night™ Ergonomic Sleep Pillow ($129.99) - Contoured memory foam for neck/back pain relief
2. Rise By Night™ Ergonomic Knee Pillow ($69.99) - Memory foam knee pillow for hip alignment
3. Rise By Night™ Silk Deep Sleep Mask ($29.99) - Premium silk sleep mask for light blocking

Return a JSON object with this exact structure:
{
  "weeklyPlan": {
    "day1": { "focus": "string", "morningTask": "string", "eveningTask": "string", "tip": "string" },
    "day2": { "focus": "string", "morningTask": "string", "eveningTask": "string", "tip": "string" },
    "day3": { "focus": "string", "morningTask": "string", "eveningTask": "string", "tip": "string" },
    "day4": { "focus": "string", "morningTask": "string", "eveningTask": "string", "tip": "string" },
    "day5": { "focus": "string", "morningTask": "string", "eveningTask": "string", "tip": "string" },
    "day6": { "focus": "string", "morningTask": "string", "eveningTask": "string", "tip": "string" },
    "day7": { "focus": "string", "morningTask": "string", "eveningTask": "string", "tip": "string" }
  },
  "encouragement": "A warm, personalized encouragement message (2-3 sentences)",
  "focusAreas": ["area1", "area2", "area3"],
  "pdfs": ["Ergonomic Sleep Guide", "Pain Relief Stretches"],
  "todayActions": [
    { "time": "morning", "action": "string", "duration": "5 min" },
    { "time": "evening", "action": "string", "duration": "10 min" }
  ],
  "whatsappMessages": ["Morning check-in message", "Evening reminder message"],
  "klaviyoEvents": [{ "event": "RBN_SleepPlan_Created", "properties": {} }],
  "spineScore": 65
}`;
}

function buildWeeklyUpdatePrompt(trends: TrendData): string {
  return `You are Rise by Night's AI Sleep Coach. Update the sleep plan based on progress.

Recent trends: ${JSON.stringify(trends)}

Return the same JSON structure as the initial plan, but adapted to the user's progress. If they're improving, celebrate and suggest maintaining habits. If declining, offer gentle support and adjustments.`;
}

function buildUserContext(profile: SleepProfile | null, logs: SleepLog[], trends: TrendData): string {
  if (!profile) return 'New user with no profile data yet. Create a general sleep improvement plan.';
  
  return `User Profile:
- Sleep Position: ${profile.sleep_position}
- Pain Points: ${profile.pain_points?.join(', ') || 'None specified'}
- Temperature Preference: ${profile.temperature_preference}
- Stress Level: ${profile.stress_level}
- Wake Up Condition: ${profile.wake_up_condition}

Recent Sleep Data (${logs.length} nights):
- Average Sleep Quality: ${trends.avgSleepQuality.toFixed(1)}/5
- Average Pain Level: ${trends.avgPain.toFixed(1)}/10
- Trend: ${trends.trend}
- Hot Nights: ${trends.hotNights}
- Stressed Nights: ${trends.stressedNights}
- Good Nights (4-5 quality): ${trends.goodNights}
- Poor Nights (1-2 quality): ${trends.poorNights}

Create a personalized plan based on this data.`;
}

function calculateTrends(logs: SleepLog[]): TrendData {
  if (logs.length === 0) {
    return { avgSleepQuality: 0, avgPain: 0, trend: 'stable', hotNights: 0, stressedNights: 0, goodNights: 0, poorNights: 0 };
  }

  const avgSleepQuality = logs.reduce((sum, l) => sum + l.sleep_quality, 0) / logs.length;
  const avgPain = logs.reduce((sum, l) => sum + l.pain_level_morning, 0) / logs.length;
  const hotNights = logs.filter(l => l.felt_hot).length;
  const stressedNights = logs.filter(l => l.felt_stressed).length;
  const goodNights = logs.filter(l => l.sleep_quality >= 4).length;
  const poorNights = logs.filter(l => l.sleep_quality <= 2).length;

  // Calculate trend
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

function parseAIResponse(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  
  return {
    weeklyPlan: {},
    encouragement: 'Welcome to your sleep improvement journey with Rise By Night!',
    focusAreas: ['Sleep Quality', 'Pain Management'],
    pdfs: ['Getting Started Guide'],
    todayActions: [],
    whatsappMessages: [],
    klaviyoEvents: [],
    spineScore: 50,
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

  console.log(`Klaviyo event "${eventName}" sent for ${email}`);
  return response;
}

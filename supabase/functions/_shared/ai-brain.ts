/**
 * AI Brain - Centralized AI helper for all Sleep Coach AI calls
 * 
 * All AI-generated content goes through this single helper.
 * Numerical logic (streaks, averages, trends, scores, purchase status) is NEVER AI-generated.
 * 
 * Uses OpenAI API with the project's own OPENAI_API_KEY.
 * Default model: gpt-4o-mini for short tips
 * Deep reasoning: gpt-4o for complex analysis
 */

import {
  SleepCoachPromptInput,
  SleepCoachOutput,
  SleepProfile,
  SleepAttributes,
  SleepLog,
} from "./types.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Brand guidelines for AI responses
const BRAND_GUIDELINES = `
BRAND VOICE:
- Warm, supportive, and encouraging
- Use "you" language, make it personal
- Celebrate small wins
- Be specific and actionable
- Never diagnose medical conditions
- Always recommend consulting a doctor for persistent pain
- Reference Rise By Night products naturally when relevant

PRODUCT KNOWLEDGE:
- Rise By Night™ Ergonomic Sleep Pillow ($129.99) - Contoured memory foam for neck/back pain relief
- Rise By Night™ Ergonomic Knee Pillow ($69.99) - Memory foam for hip alignment
- Rise By Night™ Silk Deep Sleep Mask ($29.99) - Premium silk for light blocking
- Rise By Night™ Complete Sleep Bundle ($149.99) - All three products

RESTRICTIONS:
- NEVER provide medical diagnoses
- NEVER recommend medication
- NEVER make claims that cannot be backed by the product
- ALWAYS encourage professional medical advice for persistent issues
`;

// Extended modes including product_recommendation
export type AIMode = "sleep_plan" | "weekly_summary" | "whatsapp_tip" | "pdf_context" | "product_recommendation";

interface AIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

const MODEL_CONFIGS: Record<AIMode, AIModelConfig> = {
  sleep_plan: { model: "gpt-4o", temperature: 0.7, maxTokens: 2000 },
  weekly_summary: { model: "gpt-4o-mini", temperature: 0.6, maxTokens: 1000 },
  whatsapp_tip: { model: "gpt-4o-mini", temperature: 0.7, maxTokens: 300 },
  pdf_context: { model: "gpt-4o-mini", temperature: 0.5, maxTokens: 500 },
  product_recommendation: { model: "gpt-4o-mini", temperature: 0.6, maxTokens: 800 },
};

function buildSystemPrompt(mode: AIMode): string {
  const basePrompt = `You are Rise By Night's AI Sleep Coach. ${BRAND_GUIDELINES}`;
  
  switch (mode) {
    case "sleep_plan":
      return `${basePrompt}

Create a personalized 7-day sleep improvement plan. Focus on:
1. Proper pillow positioning and sleep posture
2. Evening wind-down routines
3. Morning stretching to reduce stiffness
4. Temperature and environment optimization

Return a structured JSON response with:
- weeklyPlan (day1-day7, each with focus, morningTask, eveningTask, tip)
- encouragement (2-3 warm sentences)
- focusAreas (3 main focus areas)
- todayActions (morning and evening actions with duration)
- spineScore (0-100 based on user data)`;

    case "weekly_summary":
      return `${basePrompt}

Write a brief weekly summary of the user's sleep progress. Include:
1. Key improvements or concerns
2. Encouragement based on their data
3. One specific tip for next week
Keep it under 150 words.`;

    case "whatsapp_tip":
      return `${basePrompt}

Write a brief, friendly WhatsApp message (max 2-3 sentences). Be conversational and supportive.
The message should be personalized based on the user's recent sleep data.`;

    case "pdf_context":
      return `${basePrompt}

Write a brief introduction for a sleep improvement PDF. It should be personalized based on the user's profile.
Keep it under 100 words.`;

    case "product_recommendation":
      return `You are a sleep health expert for RiseByNight. Analyze quiz responses and recommend products.

Available Products:
1. Rise By Night™ Ergonomic Sleep Pillow ($129.99) - Contoured memory foam for neck/back pain relief, ideal for side and back sleepers
2. Rise By Night™ Ergonomic Knee Pillow ($69.99) - Memory foam for hip alignment, great for side sleepers with lower back pain
3. Rise By Night™ Silk Deep Sleep Mask ($29.99) - Premium silk for light blocking, helps with light sensitivity
4. Rise By Night™ Complete Sleep Bundle ($149.99) - All three products bundled at a discount

Return ONLY valid JSON (no markdown, no code blocks):
{
  "assessment": "Personalized assessment of their sleep needs (2-3 sentences)",
  "recommendations": [
    { "product": "Full Product Name", "reason": "Why it helps their specific issues", "priority": "high|medium|low" }
  ],
  "bundleRecommended": true/false,
  "bundleReason": "Why bundle helps (if recommended)"
}`;
  }
}

function buildUserContext(input: SleepCoachPromptInput): string {
  const { userProfile, attributes, logs, context } = input;
  
  let contextStr = "";

  if (userProfile) {
    contextStr += `USER PROFILE:
- Sleep Position: ${userProfile.sleep_position}
- Pain Points: ${userProfile.pain_points?.join(", ") || "None specified"}
- Temperature Preference: ${userProfile.temperature_preference || "neutral"}
- Stress Level: ${userProfile.stress_level || "medium"}
- Wake Up Condition: ${userProfile.wake_up_condition || "neutral"}
- Products Owned: ${userProfile.products_owned?.join(", ") || "None yet"}
`;
  }

  if (attributes) {
    contextStr += `
SLEEP METRICS (deterministic, pre-calculated):
- Sleep Trend: ${attributes.sleep_trend}
- Pain Trend: ${attributes.pain_trend}
- Avg Sleep Quality (7d): ${attributes.avg_sleep_quality_7d ?? "No data"}
- Avg Pain (7d): ${attributes.avg_pain_7d ?? "No data"}
- Streak Days: ${attributes.streak_days}
- Engagement Level: ${attributes.engagement_level}
- Hot Nights (7d): ${attributes.hot_nights_7d}
- Stressed Nights (7d): ${attributes.stressed_nights_7d}
`;
  }

  if (logs && logs.length > 0) {
    const recentLogs = logs.slice(0, 7);
    contextStr += `
RECENT SLEEP LOGS (${recentLogs.length} nights):
${recentLogs.map(l => `- ${l.date}: Quality ${l.sleep_quality}/10, Pain ${l.pain_level_morning}/10${l.felt_hot ? ", Hot" : ""}${l.felt_stressed ? ", Stressed" : ""}`).join("\n")}
`;
  }

  if (context) {
    contextStr += `
ADDITIONAL CONTEXT:
${JSON.stringify(context, null, 2)}
`;
  }

  if (!contextStr.trim()) {
    contextStr = "New user with no profile data. Create general sleep improvement content.";
  }

  return contextStr;
}

/**
 * Call the AI Brain for sleep coaching content
 * 
 * @param input - The prompt input including mode, profile, attributes, logs
 * @returns AI-generated coaching content
 */
export async function callSleepCoachAI(input: SleepCoachPromptInput): Promise<SleepCoachOutput> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not configured");
    throw new Error("AI service not configured");
  }

  const mode = input.mode as AIMode;
  const config = MODEL_CONFIGS[mode];
  const systemPrompt = buildSystemPrompt(mode);
  const userContext = buildUserContext(input);

  console.log(`[AI Brain] Mode: ${mode}, Model: ${config.model}`);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Brain] OpenAI error: ${response.status} - ${errorText}`);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log(`[AI Brain] Response received, length: ${content.length}`);

    // Try to parse as JSON for structured responses
    let structured: Record<string, any> | undefined;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structured = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Not JSON, that's fine for text responses
    }

    return {
      text: content,
      structured,
      metadata: {
        model: config.model,
        mode: input.mode,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error(`[AI Brain] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a WhatsApp micro-tip
 */
export async function generateWhatsAppTip(
  profile: SleepProfile | null,
  attributes: SleepAttributes | null,
  logs: SleepLog[],
  tipType: "morning_checkin" | "micro_tip" | "celebration" | "streak_reminder"
): Promise<string> {
  const contextMap = {
    morning_checkin: { type: "morning check-in", focus: "How did you sleep? Encourage logging." },
    micro_tip: { type: "quick tip", focus: "One actionable sleep improvement tip." },
    celebration: { type: "celebration", focus: "Celebrate their streak or improvement!" },
    streak_reminder: { type: "streak reminder", focus: "Encourage them to log tonight to keep streak." },
  };

  const result = await callSleepCoachAI({
    mode: "whatsapp_tip",
    userProfile: profile,
    attributes,
    logs,
    context: contextMap[tipType],
  });

  return result.text;
}

/**
 * Analyze sleep quiz and recommend products
 */
export async function analyzeQuizForRecommendations(
  quizAnswers: {
    sleepPosition: string;
    painPoints: string[];
    pillowIssues: string[];
    sleepGoals: string[];
  }
): Promise<{
  assessment: string;
  recommendations: Array<{ product: string; reason: string; priority: string }>;
  bundleRecommended: boolean;
  bundleReason: string;
}> {
  const userPrompt = `Sleep Quiz Responses:
Sleep Position: ${quizAnswers.sleepPosition}
Pain Points: ${quizAnswers.painPoints.join(", ") || "None"}
Pillow Issues: ${quizAnswers.pillowIssues.join(", ") || "None"}
Sleep Goals: ${quizAnswers.sleepGoals.join(", ") || "None"}`;

  const result = await callSleepCoachAI({
    mode: "product_recommendation" as any,
    userProfile: null,
    attributes: null,
    logs: [],
    context: { quizAnswers, userPrompt },
  });

  // Return structured result or fallback
  if (result.structured) {
    return {
      assessment: result.structured.assessment || "Based on your responses, we have personalized recommendations for you.",
      recommendations: result.structured.recommendations || [],
      bundleRecommended: result.structured.bundleRecommended || false,
      bundleReason: result.structured.bundleReason || "",
    };
  }

  // Fallback if parsing fails
  return {
    assessment: "Based on your sleep preferences, we recommend our ergonomic pillow collection to help improve your sleep quality.",
    recommendations: [
      { product: "Rise By Night™ Ergonomic Sleep Pillow", reason: "Ideal for proper neck support", priority: "high" }
    ],
    bundleRecommended: false,
    bundleReason: "",
  };
}

/**
 * Call AI for sleep plan with tool calling (structured output)
 */
export async function callSleepPlanAI(
  userContext: string,
  planType: string = "initial"
): Promise<{
  weeklyPlan: any;
  encouragement: string;
  focusAreas: string[];
  pdfs: string[];
  todayActions: any[];
  spineScore: number;
}> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const systemPrompt = `You are Rise by Night's AI Sleep Coach. Create a personalized 7-day sleep improvement plan for customers who purchased Rise By Night ergonomic pillows.

Your goal is to help users improve their sleep quality through:
1. Proper pillow positioning and sleep posture
2. Evening wind-down routines
3. Morning stretching to reduce stiffness
4. Temperature and environment optimization

${BRAND_GUIDELINES}

${planType === 'weekly_update' ? 'This is a weekly update. If improving, celebrate and maintain. If declining, offer gentle adjustments.' : ''}

Create specific, actionable tasks. Morning tasks should take 5-10 minutes. Evening tasks should be relaxing pre-sleep activities.`;

  console.log(`[AI Brain] Sleep Plan - Model: gpt-4o, Type: ${planType}`);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContext }
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI Brain] Sleep Plan error: ${response.status} - ${errorText}`);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract tool call arguments
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const args = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments) 
      : toolCall.function.arguments;
    
    console.log('[AI Brain] Sleep plan parsed successfully');
    
    if (args.weeklyPlan && args.weeklyPlan.day1) {
      return {
        weeklyPlan: args.weeklyPlan,
        encouragement: args.encouragement || "",
        focusAreas: args.focusAreas || [],
        pdfs: args.pdfs || ['Ergonomic Sleep Guide', 'Pain Relief Stretches'],
        todayActions: args.todayActions || [],
        spineScore: args.spineScore || 65,
      };
    }
  }

  // Fallback: try content parsing
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.weeklyPlan) {
          return {
            weeklyPlan: parsed.weeklyPlan,
            encouragement: parsed.encouragement || "",
            focusAreas: parsed.focusAreas || [],
            pdfs: parsed.pdfs || ['Ergonomic Sleep Guide', 'Pain Relief Stretches'],
            todayActions: parsed.todayActions || [],
            spineScore: parsed.spineScore || 65,
          };
        }
      }
    } catch {
      // Fallback to default
    }
  }

  // Return default plan
  return getDefaultSleepPlan();
}

function getDefaultSleepPlan() {
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

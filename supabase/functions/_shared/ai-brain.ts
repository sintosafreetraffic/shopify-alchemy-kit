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

interface AIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

const MODEL_CONFIGS: Record<SleepCoachPromptInput["mode"], AIModelConfig> = {
  sleep_plan: { model: "gpt-4o", temperature: 0.7, maxTokens: 2000 },
  weekly_summary: { model: "gpt-4o-mini", temperature: 0.6, maxTokens: 1000 },
  whatsapp_tip: { model: "gpt-4o-mini", temperature: 0.7, maxTokens: 300 },
  pdf_context: { model: "gpt-4o-mini", temperature: 0.5, maxTokens: 500 },
};

function buildSystemPrompt(mode: SleepCoachPromptInput["mode"]): string {
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

  if (logs.length > 0) {
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

  const config = MODEL_CONFIGS[input.mode];
  const systemPrompt = buildSystemPrompt(input.mode);
  const userContext = buildUserContext(input);

  console.log(`[AI Brain] Mode: ${input.mode}, Model: ${config.model}`);

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

/**
 * AI Brain - Centralized AI helper for all Sleep Coach AI calls
 * 
 * All AI-generated content goes through this single helper.
 * Numerical logic (streaks, averages, trends, scores, purchase status) is NEVER AI-generated.
 * 
 * Uses OpenAI API with the project's own OPENAI_API_KEY.
 * Models:
 * - sleep_plan: gpt-4o (deep reasoning)
 * - weekly_summary: gpt-4o-mini
 * - whatsapp_tip: gpt-4o-mini
 * - pdf_context: gpt-4o-mini
 * - product_recommendation: gpt-4o-mini
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

// Model configuration per mode
const MODEL_CONFIGS: Record<AIMode, AIModelConfig> = {
  sleep_plan: { model: "gpt-4o", temperature: 0.7, maxTokens: 2000 },
  weekly_summary: { model: "gpt-4o-mini", temperature: 0.6, maxTokens: 1000 },
  whatsapp_tip: { model: "gpt-4o-mini", temperature: 0.7, maxTokens: 300 },
  pdf_context: { model: "gpt-4o-mini", temperature: 0.5, maxTokens: 500 },
  product_recommendation: { model: "gpt-4o-mini", temperature: 0.6, maxTokens: 800 },
};

// Static fallback messages for WhatsApp tips
const WHATSAPP_FALLBACK_MESSAGES: Record<string, string> = {
  morning_checkin: "Good morning! How did you sleep last night? Take a moment to log your sleep and track your progress. 🌅",
  micro_tip: "Quick tip: Try positioning your pillow to support the natural curve of your neck. Small adjustments can make a big difference! 💤",
  celebration: "Amazing progress! Keep up the great work with your sleep routine. You're doing fantastic! 🎉",
  streak_reminder: "Don't forget to log your sleep tonight to keep your streak going! Consistency is key. ✨",
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
The message should be personalized based on the user's recent sleep data.
Do not use emojis excessively. One emoji max.`;

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

CRITICAL: Return ONLY valid JSON with no markdown formatting, no code blocks, no backticks.
The response must start with { and end with }

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

/**
 * Build user context string from input data
 */
export function buildUserContext(input: SleepCoachPromptInput): string {
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
 */
export async function callSleepCoachAI(input: SleepCoachPromptInput): Promise<SleepCoachOutput> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!apiKey) {
    console.error("[AI Brain] OPENAI_API_KEY is not configured");
    throw new Error("AI service not configured - OPENAI_API_KEY missing");
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
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structured = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.log("[AI Brain] Response is not JSON, using as text");
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
 * Generate a WhatsApp micro-tip with fallback
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

  try {
    const result = await callSleepCoachAI({
      mode: "whatsapp_tip",
      userProfile: profile,
      attributes,
      logs,
      context: contextMap[tipType],
    });

    return result.text.trim();
  } catch (error) {
    console.error("[AI Brain] WhatsApp tip error, using fallback:", error);
    return WHATSAPP_FALLBACK_MESSAGES[tipType] || WHATSAPP_FALLBACK_MESSAGES.micro_tip;
  }
}

// Interface for quiz scores
export interface QuizScores {
  alignmentScore: number;
  environmentScore: number;
  consistencyScore: number;
}

// Interface for extended quiz analysis result
export interface QuizAnalysisResult {
  assessment: string;
  recommendations: Array<{ product: string; reason: string; priority: string }>;
  bundleRecommended: boolean;
  bundleReason: string;
  // Extended fields
  detectedIssues?: string[];
  alignmentInsights?: string[];
  scores?: QuizScores;
  expertSummary?: string;
}

/**
 * Calculate deterministic quiz scores from answers
 */
export function calculateQuizScores(quizAnswers: Record<string, any>): QuizScores {
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;
  const roomBrightness = quizAnswers.roomBrightness || "";
  const roomNoise = quizAnswers.roomNoise || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const sleepLatency = quizAnswers.sleepLatency || "";
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const movesOften = quizAnswers.movesOften || "";

  // Alignment score (based on pain, pillow satisfaction, movement)
  let alignmentScore = 100;
  alignmentScore -= (painAreas.filter((p: string) => p !== "none").length) * 12;
  alignmentScore -= (10 - pillowSatisfaction) * 5;
  if (movesOften === "often") alignmentScore -= 15;
  if (movesOften === "always") alignmentScore -= 25;

  // Environment score
  let environmentScore = 100;
  if (roomBrightness === "bright") environmentScore -= 25;
  if (roomBrightness === "dim") environmentScore -= 10;
  if (roomNoise === "noisy") environmentScore -= 20;
  if (roomNoise === "some") environmentScore -= 8;
  if (sleepTemperature === "hot") environmentScore -= 20;
  if (sleepTemperature === "cold") environmentScore -= 10;

  // Consistency score
  let consistencyScore = 100;
  if (sleepLatency === "slow") consistencyScore -= 20;
  if (sleepLatency === "very_slow") consistencyScore -= 35;
  if (nightAwakenings === "twice") consistencyScore -= 20;
  if (nightAwakenings === "frequently") consistencyScore -= 35;

  return {
    alignmentScore: Math.max(0, Math.min(100, alignmentScore)),
    environmentScore: Math.max(0, Math.min(100, environmentScore)),
    consistencyScore: Math.max(0, Math.min(100, consistencyScore)),
  };
}

/**
 * Derive clinical issues from quiz answers (deterministic)
 */
export function deriveQuizIssues(quizAnswers: Record<string, any>): string[] {
  const issues: string[] = [];
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const pillowCount = quizAnswers.pillowCount || "";
  const mattressFirmness = quizAnswers.mattressFirmness || "";
  const sleepPosition = quizAnswers.sleepPosition || "";
  const movesOften = quizAnswers.movesOften || "";
  const roomBrightness = quizAnswers.roomBrightness || "";
  const sleepTemperature = quizAnswers.sleepTemperature || "";
  const nightAwakenings = quizAnswers.nightAwakenings || "";
  const pillowSatisfaction = quizAnswers.pillowSatisfaction ?? 5;

  // Pain-related issues
  if (painAreas.includes("neck")) {
    issues.push("Cervical strain risk from inadequate neck support");
  }
  if (painAreas.includes("shoulders")) {
    issues.push("Shoulder pressure points not properly addressed");
  }
  if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    issues.push("Spinal misalignment during sleep affecting lower body");
  }

  // Pillow-related issues
  if (pillowCount === "2" || pillowCount === "3") {
    issues.push("Multiple pillows indicating incorrect pillow height");
  }
  if (pillowSatisfaction <= 4) {
    issues.push("Current pillow not meeting support requirements");
  }

  // Position + mattress issues
  if (sleepPosition === "side" && mattressFirmness === "soft") {
    issues.push("Soft mattress + side sleeping may create neck–shoulder gap issues");
  }
  if (movesOften === "often" || movesOften === "always") {
    issues.push("Frequent position changes suggesting comfort or support issues");
  }

  // Environment / Light issues - add appropriate severity based on brightness level
  // Check for duplicates before adding (case-insensitive)
  const hasLightIssue = issues.some(i => i.toLowerCase().includes("light"));
  if (!hasLightIssue) {
    if (roomBrightness === "bright") {
      issues.push("Light exposure may be reducing deep sleep quality");
    } else if (roomBrightness === "dim") {
      issues.push("Light exposure may be slightly reducing deep sleep quality");
    }
  }

  if (sleepTemperature === "hot") {
    issues.push("Sleep temperature affecting sleep continuity");
  }
  if (nightAwakenings === "twice" || nightAwakenings === "frequently") {
    issues.push("Frequent night awakenings fragmenting sleep cycles");
  }

  return issues.slice(0, 5);
}

/**
 * Generate expert summary from quiz data (deterministic)
 */
export function generateExpertSummary(quizAnswers: Record<string, any>, scores: QuizScores): string {
  const sleepPosition = quizAnswers.sleepPosition || "combination";
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];
  const hasPain = painAreas.some((p: string) => p !== "none");
  
  const positionText = sleepPosition === "side" ? "side sleeper" : 
                       sleepPosition === "back" ? "back sleeper" : 
                       sleepPosition === "stomach" ? "stomach sleeper" : "combination sleeper";
  
  let summary = `As a ${positionText}`;
  
  if (hasPain) {
    const mainPain = painAreas.find((p: string) => p !== "none") || "discomfort";
    summary += ` experiencing ${mainPain.replace("_", " ")} issues`;
  }
  
  summary += ", your current sleep setup";
  
  if (scores.alignmentScore < 60) {
    summary += " shows significant alignment concerns that may be contributing to discomfort.";
  } else if (scores.alignmentScore < 80) {
    summary += " has room for improvement in spinal alignment.";
  } else {
    summary += " has good foundational alignment.";
  }
  
  if (scores.environmentScore < 70) {
    summary += " Your sleep environment may also be affecting deep sleep quality.";
  }
  
  return summary;
}

/**
 * Generate alignment insights (deterministic)
 */
export function generateAlignmentInsights(quizAnswers: Record<string, any>): string[] {
  const insights: string[] = [];
  const sleepPosition = quizAnswers.sleepPosition || "";
  const mattressFirmness = quizAnswers.mattressFirmness || "";
  const pillowCount = quizAnswers.pillowCount || "";
  const painAreas = quizAnswers.painAreas || quizAnswers.painPoints || [];

  if (sleepPosition === "side") {
    insights.push("Side sleepers need extra pillow height to fill the neck-shoulder gap");
    if (mattressFirmness === "soft") {
      insights.push("Softer mattresses cause more shoulder sinking, requiring height adjustment");
    }
  } else if (sleepPosition === "back") {
    insights.push("Back sleepers need moderate loft to maintain cervical curve");
  } else if (sleepPosition === "stomach") {
    insights.push("Stomach sleepers benefit from a flatter pillow to prevent neck extension");
  }

  if (pillowCount === "2" || pillowCount === "3") {
    insights.push("Using multiple pillows suggests your primary pillow lacks adequate support");
  }

  if (painAreas.includes("lower_back") || painAreas.includes("hips")) {
    insights.push("Lower body pain often indicates hip rotation during side sleeping");
  }

  return insights.slice(0, 3);
}

/**
 * Ensure mask recommendation is present when light issues are detected
 * This is a post-processing step to guarantee consistency
 */
function ensureMaskRecommendation(
  recommendations: Array<{ product: string; reason: string; priority: string }>,
  quizAnswers: Record<string, any>,
  scores: QuizScores,
  detectedIssues: string[]
): Array<{ product: string; reason: string; priority: string }> {
  const roomBrightness = quizAnswers.roomBrightness || "";
  const environmentScore = scores?.environmentScore ?? 100;
  
  // Check if light-related issue exists
  const hasLightIssue = 
    roomBrightness === "bright" ||
    roomBrightness === "dim" ||
    detectedIssues.some(i => i.toLowerCase().includes("light"));
  
  // Check if mask should be recommended
  if (hasLightIssue || environmentScore < 80) {
    // Check if mask is already recommended
    const alreadyRecommended = recommendations.some(
      r => r.product.toLowerCase().includes("silk deep sleep mask") || 
           r.product.toLowerCase().includes("sleep mask")
    );
    
    if (!alreadyRecommended) {
      const priority = (roomBrightness === "bright" || environmentScore < 70) ? "high" : "medium";
      
      const reason = hasLightIssue
        ? "Because you reported light exposure affecting your deep sleep"
        : "Your sleep environment could benefit from better light control";
      
      recommendations.push({
        product: "Rise By Night™ Silk Deep Sleep Mask",
        reason,
        priority
      });
      
      console.log("[AI Brain] Added mask recommendation due to light/environment issues");
    }
  }
  
  return recommendations;
}

/**
 * Analyze sleep quiz and recommend products with fallback
 */
export async function analyzeQuizForRecommendations(
  quizAnswers: Record<string, any>
): Promise<QuizAnalysisResult> {
  // Calculate deterministic values first
  const scores = calculateQuizScores(quizAnswers);
  const detectedIssues = deriveQuizIssues(quizAnswers);
  const expertSummary = generateExpertSummary(quizAnswers, scores);
  const alignmentInsights = generateAlignmentInsights(quizAnswers);

  const userPrompt = `Sleep Quiz Responses:
Sleep Position: ${quizAnswers.sleepPosition}
Pain Points: ${(quizAnswers.painAreas || quizAnswers.painPoints || []).join(", ") || "None"}
Pillow Issues: ${(quizAnswers.pillowIssues || quizAnswers.sleepEquipment || []).join(", ") || "None"}
Sleep Goals: ${(quizAnswers.sleepGoals || []).join(", ") || "None"}
Mattress Firmness: ${quizAnswers.mattressFirmness || "Unknown"}
Room Brightness: ${quizAnswers.roomBrightness || "Unknown"}
Night Awakenings: ${quizAnswers.nightAwakenings || "Unknown"}
Pillow Satisfaction: ${quizAnswers.pillowSatisfaction ?? 5}/10`;

  try {
    const result = await callSleepCoachAI({
      mode: "product_recommendation" as any,
      userProfile: null,
      attributes: null,
      logs: [],
      context: { quizAnswers, userPrompt },
    });

    // Validate structured result
    if (result.structured) {
      const s = result.structured;
      
      // Validate required fields exist
      if (s.assessment && Array.isArray(s.recommendations)) {
        let recommendations = s.recommendations.map((r: any) => ({
          product: String(r.product || "Rise By Night™ Ergonomic Sleep Pillow"),
          reason: String(r.reason || "Recommended for better sleep"),
          priority: String(r.priority || "high"),
        }));
        
        // Post-process: ensure mask is recommended when light issues detected
        recommendations = ensureMaskRecommendation(recommendations, quizAnswers, scores, detectedIssues);
        
        // Update bundle recommendation if we added a product
        const bundleRecommended = recommendations.length >= 2 || Boolean(s.bundleRecommended);
        const bundleReason = bundleRecommended 
          ? (s.bundleReason || "The Complete Sleep Bundle includes all our products at a discounted price.")
          : "";
        
        return {
          assessment: String(s.assessment),
          recommendations,
          bundleRecommended,
          bundleReason,
          // Add deterministic extended fields
          scores,
          detectedIssues,
          expertSummary,
          alignmentInsights,
        };
      }
    }

    // Log raw content if parsing failed
    console.error("[AI Brain] Quiz response validation failed, raw:", result.text.slice(0, 500));
  } catch (error) {
    console.error("[AI Brain] Quiz recommendation error:", error);
  }

  // Return safe fallback with extended fields
  console.log("[AI Brain] Using fallback quiz recommendation");
  const fallback = getDefaultQuizRecommendation(
    {
      sleepPosition: quizAnswers.sleepPosition || "",
      painPoints: quizAnswers.painAreas || quizAnswers.painPoints || [],
      pillowIssues: quizAnswers.pillowIssues || quizAnswers.sleepEquipment || [],
      sleepGoals: quizAnswers.sleepGoals || [],
    },
    {
      roomBrightness: quizAnswers.roomBrightness || "",
      environmentScore: scores.environmentScore,
      detectedIssues,
    }
  );
  return {
    ...fallback,
    scores,
    detectedIssues,
    expertSummary,
    alignmentInsights,
  };
}

/**
 * Default quiz recommendation fallback
 */
function getDefaultQuizRecommendation(
  quizAnswers: {
    sleepPosition: string;
    painPoints: string[];
    pillowIssues: string[];
    sleepGoals: string[];
  },
  options?: {
    roomBrightness?: string;
    environmentScore?: number;
    detectedIssues?: string[];
  }
) {
  const recommendations: Array<{ product: string; reason: string; priority: string }> = [];
  
  // Always recommend pillow
  recommendations.push({
    product: "Rise By Night™ Ergonomic Sleep Pillow",
    reason: "Provides optimal neck and spine alignment for better sleep quality",
    priority: "high"
  });

  // Add knee pillow for side sleepers or lower back pain
  const needsKneePillow = 
    quizAnswers.sleepPosition === "side" ||
    quizAnswers.painPoints.some(p => p.toLowerCase().includes("lower back") || p.toLowerCase().includes("hip"));
  
  if (needsKneePillow) {
    recommendations.push({
      product: "Rise By Night™ Ergonomic Knee Pillow",
      reason: "Helps maintain hip alignment and reduces lower back pressure for side sleepers",
      priority: "medium"
    });
  }

  // Determine if mask is needed based on multiple factors
  const roomBrightness = options?.roomBrightness || "";
  const environmentScore = options?.environmentScore ?? 100;
  const detectedIssues = options?.detectedIssues || [];
  
  const hasLightIssueFromEquipment = quizAnswers.pillowIssues.some(i => 
    i.toLowerCase().includes("light") || i.toLowerCase().includes("dark")
  );
  const hasLightIssueFromBrightness = roomBrightness === "bright" || roomBrightness === "dim";
  const hasLightIssueFromDetected = detectedIssues.some(i => i.toLowerCase().includes("light"));
  const hasLowEnvironmentScore = environmentScore < 80;
  
  const needsMask = hasLightIssueFromEquipment || hasLightIssueFromBrightness || hasLightIssueFromDetected || hasLowEnvironmentScore;
  
  if (needsMask) {
    // Determine priority based on severity
    const priority = (roomBrightness === "bright" || environmentScore < 70) ? "high" : "medium";
    
    // Build reason based on the detected issue
    let reason = "Blocks light for deeper, uninterrupted sleep";
    if (hasLightIssueFromBrightness || hasLightIssueFromDetected) {
      reason = "Because you reported light exposure affecting your deep sleep";
    } else if (hasLowEnvironmentScore) {
      reason = "Your sleep environment could benefit from better light control";
    }
    
    recommendations.push({
      product: "Rise By Night™ Silk Deep Sleep Mask",
      reason,
      priority
    });
  }

  return {
    assessment: "Based on your sleep preferences, we've identified products that can help improve your sleep quality and reduce discomfort.",
    recommendations,
    bundleRecommended: recommendations.length >= 2,
    bundleReason: recommendations.length >= 2 
      ? "The Complete Sleep Bundle includes all our products at a discounted price."
      : "",
  };
}

// Exported interface for snapshots used by plan generation
export interface ProfileSnapshot {
  sleep_position: string;
  pain_points: string[];
  temperature_preference: string;
  stress_level: string;
  wake_up_condition: string;
  products_owned: string[];
  quiz_completed_at?: string;
  // Layer 2: Environment fields (optional for backwards compatibility)
  mattress_firmness?: string;
  mattress_thickness?: string;
  bed_height?: string;
  co_sleeping?: string;
  bedding_material?: string;
  pillow_type?: string;
  room_brightness?: string;
  room_noise?: string;
}

export interface LogsSnapshot {
  nights_logged: number;
  avg_sleep_quality: number;
  avg_morning_pain: number;
  trend: 'improving' | 'stable' | 'worsening' | 'unknown';
  hot_nights: number;
  stressed_nights: number;
  good_nights: number;
  poor_nights: number;
  last_log_date?: string;
  // Layer 3: Dynamic state fields (optional for backwards compatibility)
  streak_days?: number;
  pain_trend?: 'improving' | 'stable' | 'worsening' | 'unknown';
  risk_level?: 'low' | 'medium' | 'high';
  engagement_level?: 'low' | 'medium' | 'high';
  sleep_stress_level?: 'low' | 'medium' | 'high';
  temperature_sensitive?: boolean;
  // Wearable data fields (from sleep_nights - Garmin, Apple Health, etc.)
  wearable_connected?: boolean;
  wearable_sources?: string[];
  wearable_avg_sleep_hours?: number | null;
  wearable_avg_efficiency?: number | null;
  wearable_avg_wake_events?: number | null;
  // Sleep architecture (from sleep_raw_events.stages) - Option A
  sleep_architecture?: {
    avgDeepPct: number | null;
    avgLightPct: number | null;
    avgRemPct: number | null;
    avgAwakePct: number | null;
    nightsAnalyzed: number;
  } | null;
  // Bedtime timing patterns (from sleep_nights) - Option B
  bedtime_patterns?: {
    avgBedtimeHour: number | null;
    avgBedtimeMinutes: number | null;
    consistencyScore: 'consistent' | 'moderate' | 'irregular' | null;
    variabilityMinutes: number | null;
  } | null;
  // === BASELINE VS RECENT SEPARATION (v1.1) ===
  // Baseline window: historical data for comparison (last 30 days excluding last 7)
  wearable_baseline?: {
    nightsAnalyzed: number;
    avgSleepHours: number | null;
    avgEfficiency: number | null;
    avgWakeEvents: number | null;
    avgDeepPct: number | null;
    avgLightPct: number | null;
    avgRemPct: number | null;
    avgBedtimeHour: number | null;
    consistencyScore: 'consistent' | 'moderate' | 'irregular' | null;
  } | null;
  // Recent window: current state for coaching (last 7 days)
  wearable_recent?: {
    nightsAnalyzed: number;
    avgSleepHours: number | null;
    avgEfficiency: number | null;
    avgWakeEvents: number | null;
    avgDeepPct: number | null;
    avgLightPct: number | null;
    avgRemPct: number | null;
    avgBedtimeHour: number | null;
    consistencyScore: 'consistent' | 'moderate' | 'irregular' | null;
  } | null;
}

/**
 * Build structured context for sleep plan that enforces hard constraints
 * Uses all 3 layers: Identity, Environment, and Dynamic State
 */
export function buildSleepPlanContext(
  profileSnapshot: ProfileSnapshot,
  logsSnapshot: LogsSnapshot,
  planType: string = "initial"
): string {
  const productsOwnedList = profileSnapshot.products_owned?.length > 0 
    ? profileSnapshot.products_owned.join(', ') 
    : 'None - user has not purchased any Rise By Night products yet';

  // Determine plan type based on data
  const isRecoveryPlan = logsSnapshot.avg_sleep_quality < 5 || logsSnapshot.avg_morning_pain >= 5;
  const hasNoLogs = logsSnapshot.nights_logged === 0;
  const isHighRisk = logsSnapshot.risk_level === 'high';
  const isLowRisk = logsSnapshot.risk_level === 'low';
  
  return `
=== LAYER 1: STATIC IDENTITY (DO NOT CONTRADICT) ===
sleep_position: ${profileSnapshot.sleep_position}
pain_points: ${profileSnapshot.pain_points?.join(', ') || 'None reported'}
stress_level: ${profileSnapshot.stress_level || 'medium'}
wake_up_condition: ${profileSnapshot.wake_up_condition || 'neutral'}
temperature_preference: ${profileSnapshot.temperature_preference || 'neutral'}
products_owned: [${productsOwnedList}]

=== LAYER 2: SLEEP ENVIRONMENT ===
mattress_firmness: ${profileSnapshot.mattress_firmness || 'medium'}
mattress_thickness: ${profileSnapshot.mattress_thickness || 'medium'}
bed_height: ${profileSnapshot.bed_height || 'standard'}
co_sleeping: ${profileSnapshot.co_sleeping || 'alone'}
bedding_material: ${profileSnapshot.bedding_material || 'cotton'}
pillow_type: ${profileSnapshot.pillow_type || 'standard'}
room_brightness: ${profileSnapshot.room_brightness || 'dark'}
room_noise: ${profileSnapshot.room_noise || 'quiet'}

=== LAYER 3: DYNAMIC STATE (LAST 7–14 DAYS) ===
nights_logged: ${logsSnapshot.nights_logged}
avg_sleep_quality: ${logsSnapshot.avg_sleep_quality?.toFixed?.(1) ?? logsSnapshot.avg_sleep_quality}/10
avg_morning_pain: ${logsSnapshot.avg_morning_pain?.toFixed?.(1) ?? logsSnapshot.avg_morning_pain}/10
sleep_trend: ${logsSnapshot.trend}
pain_trend: ${logsSnapshot.pain_trend || 'unknown'}
hot_nights: ${logsSnapshot.hot_nights}
stressed_nights: ${logsSnapshot.stressed_nights}
good_nights (7+): ${logsSnapshot.good_nights}
poor_nights (≤4): ${logsSnapshot.poor_nights}
streak_days: ${logsSnapshot.streak_days ?? 0}
engagement_level: ${logsSnapshot.engagement_level || 'low'}
risk_level: ${logsSnapshot.risk_level || 'low'}
temperature_sensitive: ${logsSnapshot.temperature_sensitive ?? false}
${logsSnapshot.last_log_date ? `last_log_date: ${logsSnapshot.last_log_date}` : ''}
${logsSnapshot.wearable_connected ? `
=== WEARABLE DATA (Objective Sleep Metrics) ===
wearable_sources: ${logsSnapshot.wearable_sources?.join(', ') || 'unknown'}
` : ''}
${logsSnapshot.wearable_baseline && logsSnapshot.wearable_baseline.nightsAnalyzed >= 3 ? `
=== WEARABLE BASELINE (historical pattern, NOT caused by us) ===
Based on ${logsSnapshot.wearable_baseline.nightsAnalyzed} nights of historical data:
- This is the user's BASELINE pattern before/around the current plan. Use it as REFERENCE ONLY.
- avg_sleep_duration: ${logsSnapshot.wearable_baseline.avgSleepHours ? `${logsSnapshot.wearable_baseline.avgSleepHours} hours` : 'No data'}
- avg_efficiency: ${logsSnapshot.wearable_baseline.avgEfficiency ? `${logsSnapshot.wearable_baseline.avgEfficiency}%` : 'No data'}
- avg_wake_events: ${logsSnapshot.wearable_baseline.avgWakeEvents ?? 'No data'}
- deep_sleep_pct: ${logsSnapshot.wearable_baseline.avgDeepPct !== null ? `${logsSnapshot.wearable_baseline.avgDeepPct}%` : 'No data'}
- bedtime_consistency: ${logsSnapshot.wearable_baseline.consistencyScore || 'unknown'}
NOTE: This baseline is for COMPARISON only. Never claim improvements are caused by RiseByNight products.
` : ''}
${logsSnapshot.wearable_recent && logsSnapshot.wearable_recent.nightsAnalyzed >= 1 ? `
=== WEARABLE RECENT (current state, primary coaching driver) ===
Based on ${logsSnapshot.wearable_recent.nightsAnalyzed} nights in the last 7 days:
- This is the user's CURRENT pattern. Base this week's actions on this data.
- avg_sleep_duration: ${logsSnapshot.wearable_recent.avgSleepHours ? `${logsSnapshot.wearable_recent.avgSleepHours} hours` : 'No data'}
- avg_efficiency: ${logsSnapshot.wearable_recent.avgEfficiency ? `${logsSnapshot.wearable_recent.avgEfficiency}%` : 'No data'}
- avg_wake_events: ${logsSnapshot.wearable_recent.avgWakeEvents ?? 'No data'}
- deep_sleep_pct: ${logsSnapshot.wearable_recent.avgDeepPct !== null ? `${logsSnapshot.wearable_recent.avgDeepPct}%` : 'No data'}
- bedtime_consistency: ${logsSnapshot.wearable_recent.consistencyScore || 'unknown'}
${logsSnapshot.wearable_recent.avgEfficiency && logsSnapshot.wearable_recent.avgEfficiency < 80 
  ? '- Sleep efficiency is LOW (<80%). Focus on reducing wake events and improving sleep continuity.' 
  : logsSnapshot.wearable_recent.avgEfficiency && logsSnapshot.wearable_recent.avgEfficiency >= 85 
  ? '- Sleep efficiency is GOOD (≥85%). User maintains sleep well once asleep.'
  : ''}
${logsSnapshot.wearable_recent.avgDeepPct !== null && logsSnapshot.wearable_recent.avgDeepPct < 15 
  ? '- Deep sleep is BELOW optimal (<15%). Focus on recovery and relaxation routines.' 
  : ''}
` : ''}
${logsSnapshot.wearable_baseline && logsSnapshot.wearable_recent && logsSnapshot.wearable_baseline.nightsAnalyzed >= 3 && logsSnapshot.wearable_recent.nightsAnalyzed >= 1 ? `
=== BASELINE VS RECENT COMPARISON ===
You may observe differences between baseline and recent patterns:
- Frame as: "Compared to your baseline..."
- NEVER claim: "Your sleep improved because of our products"
- If patterns are better: "Your recent nights are trending better than your baseline. We'll track if this continues."
- If patterns are worse: "Your recent nights show some variability compared to baseline. Let's focus on stabilization."
- If similar: "Your patterns are consistent with your baseline. This gives us a clear picture to work from."
CRITICAL: All improvements may be influenced by multiple factors (stress, schedule, travel, etc.). Never attribute to products.
` : logsSnapshot.wearable_connected && !logsSnapshot.wearable_baseline ? `
NOTE ON LIMITED DATA:
Wearable is connected but we don't have enough historical data for baseline comparison yet.
Frame as: "This is your baseline. We'll detect changes once new nights sync."
` : ''}
${logsSnapshot.sleep_architecture ? `
=== SLEEP ARCHITECTURE (Wearable Stage Data) ===
Based on ${logsSnapshot.sleep_architecture.nightsAnalyzed} nights of wearable sleep stage data:
- Deep sleep: ${logsSnapshot.sleep_architecture.avgDeepPct}% (target: 15-25% for adults)
- Light sleep: ${logsSnapshot.sleep_architecture.avgLightPct}%
- REM sleep: ${logsSnapshot.sleep_architecture.avgRemPct}% (target: 20-25% for adults)
- Awake time: ${logsSnapshot.sleep_architecture.avgAwakePct}%
${logsSnapshot.sleep_architecture.avgDeepPct !== null && logsSnapshot.sleep_architecture.avgDeepPct < 15 
  ? '- Deep sleep is BELOW optimal. Deep sleep is critical for physical recovery and immune function. Consider earlier wind-down routines and limiting alcohol/caffeine.' 
  : logsSnapshot.sleep_architecture.avgDeepPct !== null && logsSnapshot.sleep_architecture.avgDeepPct >= 20 
  ? '- Deep sleep is EXCELLENT. User is getting good restorative sleep.'
  : ''}
${logsSnapshot.sleep_architecture.avgRemPct !== null && logsSnapshot.sleep_architecture.avgRemPct < 15 
  ? '- REM sleep is BELOW optimal. REM is important for memory consolidation and emotional regulation. Stress management may help.' 
  : logsSnapshot.sleep_architecture.avgRemPct !== null && logsSnapshot.sleep_architecture.avgRemPct >= 20 
  ? '- REM sleep is GOOD. User is getting adequate dream sleep.'
  : ''}
NOTE: Use sleep architecture patterns to inform recommendations. Low deep sleep suggests recovery/relaxation focus. Low REM suggests stress management.
` : ''}
${logsSnapshot.bedtime_patterns ? `
=== BEDTIME TIMING PATTERNS ===
Average bedtime: ${logsSnapshot.bedtime_patterns.avgBedtimeHour !== null 
  ? `${logsSnapshot.bedtime_patterns.avgBedtimeHour.toString().padStart(2, '0')}:${(logsSnapshot.bedtime_patterns.avgBedtimeMinutes! % 60).toString().padStart(2, '0')}` 
  : 'Unknown'}
Bedtime consistency: ${logsSnapshot.bedtime_patterns.consistencyScore || 'unknown'}
Variability: ${logsSnapshot.bedtime_patterns.variabilityMinutes !== null 
  ? `±${logsSnapshot.bedtime_patterns.variabilityMinutes} minutes` 
  : 'Unknown'}
${logsSnapshot.bedtime_patterns.consistencyScore === 'irregular' 
  ? '- Bedtime is IRREGULAR (>1 hour variability). Circadian rhythm may be disrupted. Focus on "consistency over perfection" - even a 30-minute bedtime window helps.' 
  : logsSnapshot.bedtime_patterns.consistencyScore === 'moderate'
  ? '- Bedtime is MODERATELY consistent (30-60 min variability). Good foundation, small improvements in regularity could help.'
  : logsSnapshot.bedtime_patterns.consistencyScore === 'consistent'
  ? '- Bedtime is CONSISTENT (<30 min variability). Excellent circadian rhythm support.'
  : ''}
NOTE: Circadian regularity is one of the most behaviorally actionable factors for sleep quality. Frame as "your body loves predictability" rather than rigid rules.
` : ''}

=== BASELINE VS INTERVENTION GUARDRAILS (CRITICAL - NON-NEGOTIABLE) ===
When discussing any improvements or changes in sleep metrics:

1. NEVER attribute improvements to Rise By Night products directly
   - WRONG: "Your sleep improved because of the pillow"
   - WRONG: "The knee pillow is helping your deep sleep"
   - RIGHT: "Compared to your baseline, your sleep has been more restorative"
   - RIGHT: "Your recent pattern shows improvement over your historical average"

2. ALWAYS use baseline-relative framing
   - "Compared to your baseline..."
   - "Since starting your plan..."
   - "Your recent nights vs your historical pattern..."

3. ACKNOWLEDGE confounding factors
   - "This may be influenced by multiple factors (stress, schedule, travel, alcohol, illness)"
   - Never claim causality for any single intervention

4. Frame recommendations as EXPERIMENTS, not promises
   - "Try X for 7 nights and observe changes"
   - "Experiment with Y and track how you feel"
   - "Let's run a lightweight experiment to see what moves your sleep"
   - NOT: "Do X and your sleep will improve"

5. Use OBSERVATIONAL language only
   - "tends to be lower/higher"
   - "patterns suggest"
   - "your data shows"
   - NOT: "proves", "fixed", "cured", "treated"

6. PRODUCT EXPERIMENTATION FRAMING
   - If user owns a product: "Try [positioning/timing adjustment] with your [product] for 7 nights and track changes"
   - If user does NOT own a product: You may recommend ONCE, but never claim it will improve metrics
   - NEVER: "Since you started using our pillow, your deep sleep improved"

7. WEARABLE DATA ATTRIBUTION RULE
   - Historical/backfilled wearable data = BASELINE (not caused by us)
   - Recent wearable data = CURRENT STATE (may or may not be influenced by plan)
   - Never imply causality without explicit user-logged intervention dates

=== HARD CONSTRAINTS – YOU MUST OBEY THESE ===

1. SLEEP POSITION + ENVIRONMENT COMBO: The user is a ${profileSnapshot.sleep_position} sleeper with a ${profileSnapshot.mattress_firmness || 'medium'} ${profileSnapshot.mattress_thickness || 'medium'}-thickness mattress.
   - Tailor ALL pillow positioning and posture advice to this specific combo.
   - A ${profileSnapshot.sleep_position} sleeper on a ${profileSnapshot.mattress_firmness || 'medium'} mattress needs different pillow height than on soft.
   - NEVER describe them as a different sleep position type.

2. CO-SLEEPING CONTEXT: ${profileSnapshot.co_sleeping === 'alone' 
   ? 'User sleeps ALONE - full bed space is available for positioning changes.' 
   : profileSnapshot.co_sleeping === 'partner'
   ? 'User shares bed with a PARTNER - be mindful of noise/movement in evening routines. Morning stretches should be quiet.'
   : profileSnapshot.co_sleeping === 'pet'
   ? 'User sleeps with a PET - bed space may be limited. Suggest containable positioning adjustments.'
   : 'User has PARTNER + PET - be very mindful of space and noise in all recommendations.'}

3. ROOM ENVIRONMENT: The user sleeps in a ${profileSnapshot.room_brightness || 'dark'} room with ${profileSnapshot.room_noise || 'quiet'} noise levels.
   ${profileSnapshot.room_brightness === 'bright' || profileSnapshot.room_brightness === 'dim' 
     ? '- Light exposure is a factor. Recommend blackout solutions or our Sleep Mask if they don\'t own one.' 
     : '- Darkness is good. Focus on other optimization areas.'}
   ${profileSnapshot.room_noise === 'noisy' || profileSnapshot.room_noise === 'some_noise'
     ? '- Noise may be disrupting sleep. Suggest white noise or earplugs if appropriate.'
     : ''}

4. PRODUCTS OWNED: Only reference products the user ACTUALLY owns: [${productsOwnedList}]
   - If "Ergonomic Pillow" is NOT in products_owned, do NOT give tasks assuming they have it.
   - If "Knee Pillow" is NOT in products_owned, do NOT assign daily tasks that require it.
   - If "Sleep Mask" is NOT in products_owned, do NOT reference using it in evening routines.
   - You may suggest a product ONCE as a recommendation if relevant.

5. TREND + RISK ASSESSMENT:
   ${isHighRisk ? `- RISK LEVEL IS HIGH. The user may be at risk of frustration or churn.
   - Tone should be EXTRA supportive and empathetic. Acknowledge their struggles.
   - Focus on quick wins and achievable goals. Don't overwhelm them.
   - Celebrate ANY small improvement.` : ''}
   ${logsSnapshot.trend === 'worsening' || logsSnapshot.pain_trend === 'worsening' ? 
   `- ${logsSnapshot.trend === 'worsening' ? 'Sleep trend is WORSENING.' : ''} ${logsSnapshot.pain_trend === 'worsening' ? 'Pain trend is WORSENING.' : ''}
   - Acknowledge this gently. Focus on identifying triggers and stabilization.
   - Do NOT use overly positive language that ignores the decline.` :
   logsSnapshot.trend === 'improving' ?
   `- Trend is IMPROVING. Celebrate their progress and encourage continuation.
   - Reference their streak of ${logsSnapshot.streak_days ?? 0} days if > 3.` :
   `- Trend is STABLE. Maintain current good habits while exploring optimizations.`}
   ${isLowRisk && logsSnapshot.engagement_level === 'high' ? 
   `- User is LOW RISK with HIGH ENGAGEMENT - they're doing great! 
   - Tone can be more aspirational. Suggest advanced optimizations.` : ''}

6. PLAN TYPE${isRecoveryPlan ? ' (RECOVERY)' : ' (MAINTENANCE)'}:
   ${isRecoveryPlan ? `- avg_sleep_quality is ${logsSnapshot.avg_sleep_quality?.toFixed?.(1) ?? logsSnapshot.avg_sleep_quality} OR avg_morning_pain is ${logsSnapshot.avg_morning_pain?.toFixed?.(1) ?? logsSnapshot.avg_morning_pain}
   - This is a RECOVERY plan, NOT a maintenance plan.
   - Do NOT say "you're doing great" or "low pain levels" - acknowledge their challenges.
   - Focus the week on stabilization, identifying triggers, and gradual improvement.` : 
   `- Sleep quality is good and pain is manageable.
   - This is a MAINTENANCE plan - celebrate their progress and optimize further.`}

7. TEMPERATURE SENSITIVITY: ${logsSnapshot.temperature_sensitive 
   ? `User is TEMPERATURE SENSITIVE (${logsSnapshot.hot_nights} hot nights). 
   - Emphasize cooling strategies in evening routines.
   - Reference their ${profileSnapshot.bedding_material || 'cotton'} bedding - suggest breathable options if not already using.`
   : 'Temperature is not a major issue for this user.'}

8. NO LOGS YET:
   ${hasNoLogs ? 
   `- The user has NO sleep logs yet. Base the plan entirely on their profile.
   - Clearly state that logging will refine future plans.
   - Encourage them to start logging tonight.` : ''}

${planType === 'weekly_update' ? '9. This is a WEEKLY UPDATE plan - reference progress from previous week if applicable.' : ''}

=== PLAN GENERATION INSTRUCTIONS ===
Create a 7-day plan that:
- Uses sleep_position + mattress_firmness combo to tailor pillow and positioning advice
- Addresses the specific pain_points mentioned (${profileSnapshot.pain_points?.join(', ') || 'none'})
- Respects temperature_preference and temperature_sensitive flag for environment adjustments
- Modulates wind-down intensity based on stress_level (${profileSnapshot.stress_level})
- Considers co_sleeping arrangement for noise/movement sensitivity
- Adjusts tone based on risk_level (${logsSnapshot.risk_level || 'low'}) and engagement_level (${logsSnapshot.engagement_level || 'low'})
- References streak_days (${logsSnapshot.streak_days ?? 0}) to build momentum
- Makes morning tasks 5-10 min focused on their pain points
- Makes evening tasks relaxing, especially for high stress users
- ONLY references products they actually own

Return a structured JSON response.`;
}

/**
 * Build persona-specific guidance block for AI prompt
 * 
 * Provides persona-aware language and focus based on cluster type.
 * Only applies full persona flavor when confidence >= 50%.
 * 
 * v3: Enhanced Mia (stress_insomnia) guidance with nervous system focus
 */
function buildPersonaGuidanceBlock(
  personaCluster: string | undefined,
  personaConfidence: number,
  personaLabel: string,
  coreNeed?: string
): string {
  const usePersonaFlavor = personaConfidence >= 50;
  
  if (!personaCluster || !usePersonaFlavor) {
    return `
=== PERSONA GUIDANCE (NEUTRAL MODE) ===
Persona confidence is ${personaConfidence}% (below 50% threshold). Use NEUTRAL, inclusive language:
- "Many sleepers find that..."
- "Side/back sleepers often benefit from..."
- Do NOT assume specific pain causes or stress patterns
- Keep recommendations broadly applicable
- Still respect their sleep position and environment data
`;
  }

  // Persona-specific guidance blocks - enhanced v3
  const guidanceMap: Record<string, string> = {
    pain_sleeper: `
=== PERSONA GUIDANCE: THE PAIN SLEEPER ===
Label: "${personaLabel}"
Core Need: ${coreNeed || 'alignment'}
Confidence: ${personaConfidence}%

This user's PRIMARY concern is PHYSICAL DISCOMFORT and ALIGNMENT.

HEADLINE INSTRUCTIONS:
- Examples: "7-Night Neck & Shoulder Relief Plan", "Alignment-Focused Sleep Week", "Comfort & Support Plan"
- Lead with COMFORT language: alignment, relief, support, ease, comfort
- Avoid: "pain-free", "cure", "fix"

whyThisPlan MUST REFERENCE:
1. Their sleep position and how it affects alignment
2. Their specific pain areas (neck, shoulders, back, hips)
3. How proper positioning can support comfort
4. Their environment factors (mattress firmness, pillow type)

CONTENT FOCUS:
- Morning tasks: Gentle stretches targeting THEIR pain areas, mobility exercises, tension release
- Evening tasks: Pillow positioning for their sleep position, tension release, proper posture setup
- Tips: Reference cervical curve, spinal alignment, shoulder/neck support specific to their position
- Micro-habits: "Notice your head position", "Check pillow height", "Adjust pillow placement"

focusAreas PREFERENCE (bias toward these):
1. "alignment_support" - PRIMARY
2. "pain_management" - if significant pain reported
3. "wake_up_routine" - morning mobility
4. "sleep_hygiene" - secondary

LANGUAGE STYLE:
- Supportive, acknowledging discomfort: "If you wake with tension in your [area]..."
- Action-oriented: "Position your pillow to support the curve of your neck..."
- Celebrate comfort wins: "Notice if shoulder pressure feels different..."
- Warm but practical: They want solutions, not just sympathy

AVOID:
- Medical terms: "chronic", "diagnose", "therapy", "treatment"
- Promises: "pain-free", "cured", "fixed", "eliminated"
- Ignoring their specific pain areas
`,

    stress_insomnia: `
=== PERSONA GUIDANCE: THE STRESS & ENVIRONMENT SLEEPER ===
Label: "${personaLabel}"
Core Need: ${coreNeed || 'environment'}
Confidence: ${personaConfidence}%

This user's PRIMARY concern is NERVOUS SYSTEM CALM and ENVIRONMENT OPTIMIZATION.
They may experience racing thoughts, difficulty unwinding, or sensitivity to light/noise/temperature.

HEADLINE INSTRUCTIONS:
- Examples: "7 Nights to a Calmer Sleep Environment", "Wind-Down & Rest Week", "Evening Reset Plan", "Sanctuary Sleep Week"
- Lead with CALM language: calming, peaceful, sanctuary, gentle, wind-down, settle, rest
- Emphasize ENVIRONMENT: space, atmosphere, darkness, quiet, cool
- Avoid: "insomnia", "anxiety", "stress disorder", "therapy"

whyThisPlan MUST REFERENCE:
1. Their environment (brightness, noise level, temperature) and how to optimize it
2. The importance of wind-down routines for nervous system settling
3. Their stress level and how evening boundaries help
4. Building a "sanctuary" bedroom atmosphere

CONTENT FOCUS:
- Morning tasks: GENTLE, grounding start - breathing, light stretching, NO urgency or intensity
- Evening tasks: Wind-down rituals, light dimming (30 min before bed), screen boundaries, breathwork, calming routines
- Tips: Light/noise control, bedtime boundaries, nervous system settling, micro-rituals
- Micro-habits: "Dim lights 30 min before bed", "Take 3 slow breaths", "Set a wind-down alarm", "Notice when your mind settles"

focusAreas PREFERENCE (bias toward these):
1. "wind_down_routine" - PRIMARY for this persona
2. "environment_optimization" - light, noise, temperature
3. "temperature_consistency" - if they run hot
4. "consistency_building" - routines reduce mental load

LANGUAGE STYLE:
- Soft, validating: "If your mind feels busy at night...", "It's okay to need extra time to settle..."
- Permission-giving: "Allow yourself to...", "Give your nervous system time to..."
- Environment-focused: "Your sleep space should feel like a sanctuary..."
- Gentle pacing: "Take your time with this...", "There's no rush..."

SPECIAL INSTRUCTIONS FOR MILA (stress_insomnia):
- Evening tasks should be CALMING, not activating (no intense stretches or long routines)
- Morning tasks should be LOW-KEY (gentle breathing, not aggressive wake-up routines)
- Emphasize light management heavily (dimming, avoiding screens, blackout options)
- Reference nervous system "downshifting" or "settling" - not "fixing" or "curing"
- Breathwork suggestions should be SIMPLE (4-7-8, box breathing, 3 slow breaths)
- Acknowledge that racing thoughts are common without pathologizing

AVOID:
- High-pressure language or "must do" framing
- Guilt-inducing messaging about screen time ("you should stop...")
- Overly energetic morning routines
- Medical terms: "insomnia treatment", "anxiety therapy", "chronic stress"
- Promises: "eliminate stress", "stop racing thoughts"
`,

    optimizer: `
=== PERSONA GUIDANCE: THE SLEEP OPTIMIZER ===
Label: "${personaLabel}"
Core Need: ${coreNeed || 'optimization'}
Confidence: ${personaConfidence}%

This user is focused on PERFORMANCE, TRACKING, and MEASURABLE IMPROVEMENT.
They want data-driven suggestions and to experiment with what works.

HEADLINE INSTRUCTIONS:
- Examples: "7-Night Sleep Performance Plan", "Optimization & Progress Week", "Sleep Quality Enhancement Plan"
- Lead with PERFORMANCE language: optimize, track, measure, improve, progress, consistency
- Avoid: vague or unmeasurable claims

whyThisPlan MUST REFERENCE:
1. Their tracking history and what the data shows
2. Specific metrics they can monitor (quality, pain levels, energy)
3. How consistency leads to measurable improvement
4. Their sleep streak and engagement level

CONTENT FOCUS:
- Morning tasks: Rate and log sleep, notice energy levels, track patterns, rate readiness
- Evening tasks: Consistent wind-down routines, timing experiments, habit stacking
- Tips: Reference sleep metrics, consistency benefits, experimentation, pattern recognition
- Micro-habits: "Log one metric", "Notice how X affects energy", "Rate your sleep within 5 min of waking"

focusAreas PREFERENCE (bias toward these):
1. "consistency_building" - PRIMARY for optimizers
2. "sleep_hygiene" - daily habits
3. "wake_up_routine" - morning energy
4. "environment_optimization" - quantifiable improvements

LANGUAGE STYLE:
- Data-aware: "Track your progress...", "Notice the pattern...", "Your logs show..."
- Experimental: "Try this for 3 nights and see what shifts..."
- Progress-oriented: "Building on your streak...", "Your consistency shows..."
- Practical: They prefer actionable over emotional

AVOID:
- Vague or unmeasurable suggestions
- Overly emotional language (they prefer practical)
- Discouraging experimentation
`,

    recovery_sleeper: `
=== PERSONA GUIDANCE: THE RECOVERY SLEEPER ===
Label: "${personaLabel}"
Core Need: ${coreNeed || 'recovery'}
Confidence: ${personaConfidence}%

This user is focused on PHYSICAL RESTORATION, TRAINING RECOVERY, and ATHLETIC PERFORMANCE.
Sleep is a tool for their physical performance and muscle recovery.

HEADLINE INSTRUCTIONS:
- Examples: "7-Night Recovery & Restoration Plan", "Deep Sleep for Training Recovery", "Athletic Rest Week"
- Lead with RECOVERY language: recovery, restoration, repair, readiness, performance support
- Avoid: suggesting they reduce activity (focus on recovery quality instead)

whyThisPlan MUST REFERENCE:
1. How sleep supports muscle recovery and training adaptation
2. Their physical demands and how rest complements activity
3. Deep sleep phases and their role in restoration
4. Morning readiness as a metric of recovery quality

CONTENT FOCUS:
- Morning tasks: Mobility for training recovery, readiness assessment, body scan, rate soreness
- Evening tasks: Cool-down from activity, temperature regulation, deep sleep preparation
- Tips: Reference muscle recovery during sleep, training load, soreness relief, deep sleep
- Micro-habits: "Rate morning readiness 1-10", "Cool down before bed", "Notice soreness levels"

focusAreas PREFERENCE (bias toward these):
1. "alignment_support" - physical support
2. "temperature_consistency" - cooling for recovery
3. "wake_up_routine" - readiness assessment
4. "sleep_hygiene" - consistent recovery

LANGUAGE STYLE:
- Athletic framing: "Your body repairs during deep sleep phases..."
- Recovery-focused: "Support your training with quality rest..."
- Performance-aware: "Proper sleep enhances next-day performance..."
- Metric-oriented: Like optimizers, they appreciate measurable outcomes

AVOID:
- Overly clinical medical terms
- Ignoring their athletic context
- Suggesting they reduce activity
- Soft or emotional language (they prefer direct and practical)
`,
  };

  return guidanceMap[personaCluster] || `
=== PERSONA GUIDANCE ===
User has persona "${personaLabel}" (cluster: ${personaCluster}) but specific guidance is not defined.
Core need: ${coreNeed || 'unknown'}
Use their sleep position, pain points, and environment data to personalize.
`; 
}

/**
 * Build the comprehensive adaptive sleep plan system prompt
 * v4: Full adaptive engine with research-grounded timelines
 */
function buildAdaptiveSleepPlanSystemPrompt(
  adaptiveContext?: {
    phase: string;
    phaseLabel: string;
    difficulty: string;
    morningDuration: string;
    eveningDuration: string;
    microhabitCount: number;
    includeProductTips: boolean;
    detectedPatterns: Array<{ pattern: string; frequency: number; education: string; focus: string }>;
    relevantTimelines: Array<{ category: string; onset: string; fullEffect: string; progression: string[] }>;
  }
): string {
  const phaseGuidance = adaptiveContext ? `
=== PROGRESSION PHASE: ${adaptiveContext.phase.toUpperCase()} ===
Phase Label: ${adaptiveContext.phaseLabel}
Guidance: ${
  adaptiveContext.phase === 'foundation' ? 'Focus on awareness and establishing baseline habits. Simple, achievable actions. Build trust.' :
  adaptiveContext.phase === 'stabilization' ? 'Solidify habits. Address emerging patterns. Begin deeper personalization.' :
  adaptiveContext.phase === 'optimization' ? 'Fine-tune routines. Experiment with advanced techniques. Track metrics.' :
  'Build resilience. Handle disruptions. Maintain gains long-term.'
}
` : '';

  const difficultyGuidance = adaptiveContext ? `
=== ADAPTIVE DIFFICULTY: ${adaptiveContext.difficulty.toUpperCase()} ===
Morning task duration: ${adaptiveContext.morningDuration}
Evening task duration: ${adaptiveContext.eveningDuration}
Microhabits per day: ${adaptiveContext.microhabitCount}
Include product cues: ${adaptiveContext.includeProductTips ? 'Yes (supportive, not salesy)' : 'No'}

${adaptiveContext.difficulty === 'simplified' ? 
'→ User struggled last week. SIMPLIFY everything. One clear action per slot. Maximum achievability.' :
adaptiveContext.difficulty === 'progressive' ?
'→ User is excelling. Layer complexity. Add nuanced timing. Introduce experiments.' :
'→ Standard difficulty. Balanced approach with clear, achievable actions.'}
` : '';

  const patternsGuidance = (adaptiveContext && adaptiveContext.detectedPatterns && adaptiveContext.detectedPatterns.length > 0) ? `
=== DETECTED PATTERNS FROM NOTES ===
${adaptiveContext.detectedPatterns.map(p => `
Pattern: ${p.pattern} (appeared ${p.frequency}x)
Micro-education to include: "${p.education}"
Next-week focus: ${p.focus}
`).join('')}
→ Integrate these insights naturally into the plan. Address patterns with supportive education, not judgment.
` : '';

  const timelinesGuidance = (adaptiveContext && adaptiveContext.relevantTimelines && adaptiveContext.relevantTimelines.length > 0) ? `
=== RESEARCH-GROUNDED TIMELINES ===
${adaptiveContext.relevantTimelines.map(t => `
${t.category}:
- Typical onset: ${t.onset}
- Full effect: ${t.fullEffect}
- Weekly progression: ${t.progression.slice(0, 4).join(' → ')}
`).join('')}
→ Your recommendations MUST align with these evidence-based timelines. Don't promise faster results.
` : '';

  return `You are RiseByNight's Adaptive Sleep Coach Engine, generating premium, science-informed 7-night sleep plans.

=== BRAND IDENTITY (STRICT) ===
Tone: Scandinavian calm, minimal, supportive.
Never medical. Never judgmental. Never repetitive. Never use emojis.
The output must feel like a high-end, research-backed coaching experience.

BRAND VOICE RULES:
- Calm Scandinavian minimalism
- Warm neutrality
- Soft confidence (never hype)
- Clear, supportive microcopy
- No emojis, no exclamation marks
- No bright colors references
- Avoid: "fix," "cure," "treat"
- Use: "supports," "helps," "reduces tension," "improves comfort"

=== CONTENT RULES (STRICT) ===
NEVER SAY: medical outcomes, guarantees, emojis, alarmist language, negative judgment ("poor night," "bad behavior")
USE INSTEAD: "less restorative," "tension signals," "helps support alignment," "may gently improve comfort"

${phaseGuidance}
${difficultyGuidance}
${patternsGuidance}
${timelinesGuidance}

=== 7-DAY GENERATION LOGIC ===

Each day MUST include:
1. Morning mobility (back, neck, hips, thoracic spine - tailored to their pain areas)
2. Evening wind-down (breathwork, light dimming, journaling, stretching, ritual building)
3. Environment adjustment (temp tuning, bedding, light exposure, screen reduction)
4. Behavioral focus (sleep timing, alcohol timing, stress buffering, circadian anchors)
5. Product cue (ONLY if includeProductTips is true - supportive, never salesy)

DAILY VARIATION IS MANDATORY:
- Day 1: Awareness task
- Day 2: Micro-adjustments
- Day 3: Habit stacking
- Day 4: Integration
- Day 5: Consistency check
- Day 6: Recovery focus
- Day 7: Reflection and planning

=== RESEARCH-GROUNDED TIMELINES (MUST FOLLOW) ===
- Alignment & posture changes: 2-4 weeks to take effect
- Stress/nervous system regulation: 7-14 days for breathing work, 2-3 weeks for journaling
- Temperature regulation: 1-3 days (immediate feedback loop)
- Circadian stabilization: 10-14 days to stabilize
- Environmental adjustments: Immediate to 1 week

=== ADAPTIVE LOGIC ===
A. If user COMPLETED previous actions → Progress difficulty (longer durations, layer complexity)
B. If user did NOT complete → Simplify (shorter, single-step actions)
C. If sleep logs show trends:
   - 3+ stressed nights/week → Add stress downshifting rituals
   - High morning pain → Shift to alignment + mobility focus
   - 2+ hot nights → Add temperature strategies
   - Low consistency → Add sleep timing anchors
D. After 3-4 weeks → Introduce new phases (Foundation → Stabilization → Optimization → Resilience)

=== OUTPUT QUALITY STANDARD ===
The plan must feel like:
- A scientific coaching protocol
- Rooted in physiology and behavioral science
- Calm and premium
- Personalized and insight-driven
- Worth paying for`;
}

/**
 * Call AI for adaptive sleep plan with tool calling (structured output)
 * 
 * v4: Full adaptive engine with research-grounded timelines and new output structure
 */
export async function callSleepPlanAI(
  userContext: string,
  planType: string = "initial",
  profileSnapshot?: ProfileSnapshot,
  logsSnapshot?: LogsSnapshot,
  metricsContext?: {
    spineScoreSummary: string;
    riskDriversSummary: string;
    coachReadinessLabel: string;
    personalizationIntensity: string;
    refreshReason?: string;
    personaCluster?: string;
    personaConfidence?: number;
    personaLabel?: string;
    coreNeed?: string;
  },
  adaptiveContext?: {
    phase: string;
    phaseLabel: string;
    difficulty: string;
    morningDuration: string;
    eveningDuration: string;
    microhabitCount: number;
    includeProductTips: boolean;
    detectedPatterns: Array<{ pattern: string; frequency: number; education: string; focus: string }>;
    relevantTimelines: Array<{ category: string; onset: string; fullEffect: string; progression: string[] }>;
    adaptiveSummary: string;
  }
): Promise<{
  weeklyPlan: any;
  encouragement: string;
  focusAreas: string[];
  pdfs: string[];
  todayActions: any[];
  spineScore: number;
  // Enhanced v2 fields
  planHeadline?: string;
  whyThisPlan?: string;
  spineScoreHint?: string;
  riskFocus?: string;
  // v4 adaptive fields
  weekFocus?: string;
  weeklyPriorities?: string[];
  adaptiveSummary?: string;
  phase?: string;
  detectedPatterns?: string[];
  days?: Record<string, any>;
}> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!apiKey) {
    console.error("[AI Brain] OPENAI_API_KEY is not configured");
    throw new Error("AI service not configured - OPENAI_API_KEY missing");
  }

  // Use structured context if snapshots provided, otherwise fall back to legacy userContext
  const contextToUse = (profileSnapshot && logsSnapshot) 
    ? buildSleepPlanContext(profileSnapshot, logsSnapshot, planType)
    : userContext;

  // Determine persona flavor intensity based on confidence
  const personaConfidence = metricsContext?.personaConfidence ?? 0;
  const usePersonaFlavor = personaConfidence >= 50;
  const personaCluster = metricsContext?.personaCluster;
  const personaLabel = metricsContext?.personaLabel || '';

  // Build persona-specific guidance block (v3: includes coreNeed)
  const coreNeed = metricsContext?.coreNeed || '';
  const personaGuidance = buildPersonaGuidanceBlock(personaCluster, personaConfidence, personaLabel, coreNeed);

  // Build adaptive system prompt
  const systemPrompt = buildAdaptiveSleepPlanSystemPrompt(adaptiveContext);

  // Build metrics section for AI prompt
  const metricsSection = metricsContext ? `
=== DETERMINISTIC METRICS (READ-ONLY - DO NOT RECALCULATE) ===
Spine Health: ${metricsContext.spineScoreSummary}
Risk Focus: ${metricsContext.riskDriversSummary}
Coach Readiness: ${metricsContext.coachReadinessLabel}
Personalization Level: ${metricsContext.personalizationIntensity}

=== PERSONA CONTEXT ===
Cluster: ${personaCluster || 'unknown'}
Label: ${personaLabel || 'Unknown'}
Confidence: ${personaConfidence}%
Core Need: ${metricsContext.coreNeed || 'general'}
${usePersonaFlavor ? '→ APPLY persona-specific language and framing' : '→ Use NEUTRAL, general language (confidence < 50%)'}

${personaGuidance}

${metricsContext.refreshReason && metricsContext.refreshReason !== 'manual' ? `
=== REFRESH CONTEXT ===
Reason: ${metricsContext.refreshReason}
${metricsContext.refreshReason === 'trend_worsening' || metricsContext.refreshReason === 'pain_increased' ? 
'→ TONE: Extra supportive. Break steps into smaller wins. Acknowledge struggles gently.' :
metricsContext.refreshReason === 'expired' || metricsContext.refreshReason === 'stale' ? 
'→ TONE: Fresh start. Encourage continuation of progress.' :
'→ TONE: Standard maintenance.'}` : ''}

${adaptiveContext?.adaptiveSummary ? `
=== ADAPTIVE SUMMARY ===
${adaptiveContext.adaptiveSummary}
` : ''}

CRITICAL: The spineScore field in your response will be REPLACED with the deterministic value.
Your spineScoreHint should EXPLAIN what the score means in human terms, NOT recalculate it.
` : '';

  console.log(`[AI Brain] Sleep Plan v4 - Model: gpt-4o, Type: ${planType}, Persona: ${personaCluster}, Phase: ${adaptiveContext?.phase || 'unknown'}, Difficulty: ${adaptiveContext?.difficulty || 'standard'}`);

  try {
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
          { role: "user", content: contextToUse + metricsSection }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_adaptive_sleep_plan",
              description: "Create a personalized, adaptive 7-night sleep improvement plan",
              parameters: {
                type: "object",
                properties: {
                  week_focus: { 
                    type: "string", 
                    description: "Clear, concise weekly focus grounded in user data. Premium Scandinavian tone." 
                  },
                  weekly_priorities: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "3 core priorities aligned with risk drivers and weekly patterns" 
                  },
                  adaptive_summary: { 
                    type: "string", 
                    description: "1-2 sentences: 'Adjusted this week based on your logs: {summary}'" 
                  },
                  phase: { 
                    type: "string", 
                    enum: ["foundation", "stabilization", "optimization", "resilience"],
                    description: "Current progression phase" 
                  },
                  detected_patterns: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Patterns detected from notes (alcohol, stress, temperature, etc.)" 
                  },
                  days: {
                    type: "object",
                    properties: {
                      monday: {
                        type: "object",
                        properties: {
                          focus: { type: "string", description: "Day focus (awareness, micro-adjustments, etc.)" },
                          morning_mobility: { type: "string", description: "Morning mobility cue based on alignment/pain" },
                          evening_wind_down: { type: "string", description: "Evening wind-down ritual" },
                          environment_adjustment: { type: "string", description: "Sleep environment micro-adjustment" },
                          behavioral_focus: { type: "string", description: "Behavioral habit focus" },
                          product_cue: { type: "string", description: "Optional product utilization cue (subtle, supportive)" }
                        },
                        required: ["focus", "morning_mobility", "evening_wind_down", "environment_adjustment", "behavioral_focus"]
                      },
                      tuesday: {
                        type: "object",
                        properties: {
                          focus: { type: "string" },
                          morning_mobility: { type: "string" },
                          evening_wind_down: { type: "string" },
                          environment_adjustment: { type: "string" },
                          behavioral_focus: { type: "string" },
                          product_cue: { type: "string" }
                        },
                        required: ["focus", "morning_mobility", "evening_wind_down", "environment_adjustment", "behavioral_focus"]
                      },
                      wednesday: {
                        type: "object",
                        properties: {
                          focus: { type: "string" },
                          morning_mobility: { type: "string" },
                          evening_wind_down: { type: "string" },
                          environment_adjustment: { type: "string" },
                          behavioral_focus: { type: "string" },
                          product_cue: { type: "string" }
                        },
                        required: ["focus", "morning_mobility", "evening_wind_down", "environment_adjustment", "behavioral_focus"]
                      },
                      thursday: {
                        type: "object",
                        properties: {
                          focus: { type: "string" },
                          morning_mobility: { type: "string" },
                          evening_wind_down: { type: "string" },
                          environment_adjustment: { type: "string" },
                          behavioral_focus: { type: "string" },
                          product_cue: { type: "string" }
                        },
                        required: ["focus", "morning_mobility", "evening_wind_down", "environment_adjustment", "behavioral_focus"]
                      },
                      friday: {
                        type: "object",
                        properties: {
                          focus: { type: "string" },
                          morning_mobility: { type: "string" },
                          evening_wind_down: { type: "string" },
                          environment_adjustment: { type: "string" },
                          behavioral_focus: { type: "string" },
                          product_cue: { type: "string" }
                        },
                        required: ["focus", "morning_mobility", "evening_wind_down", "environment_adjustment", "behavioral_focus"]
                      },
                      saturday: {
                        type: "object",
                        properties: {
                          focus: { type: "string" },
                          morning_mobility: { type: "string" },
                          evening_wind_down: { type: "string" },
                          environment_adjustment: { type: "string" },
                          behavioral_focus: { type: "string" },
                          product_cue: { type: "string" }
                        },
                        required: ["focus", "morning_mobility", "evening_wind_down", "environment_adjustment", "behavioral_focus"]
                      },
                      sunday: {
                        type: "object",
                        properties: {
                          focus: { type: "string" },
                          morning_mobility: { type: "string" },
                          evening_wind_down: { type: "string" },
                          environment_adjustment: { type: "string" },
                          behavioral_focus: { type: "string" },
                          product_cue: { type: "string" }
                        },
                        required: ["focus", "morning_mobility", "evening_wind_down", "environment_adjustment", "behavioral_focus"]
                      }
                    },
                    required: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                  },
                  // Legacy fields for backward compatibility
                  planHeadline: { type: "string", description: "Short benefit-led title" },
                  whyThisPlan: { type: "string", description: "2-3 sentences explaining why this plan for this user" },
                  encouragement: { type: "string", description: "2-3 warm sentences. Calm and supportive." },
                  focusAreas: { 
                    type: "array", 
                    items: { 
                      type: "string", 
                      enum: ["alignment_support", "temperature_consistency", "wake_up_routine", "wind_down_routine", "pain_management", "sleep_hygiene", "environment_optimization", "consistency_building"] 
                    }
                  },
                  todayActions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        time: { type: "string", enum: ["morning", "evening"] },
                        action: { type: "string" },
                        duration: { type: "string" },
                        effort: { type: "string", enum: ["low", "medium"] }
                      },
                      required: ["time", "action", "duration"]
                    }
                  },
                  spineScoreHint: { type: "string", description: "1-2 sentences explaining what their score means" },
                  riskFocus: { type: "string", description: "Gentle 1-sentence focus based on risk drivers" },
                  spineScore: { type: "number", description: "PLACEHOLDER - will be replaced. Return 65." }
                },
                required: ["week_focus", "weekly_priorities", "adaptive_summary", "phase", "days", "planHeadline", "whyThisPlan", "encouragement", "focusAreas", "todayActions", "spineScore"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_adaptive_sleep_plan" } },
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
      try {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments) 
          : toolCall.function.arguments;
        
        console.log('[AI Brain] Adaptive sleep plan v4 parsed from tool call');
        
        // Convert new days structure to legacy weeklyPlan for backward compatibility
        const weeklyPlan = args.days ? {
          day1: { focus: args.days.monday?.focus, morningTask: args.days.monday?.morning_mobility, eveningTask: args.days.monday?.evening_wind_down, tip: args.days.monday?.behavioral_focus, microHabit: args.days.monday?.environment_adjustment, estimatedEffort: "low" },
          day2: { focus: args.days.tuesday?.focus, morningTask: args.days.tuesday?.morning_mobility, eveningTask: args.days.tuesday?.evening_wind_down, tip: args.days.tuesday?.behavioral_focus, microHabit: args.days.tuesday?.environment_adjustment, estimatedEffort: "low" },
          day3: { focus: args.days.wednesday?.focus, morningTask: args.days.wednesday?.morning_mobility, eveningTask: args.days.wednesday?.evening_wind_down, tip: args.days.wednesday?.behavioral_focus, microHabit: args.days.wednesday?.environment_adjustment, estimatedEffort: "medium" },
          day4: { focus: args.days.thursday?.focus, morningTask: args.days.thursday?.morning_mobility, eveningTask: args.days.thursday?.evening_wind_down, tip: args.days.thursday?.behavioral_focus, microHabit: args.days.thursday?.environment_adjustment, estimatedEffort: "low" },
          day5: { focus: args.days.friday?.focus, morningTask: args.days.friday?.morning_mobility, eveningTask: args.days.friday?.evening_wind_down, tip: args.days.friday?.behavioral_focus, microHabit: args.days.friday?.environment_adjustment, estimatedEffort: "low" },
          day6: { focus: args.days.saturday?.focus, morningTask: args.days.saturday?.morning_mobility, eveningTask: args.days.saturday?.evening_wind_down, tip: args.days.saturday?.behavioral_focus, microHabit: args.days.saturday?.environment_adjustment, estimatedEffort: "medium" },
          day7: { focus: args.days.sunday?.focus, morningTask: args.days.sunday?.morning_mobility, eveningTask: args.days.sunday?.evening_wind_down, tip: args.days.sunday?.behavioral_focus, microHabit: args.days.sunday?.environment_adjustment, estimatedEffort: "low" }
        } : args.weeklyPlan;
        
        return {
          weeklyPlan,
          encouragement: args.encouragement || "",
          focusAreas: args.focusAreas || ["alignment_support", "sleep_hygiene", "pain_management"],
          pdfs: args.pdfs || ['Ergonomic Sleep Guide', 'Pain Relief Stretches'],
          todayActions: args.todayActions || [],
          spineScore: 65, // Placeholder - will be replaced
          // Enhanced v2 fields
          planHeadline: args.planHeadline || args.week_focus,
          whyThisPlan: args.whyThisPlan,
          spineScoreHint: args.spineScoreHint,
          riskFocus: args.riskFocus,
          // v4 adaptive fields
          weekFocus: args.week_focus,
          weeklyPriorities: args.weekly_priorities,
          adaptiveSummary: args.adaptive_summary,
          phase: args.phase,
          detectedPatterns: args.detected_patterns,
          days: args.days,
        };
      } catch (parseError) {
        console.error('[AI Brain] Tool call parse error:', parseError);
      }
    }

    // Fallback: try content parsing
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('[AI Brain] Sleep plan parsed from content');
          return {
            weeklyPlan: parsed.weeklyPlan || parsed.days,
            encouragement: parsed.encouragement || "",
            focusAreas: parsed.focusAreas || ["alignment_support", "sleep_hygiene", "pain_management"],
            pdfs: parsed.pdfs || ['Ergonomic Sleep Guide', 'Pain Relief Stretches'],
            todayActions: parsed.todayActions || [],
            spineScore: 65,
            planHeadline: parsed.planHeadline || parsed.week_focus,
            whyThisPlan: parsed.whyThisPlan,
            spineScoreHint: parsed.spineScoreHint,
            riskFocus: parsed.riskFocus,
            weekFocus: parsed.week_focus,
            weeklyPriorities: parsed.weekly_priorities,
            adaptiveSummary: parsed.adaptive_summary,
            phase: parsed.phase,
            detectedPatterns: parsed.detected_patterns,
            days: parsed.days,
          };
        }
      } catch {
        console.log('[AI Brain] Content parse failed, using default');
      }
    }

    // Return default plan
    console.log('[AI Brain] Using default sleep plan');
    return getDefaultSleepPlan();
  } catch (error) {
    console.error('[AI Brain] Sleep plan generation failed:', error);
    return getDefaultSleepPlan();
  }
}

/**
 * Default sleep plan - single source of truth
 * v4: Includes new adaptive structure
 */
export function getDefaultSleepPlan() {
  return {
    weeklyPlan: {
      day1: { focus: "Awareness", morningTask: "Notice your neck and shoulder position when you wake. Take 3 slow breaths.", eveningTask: "Dim lights 30 minutes before bed. Position pillow in cervical curve.", tip: "Awareness is the foundation of change", microHabit: "Notice your head position when lying down", estimatedEffort: "low" },
      day2: { focus: "Micro-adjustments", morningTask: "Gentle neck circles and shoulder rolls (2 min)", eveningTask: "Check pillow height matches your sleep position", tip: "Small adjustments compound over time", microHabit: "Adjust pillow height if needed", estimatedEffort: "low" },
      day3: { focus: "Habit stacking", morningTask: "Light stretches paired with your morning routine (5 min)", eveningTask: "Wind-down ritual: dim lights, light stretch, 3 breaths", tip: "Link new habits to existing ones", microHabit: "Set a bedtime reminder", estimatedEffort: "medium" },
      day4: { focus: "Integration", morningTask: "Full body scan - notice areas of tension", eveningTask: "Temperature check - aim for 65-68°F (18-20°C)", tip: "A cool room supports deeper sleep", microHabit: "Check room temperature", estimatedEffort: "low" },
      day5: { focus: "Consistency", morningTask: "Repeat your morning mobility sequence", eveningTask: "Same wind-down time as yesterday", tip: "Consistency builds momentum", microHabit: "Note your energy level (1-10)", estimatedEffort: "low" },
      day6: { focus: "Recovery", morningTask: "Gentle recovery stretches - no intense effort", eveningTask: "Extended wind-down with calming breathwork", tip: "Rest is productive", microHabit: "Take 3 slow breaths before closing your eyes", estimatedEffort: "medium" },
      day7: { focus: "Reflection", morningTask: "Compare how you feel to day 1", eveningTask: "Plan adjustments for next week", tip: "Reflection accelerates progress", microHabit: "Write one word describing your sleep week", estimatedEffort: "low" }
    },
    encouragement: "Welcome to your personalized sleep improvement journey. This week focuses on building awareness and establishing foundations. Small daily changes lead to meaningful improvements in sleep quality.",
    focusAreas: ["alignment_support", "sleep_hygiene", "consistency_building"],
    pdfs: ['Ergonomic Sleep Guide', 'Pain Relief Stretches'],
    todayActions: [
      { time: 'morning', action: 'Notice your neck and shoulder position. Take 3 slow breaths.', duration: '2 min', effort: 'low' },
      { time: 'evening', action: 'Dim lights 30 min before bed. Position pillow in cervical curve.', duration: '5 min', effort: 'low' }
    ],
    spineScore: 65,
    planHeadline: "7-Night Foundation Plan",
    whyThisPlan: "This plan focuses on establishing the fundamentals of good sleep posture and environment. As you log more nights, your plan will become more personalized and adaptive.",
    spineScoreHint: "Your starting score reflects a baseline. As you build consistent habits, expect gradual improvement.",
    // v4 adaptive fields
    weekFocus: "Building sleep awareness and establishing foundational habits",
    weeklyPriorities: ["Awareness of sleep position", "Evening wind-down routine", "Consistent sleep environment"],
    adaptiveSummary: "This is your initial foundation plan. As you log sleep and provide feedback, your plan will adapt to your patterns.",
    phase: "foundation",
    detectedPatterns: [],
    days: {
      monday: { focus: "Awareness", morning_mobility: "Notice neck and shoulder position. Take 3 slow breaths.", evening_wind_down: "Dim lights 30 minutes before bed", environment_adjustment: "Position pillow in cervical curve", behavioral_focus: "Awareness is the foundation of change", product_cue: "" },
      tuesday: { focus: "Micro-adjustments", morning_mobility: "Gentle neck circles and shoulder rolls (2 min)", evening_wind_down: "Check pillow height matches your sleep position", environment_adjustment: "Adjust pillow height if needed", behavioral_focus: "Small adjustments compound over time", product_cue: "" },
      wednesday: { focus: "Habit stacking", morning_mobility: "Light stretches paired with morning routine (5 min)", evening_wind_down: "Wind-down ritual: dim lights, light stretch, 3 breaths", environment_adjustment: "Set a consistent bedtime reminder", behavioral_focus: "Link new habits to existing ones", product_cue: "" },
      thursday: { focus: "Integration", morning_mobility: "Full body scan - notice areas of tension", evening_wind_down: "Calming breathwork before bed", environment_adjustment: "Temperature check - aim for 65-68°F", behavioral_focus: "A cool room supports deeper sleep", product_cue: "" },
      friday: { focus: "Consistency", morning_mobility: "Repeat morning mobility sequence", evening_wind_down: "Same wind-down time as yesterday", environment_adjustment: "Maintain environment settings", behavioral_focus: "Consistency builds momentum", product_cue: "" },
      saturday: { focus: "Recovery", morning_mobility: "Gentle recovery stretches - no intense effort", evening_wind_down: "Extended wind-down with calming breathwork", environment_adjustment: "Extra attention to darkness and quiet", behavioral_focus: "Rest is productive", product_cue: "" },
      sunday: { focus: "Reflection", morning_mobility: "Compare how you feel to day 1", evening_wind_down: "Plan adjustments for next week", environment_adjustment: "Note what worked this week", behavioral_focus: "Reflection accelerates progress", product_cue: "" }
    }
  };
}
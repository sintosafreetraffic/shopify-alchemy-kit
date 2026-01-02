/**
 * Analyze Sleep Quiz Edge Function
 * 
 * Analyzes quiz responses with deterministic scoring and AI recommendations.
 * Returns structured SleepAssessment for premium 5-section results display.
 * Triggers Sleep Sync after profile creation.
 * 
 * Uses centralized env/cors helpers, AI Brain, and syncAndStoreAttributes.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  corsHeaders,
  requireEnvVar,
  getEnvVar,
  hasOpenAIKey,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import { analyzeQuizForRecommendations } from "../_shared/ai-brain.ts";
import {
  fullSleepSync,
  sendKlaviyoEvent,
} from "../_shared/sleep-sync.ts";
import { SleepSyncSource } from "../_shared/types.ts";
import { buildSleepAssessment, PERSONA_HUMAN_NAMES, type SleepAssessment, type PersonaCluster, type CoreNeed } from "../_shared/sleep-assessment.ts";

// Core need mapping for Klaviyo
const CORE_NEED_MAP: Record<PersonaCluster, CoreNeed> = {
  pain_sleeper: "alignment",
  stress_insomnia: "environment",
  optimizer: "optimization",
  recovery_sleeper: "recovery",
};

/**
 * Deterministic experiment variant assignment
 * Uses hash-based allocation for stable A/B variant assignment
 * 
 * @param cluster - Persona cluster
 * @param experimentKey - Experiment identifier
 * @returns "A" or "B" variant
 */
function assignExperimentVariant(cluster: PersonaCluster | null | undefined, experimentKey: string): "A" | "B" {
  if (!cluster) return "A";
  
  // Simple deterministic hash
  const hashInput = `${cluster}:${experimentKey}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Map to A/B
  return Math.abs(hash) % 2 === 0 ? "A" : "B";
}

// Input validation schema - supports both legacy and new 22-question format
const answersSchema = z.object({
  // Core questions (legacy + new)
  sleepPosition: z.enum(['back', 'side', 'stomach', 'combination']),
  
  // New comprehensive questions
  movesOften: z.string().max(50).optional(),
  pillowCount: z.string().max(10).optional(),
  mattressFirmness: z.string().max(50).optional(),
  sleepEquipment: z.array(z.string().max(100)).max(15).optional(),
  painAreas: z.array(z.string().max(100)).max(15).optional(),
  painSeverity: z.number().min(0).max(10).optional(),
  nightAwakenings: z.string().max(50).optional(),
  sleepTemperature: z.string().max(50).optional(),
  roomBrightness: z.string().max(50).optional(),
  roomNoise: z.string().max(50).optional(),
  sleepLatency: z.string().max(50).optional(),
  sleepHours: z.string().max(50).optional(),
  eveningScreenUse: z.string().max(50).optional(),
  ageGroup: z.string().max(20).optional(),
  gender: z.string().max(20).optional(),
  sleepClothing: z.string().max(50).optional(),
  coSleeping: z.array(z.string().max(50)).max(10).optional(),
  sleepGoals: z.array(z.string().max(100)).max(10).optional(),
  snoring: z.string().max(50).optional(),
  triedMethods: z.array(z.string().max(100)).max(15).optional(),
  pillowSatisfaction: z.number().min(0).max(10).optional(),
  
  // Legacy fields (for backwards compatibility)
  painPoints: z.array(z.string().max(100)).max(10).optional(),
  pillowIssues: z.array(z.string().max(100)).max(10).optional(),
});

const requestSchema = z.object({
  answers: answersSchema,
  email: z.string().email().max(255).optional(),
  createProfile: z.boolean().optional().default(false),
  session_id: z.string().max(100).optional(), // TASK_07: Track session for no-auth quiz flow
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const rawBody = await req.json();
    const parseResult = requestSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("[analyze-sleep-quiz] Validation error:", parseResult.error.errors);
      return createErrorResponse("Invalid input", 400);
    }
    
    const { answers, email, createProfile, session_id } = parseResult.data;
    
    // Use centralized env helpers
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = requireEnvVar("SUPABASE_ANON_KEY");
    const KLAVIYO_PRIVATE_API_KEY = getEnvVar("KLAVIYO_PRIVATE_API_KEY");
    const KLAVIYO_MAIN_LIST_ID = getEnvVar("KLAVIYO_MAIN_LIST_ID");

    // Check OPENAI_API_KEY availability
    if (!hasOpenAIKey()) {
      console.error("[analyze-sleep-quiz] OPENAI_API_KEY is not configured");
      return createErrorResponse("AI service not configured", 500);
    }

    // TASK_07: Profile creation now supports both authenticated and anonymous flows
    // - Authenticated: uses auth email (preferred for account linking)
    // - Anonymous: uses provided email with session_id for tracking
    // Security: UPSERT is keyed on email (unique), so no overwrite without knowing exact email
    let profileEmail: string | null = null;
    let isAuthenticated = false;
    
    // Try to get authenticated email if auth header present
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await authClient.auth.getUser();
        if (user?.email) {
          profileEmail = user.email;
          isAuthenticated = true;
          console.log("[analyze-sleep-quiz] Using authenticated email:", profileEmail);
        }
      } catch (e) {
        console.log("[analyze-sleep-quiz] Auth check failed, proceeding as anonymous:", e);
      }
    }
    
    // If not authenticated, use provided email for profile creation
    if (!profileEmail && email) {
      profileEmail = email.toLowerCase().trim();
      console.log("[analyze-sleep-quiz] Using provided email for anonymous quiz:", profileEmail);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Sanitize inputs - handle both legacy and new format
    const sanitizeArray = (arr?: string[]) => (arr || []).map(p => p.replace(/[<>{}[\]`$]/g, ''));
    const sanitizeString = (str?: string) => (str || '').replace(/[<>{}[\]`$]/g, '');
    
    // Build comprehensive sanitized answers object
    const sanitizedAnswers = {
      // Core position
      sleepPosition: answers.sleepPosition,
      
      // New comprehensive fields
      movesOften: sanitizeString(answers.movesOften),
      pillowCount: sanitizeString(answers.pillowCount),
      mattressFirmness: sanitizeString(answers.mattressFirmness),
      sleepEquipment: sanitizeArray(answers.sleepEquipment),
      painAreas: sanitizeArray(answers.painAreas),
      painSeverity: answers.painSeverity ?? 5,
      nightAwakenings: sanitizeString(answers.nightAwakenings),
      sleepTemperature: sanitizeString(answers.sleepTemperature),
      roomBrightness: sanitizeString(answers.roomBrightness),
      roomNoise: sanitizeString(answers.roomNoise),
      sleepLatency: sanitizeString(answers.sleepLatency),
      sleepHours: sanitizeString(answers.sleepHours),
      eveningScreenUse: sanitizeString(answers.eveningScreenUse),
      ageGroup: sanitizeString(answers.ageGroup),
      gender: sanitizeString(answers.gender),
      sleepClothing: sanitizeString(answers.sleepClothing),
      coSleeping: sanitizeArray(answers.coSleeping),
      sleepGoals: sanitizeArray(answers.sleepGoals),
      snoring: sanitizeString(answers.snoring),
      triedMethods: sanitizeArray(answers.triedMethods),
      pillowSatisfaction: answers.pillowSatisfaction ?? 5,
      
      // Legacy fields (mapped from new fields for AI compatibility)
      painPoints: sanitizeArray(answers.painPoints || answers.painAreas),
      pillowIssues: sanitizeArray(answers.pillowIssues || answers.sleepEquipment),
    };

    // AI Analysis via centralized AI Brain (OpenAI)
    console.log("[analyze-sleep-quiz] Calling AI Brain for product recommendations");
    const analysis = await analyzeQuizForRecommendations(sanitizedAnswers);
    console.log("[analyze-sleep-quiz] AI analysis complete:", analysis.recommendations?.length, "recommendations");

    // Build structured SleepAssessment using deterministic scoring
    console.log("[analyze-sleep-quiz] Building structured SleepAssessment");
    const structuredAssessment: SleepAssessment = buildSleepAssessment(sanitizedAnswers);
    console.log("[analyze-sleep-quiz] SleepAssessment persona:", structuredAssessment.persona.guess);

    const trackingEmail = email;
    // profileEmail is already set above in the createProfile block

    // Track in Klaviyo
    if (trackingEmail && KLAVIYO_PRIVATE_API_KEY) {
      try {
        const profileResponse = await fetch("https://a.klaviyo.com/api/profiles/", {
          method: "POST",
          headers: {
            "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
            "Content-Type": "application/json",
            "revision": "2024-02-15",
          },
          body: JSON.stringify({
            data: {
              type: "profile",
              attributes: {
                email: trackingEmail,
                properties: {
                  // Core sleep data
                  sleep_position: sanitizedAnswers.sleepPosition,
                  moves_often: sanitizedAnswers.movesOften,
                  pillow_count: sanitizedAnswers.pillowCount,
                  mattress_firmness: sanitizedAnswers.mattressFirmness,
                  
                  // Equipment and pain
                  sleep_equipment: sanitizedAnswers.sleepEquipment,
                  pain_areas: sanitizedAnswers.painAreas,
                  pain_severity: sanitizedAnswers.painSeverity,
                  
                  // Sleep environment
                  night_awakenings: sanitizedAnswers.nightAwakenings,
                  sleep_temperature: sanitizedAnswers.sleepTemperature,
                  room_brightness: sanitizedAnswers.roomBrightness,
                  room_noise: sanitizedAnswers.roomNoise,
                  
                  // Sleep patterns
                  sleep_latency: sanitizedAnswers.sleepLatency,
                  sleep_hours: sanitizedAnswers.sleepHours,
                  evening_screen_use: sanitizedAnswers.eveningScreenUse,
                  
                  // Demographics
                  age_group: sanitizedAnswers.ageGroup,
                  gender: sanitizedAnswers.gender,
                  sleep_clothing: sanitizedAnswers.sleepClothing,
                  co_sleeping: sanitizedAnswers.coSleeping,
                  
                  // Goals and history
                  sleep_goals: sanitizedAnswers.sleepGoals,
                  snoring: sanitizedAnswers.snoring,
                  tried_methods: sanitizedAnswers.triedMethods,
                  pillow_satisfaction: sanitizedAnswers.pillowSatisfaction,
                  
                  // Quiz metadata
                  quiz_completed_at: new Date().toISOString(),
                  quiz_version: "v2_comprehensive",
                  recommended_products: analysis.recommendations.map((r: any) => r.product),
                  bundle_recommended: analysis.bundleRecommended,
                }
              },
            },
          }),
        });

        const profileData = await profileResponse.json();
        let profileId = profileData.data?.id;
        if (!profileId && profileData.errors) {
          const duplicateError = profileData.errors.find((e: any) => e.code === "duplicate_profile");
          if (duplicateError?.meta?.duplicate_profile_id) {
            profileId = duplicateError.meta.duplicate_profile_id;
          }
        }

        if (KLAVIYO_MAIN_LIST_ID && profileId) {
          await fetch(`https://a.klaviyo.com/api/lists/${KLAVIYO_MAIN_LIST_ID}/relationships/profiles/`, {
            method: "POST",
            headers: {
              "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
              "Content-Type": "application/json",
              "revision": "2024-02-15",
            },
            body: JSON.stringify({
              data: [{ type: "profile", id: profileId }],
            }),
          });
        }

        /**
         * RBN_SleepQuiz_Completed Event
         * 
         * Structured event for Klaviyo email automation.
         * See docs/klaviyo-sleep-quiz-email.md for email template guidance.
         * 
         * All field names use lowercase_with_underscores for consistency.
         * 
         * Properties available in Klaviyo templates:
         * - {{ event.sleep_position }} - Primary sleep position
         * - {{ event.pain_points }} - Comma-separated pain areas
         * - {{ event.persona_guess }} - jason, mila, or leo
         * - {{ event.alignment_priority }} - Boolean for segmentation
         * - {{ event.environment_priority }} - Boolean for segmentation
         * - {{ event.top_risk_drivers }} - Array of top 3 risk factors
         * - {{ event.alignment_risk_score }} - 0-100
         * - {{ event.neck_support_score }} - 0-100
         * - {{ event.sleep_stability_score }} - 0-100
         * - {{ event.environment_score }} - 0-100
         * - {{ event.light_sensitivity_score }} - 0-100
         * - {{ event.temperature_disruption_score }} - 0-100
         * - {{ event.recommendation_confidence }} - 0-100
         * - {{ event.primary_product }} - ergonomic_pillow
         * - {{ event.secondary_product }} - knee_pillow or silk_mask
         * - {{ event.recommended_bundle }} - alignment_set, deep_sleep_set, or performance_set
         * - {{ event.quiz_completed_at }} - ISO timestamp
         * - {{ event.results_url }} - URL to results page
         */
        const frontendBase = "https://www.risebynight.com";
        const resultsUrl = `${frontendBase}/sleep-coach?from=quiz_email&email=${encodeURIComponent(trackingEmail)}`;
        
        // Determine stress level from quiz
        const hasStressGoal = (sanitizedAnswers.sleepGoals || []).some((g: string) => 
          g.toLowerCase().includes('stress') || g.toLowerCase().includes('better sleep')
        );
        const quizStressLevel = hasStressGoal ? 'high' : 'medium';
        
        // Determine wake up condition
        const hasPainForWakeup = sanitizedAnswers.painAreas.some((p: string) => 
          p.toLowerCase() !== 'no pain' && p.toLowerCase() !== 'none'
        );
        const wantsRefreshedForWakeup = (sanitizedAnswers.sleepGoals || []).includes('Wake up refreshed');
        let quizWakeUpCondition = 'neutral';
        if (hasPainForWakeup) quizWakeUpCondition = 'stiff';
        else if (!wantsRefreshedForWakeup) quizWakeUpCondition = 'tired';
        else if (!hasPainForWakeup && wantsRefreshedForWakeup) quizWakeUpCondition = 'energized';
        
        // Determine temperature preference
        let quizTempPref = 'neutral';
        if (sanitizedAnswers.sleepTemperature === 'hot') quizTempPref = 'cool';
        else if (sanitizedAnswers.sleepTemperature === 'cold') quizTempPref = 'warm';
        
        const quizCompletedPayload = {
          // User profile data
          sleep_position: sanitizedAnswers.sleepPosition,
          pain_points: (sanitizedAnswers.painAreas || []).filter((p: string) => p !== 'none').join(', '),
          temperature_preference: quizTempPref,
          room_brightness: sanitizedAnswers.roomBrightness || 'unknown',
          stress_level: quizStressLevel,
          wake_up_condition: quizWakeUpCondition,
          
          // Analysis results (legacy)
          detected_issues: (analysis.detectedIssues || []).slice(0, 5),
          alignment_score: analysis.scores?.alignmentScore ?? null,
          environment_score: analysis.scores?.environmentScore ?? null,
          consistency_score: analysis.scores?.consistencyScore ?? null,
          
          // Extended assessment scores for Klaviyo segmentation
          alignment_risk_score: structuredAssessment.scores.alignment_risk_score,
          neck_support_score: structuredAssessment.scores.neck_support_score,
          sleep_stability_score: structuredAssessment.scores.sleep_stability_score,
          environment_score_v2: structuredAssessment.scores.environment_score,
          light_sensitivity_score: structuredAssessment.scores.light_sensitivity_score,
          temperature_disruption_score: structuredAssessment.scores.temperature_disruption_score,
          
          // Sleep identity for personalization
          sleep_identity_label: structuredAssessment.sleepIdentity.label,
          sleep_identity_position: structuredAssessment.sleepIdentity.position,
          
          // ===== v7: Enhanced Persona Fields for Segmentation =====
          // NOTE: persona_name is INTERNAL ONLY for Klaviyo segmentation.
          // Do NOT use persona_name in customer-facing Liquid templates.
          // Use persona_label or persona_cluster for customer-facing copy.
          persona_cluster: structuredAssessment.persona.cluster,
          persona_name: structuredAssessment.persona.name || PERSONA_HUMAN_NAMES[structuredAssessment.persona.cluster],
          persona_label: structuredAssessment.persona.label,
          persona_description: structuredAssessment.persona.description,
          persona_rationale: structuredAssessment.persona.rationale,
          persona_legacy_type: structuredAssessment.persona.legacyType,
          core_need: CORE_NEED_MAP[structuredAssessment.persona.cluster],
          recommended_modules: structuredAssessment.persona.recommended_modules,
          
          // ===== v8: Experiment Variant Assignments for A/B Testing =====
          // Deterministic hash-based variant assignment per persona × experiment
          persona_experiment_variants: {
            coach_hero_v1: assignExperimentVariant(structuredAssessment.persona.cluster, "coach_hero_v1"),
            quiz_results_hero_v1: assignExperimentVariant(structuredAssessment.persona.cluster, "quiz_results_hero_v1"),
          },
          
          // Legacy persona field (backwards compatibility)
          persona_guess: structuredAssessment.persona.guess,
          
          // Segmentation priority flags
          alignment_priority: structuredAssessment.alignment_priority,
          environment_priority: structuredAssessment.environment_priority,
          top_risk_drivers: structuredAssessment.top_risk_drivers,
          
          // Structured product recommendations
          primary_product: structuredAssessment.productRecommendations.primary_product,
          secondary_product: structuredAssessment.productRecommendations.secondary_product || null,
          recommended_bundle: structuredAssessment.productRecommendations.recommended_bundle || null,
          recommendation_confidence: structuredAssessment.productRecommendations.recommendation_confidence,
          fit_explanation: structuredAssessment.productRecommendations.fit_explanation,
          persona_reasoning: structuredAssessment.productRecommendations.persona_reasoning,
          
          // Recommendations (legacy)
          primary_recommendation: analysis.recommendations?.[0]?.product || null,
          secondary_recommendation: analysis.recommendations?.[1]?.product || null,
          
          // Meta
          quiz_completed_at: new Date().toISOString(),
          has_sleep_coach_access: false, // Will be updated after profile creation check
          results_url: resultsUrl,
          sleep_quiz_version: "v9",
          
          // Legacy fields for backwards compatibility
          assessment: analysis.assessment,
          recommendations: analysis.recommendations,
          bundle_recommended: analysis.bundleRecommended,
        };
        
        await sendKlaviyoEvent(
          KLAVIYO_PRIVATE_API_KEY,
          trackingEmail,
          "RBN_SleepQuiz_Completed",
          quizCompletedPayload
        );
        console.log("[Klaviyo] RBN_SleepQuiz_Completed event sent for:", trackingEmail);
      } catch (klaviyoError) {
        console.error("[Klaviyo] Tracking error:", klaviyoError);
      }
    }

    // TASK_07: Always UPSERT profile on quiz completion (no auth required)
    // Uses service role, keyed on email (unique index enforces deduplication)
    let profileCreated = false;
    let profileUpdated = false;
    const profileEmailToUse = profileEmail || (email ? email.toLowerCase().trim() : null);
    
    if (profileEmailToUse) {
      const sleepPositionMap: Record<string, string> = {
        'back': 'back',
        'side': 'side',
        'stomach': 'stomach',
        'combination': 'mixed'
      };

      // Use sanitizedAnswers which has proper fallbacks
      const hasStressGoal = sanitizedAnswers.sleepGoals.some((g: string) => 
        g.toLowerCase().includes('stress') || g.toLowerCase().includes('better sleep')
      );
      const stressLevel = hasStressGoal ? 'high' : 'medium';

      // Use painAreas (new) or painPoints (legacy)
      const painData = sanitizedAnswers.painAreas.length > 0 ? sanitizedAnswers.painAreas : sanitizedAnswers.painPoints;
      const hasPain = painData.some((p: string) => p.toLowerCase() !== 'no pain' && p.toLowerCase() !== 'none');
      const wantsRefreshed = sanitizedAnswers.sleepGoals.includes('Wake up refreshed') || 
                             sanitizedAnswers.sleepGoals.includes('wake_refreshed');
      let wakeUpCondition = 'neutral';
      if (hasPain) wakeUpCondition = 'stiff';
      else if (!wantsRefreshed) wakeUpCondition = 'tired';
      else if (!hasPain && wantsRefreshed) wakeUpCondition = 'energized';

      // Determine temperature preference from new sleepTemperature field or legacy pillowIssues
      let temperaturePreference = 'neutral';
      if (sanitizedAnswers.sleepTemperature === 'hot') {
        temperaturePreference = 'cold';
      } else if (sanitizedAnswers.sleepTemperature === 'cold') {
        temperaturePreference = 'warm';
      } else if (sanitizedAnswers.pillowIssues.some(i => i.toLowerCase().includes('hot'))) {
        temperaturePreference = 'cold';
      }

      try {
        // Build complete profile data for UPSERT
        const profileData = {
          email: profileEmailToUse,
          sleep_position: sleepPositionMap[answers.sleepPosition] || 'mixed',
          pain_points: painData.filter((p: string) => p.toLowerCase() !== 'no pain' && p.toLowerCase() !== 'none'),
          stress_level: stressLevel,
          wake_up_condition: wakeUpCondition,
          temperature_preference: temperaturePreference,
          // Persona fields
          persona_cluster: structuredAssessment.persona.cluster,
          persona_label: structuredAssessment.persona.label,
          persona_rationale: structuredAssessment.persona.rationale,
          persona_recommended_modules: structuredAssessment.persona.recommended_modules,
          // Quiz data and assessment
          quiz_data: sanitizedAnswers,
          sleep_assessment: {
            assessment: analysis.assessment,
            expertSummary: analysis.expertSummary,
            detectedIssues: analysis.detectedIssues,
            alignmentInsights: analysis.alignmentInsights,
            scores: analysis.scores,
            recommendations: analysis.recommendations,
            bundleRecommended: analysis.bundleRecommended,
            bundleReason: analysis.bundleReason,
          },
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString(),
          // TASK_07: Track session_id for anon quiz flow
          ...(session_id ? { session_id } : {}),
        };

        // UPSERT: Insert or update based on email (unique index)
        const { data: upsertedProfile, error: upsertError } = await supabase
          .from('sleep_profiles')
          .upsert(profileData, {
            onConflict: 'email',
            ignoreDuplicates: false, // Update on conflict
          })
          .select('email, created_at, updated_at')
          .single();

        if (upsertError) {
          console.error("[analyze-sleep-quiz] UPSERT error:", upsertError);
        } else if (upsertedProfile) {
          // Determine if this was a create or update
          const createdAt = new Date(upsertedProfile.created_at).getTime();
          const updatedAt = new Date(upsertedProfile.updated_at).getTime();
          const isNew = Math.abs(updatedAt - createdAt) < 1000; // Within 1 second = new
          
          if (isNew) {
            profileCreated = true;
            console.log("[analyze-sleep-quiz] Profile CREATED via UPSERT for:", profileEmailToUse);
          } else {
            profileUpdated = true;
            console.log("[analyze-sleep-quiz] Profile UPDATED via UPSERT for:", profileEmailToUse);
          }
        }

        // TRIGGER FULL SLEEP SYNC using centralized function
        if ((profileCreated || profileUpdated) && profileEmailToUse) {
          console.log("[Sleep Sync] Triggering fullSleepSync for quiz completion:", profileEmailToUse);
          try {
            // Use fullSleepSync for complete 3-layer sync + Klaviyo
            await fullSleepSync(
              supabase,
              profileEmailToUse,
              'quiz' as SleepSyncSource,
              KLAVIYO_PRIVATE_API_KEY || undefined
            );
            console.log("[Sleep Sync] fullSleepSync completed for:", profileEmailToUse);
          } catch (syncError) {
            console.error("[Sleep Sync] Error:", syncError);
          }
        }
      } catch (profileError) {
        console.error("[analyze-sleep-quiz] Sleep profile creation error:", profileError);
      }
    }

    // Return combined response with legacy fields + new structured assessment
    return createSuccessResponse({ 
      ...analysis, 
      profileCreated, 
      profileUpdated,
      // NEW: Structured assessment for premium 5-section UI
      assessment: structuredAssessment,
    });
  } catch (error) {
    console.error("[analyze-sleep-quiz] Error:", error);
    return createErrorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});

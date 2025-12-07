/**
 * Analyze Sleep Quiz Edge Function
 * 
 * Analyzes quiz responses with AI (via AI Brain) and optionally creates Sleep Coach profile.
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
  syncAndStoreAttributes,
  sendKlaviyoEvent,
} from "../_shared/sleep-sync.ts";

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
    
    const { answers, email, createProfile } = parseResult.data;
    
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

    // For quiz flow: profile creation uses email (no JWT required)
    // If JWT provided, use authenticated email; otherwise use provided email
    let profileEmail: string | null = null;
    
    if (createProfile) {
      // Check if authenticated (optional for quiz flow)
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        try {
          const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } }
          });
          const { data: { user } } = await authClient.auth.getUser();
          if (user?.email) {
            profileEmail = user.email;
            console.log("[analyze-sleep-quiz] Using authenticated email:", profileEmail);
          }
        } catch (e) {
          console.log("[analyze-sleep-quiz] Auth check failed, using provided email");
        }
      }
      
      // Fall back to provided email if no auth
      if (!profileEmail && email) {
        profileEmail = email.toLowerCase().trim();
        console.log("[analyze-sleep-quiz] Using provided email for profile:", profileEmail);
      }
      
      if (!profileEmail) {
        return createErrorResponse("Email required for profile creation", 400);
      }
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

        await fetch("https://a.klaviyo.com/api/events/", {
          method: "POST",
          headers: {
            "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
            "Content-Type": "application/json",
            "revision": "2024-02-15",
          },
          body: JSON.stringify({
            data: {
              type: "event",
              attributes: {
                profile: { $email: trackingEmail },
                metric: { name: "Completed Sleep Quiz" },
                properties: {
                  sleep_position: answers.sleepPosition,
                  pain_points: answers.painPoints,
                  assessment: analysis.assessment,
                  recommendations: analysis.recommendations,
                  bundle_recommended: analysis.bundleRecommended,
                },
              },
            },
          }),
        });
        console.log("[Klaviyo] Quiz completion tracked for:", trackingEmail);
      } catch (klaviyoError) {
        console.error("[Klaviyo] Tracking error:", klaviyoError);
      }
    }

    // Create Sleep Coach profile if email available
    let profileCreated = false;
    if (createProfile && profileEmail) {
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
        const { data: existingProfile } = await supabase
          .from('sleep_profiles')
          .select('email')
          .eq('email', profileEmail)
          .single();

        const profileData = {
          email: profileEmail,
          sleep_position: sleepPositionMap[answers.sleepPosition] || 'mixed',
          pain_points: painData.filter((p: string) => p.toLowerCase() !== 'no pain' && p.toLowerCase() !== 'none'),
          stress_level: stressLevel,
          wake_up_condition: wakeUpCondition,
          temperature_preference: temperaturePreference,
        };

        if (!existingProfile) {
          const { error } = await supabase.from('sleep_profiles').insert(profileData);
          if (!error) {
            profileCreated = true;
            console.log("[analyze-sleep-quiz] Sleep Coach profile created for:", profileEmail);
          }
        } else {
          await supabase.from('sleep_profiles').update(profileData).eq('email', profileEmail);
          profileCreated = true;
          console.log("[analyze-sleep-quiz] Sleep Coach profile updated for:", profileEmail);
        }

        // TRIGGER SLEEP SYNC using centralized function
        if (profileCreated && KLAVIYO_PRIVATE_API_KEY) {
          console.log("[Sleep Sync] Triggering for quiz completion:", profileEmail);
          try {
            // Use single source of truth for Sleep Sync
            const { attributes, event } = await syncAndStoreAttributes(supabase, profileEmail, "quiz_completion");
            
            await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, profileEmail, event.eventName, event.payload);
            console.log("[Sleep Sync] Completed for:", profileEmail);
          } catch (syncError) {
            console.error("[Sleep Sync] Error:", syncError);
          }
        }
      } catch (profileError) {
        console.error("[analyze-sleep-quiz] Sleep profile creation error:", profileError);
      }
    }

    return createSuccessResponse({ ...analysis, profileCreated });
  } catch (error) {
    console.error("[analyze-sleep-quiz] Error:", error);
    return createErrorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});

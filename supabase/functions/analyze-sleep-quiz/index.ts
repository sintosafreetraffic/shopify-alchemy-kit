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

// Input validation schema
const answersSchema = z.object({
  sleepPosition: z.enum(['back', 'side', 'stomach', 'combination']),
  painPoints: z.array(z.string().max(100)).max(10),
  pillowIssues: z.array(z.string().max(100)).max(10),
  sleepGoals: z.array(z.string().max(100)).max(10),
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

    // Authenticate if profile creation requested
    let authenticatedEmail: string | null = null;
    if (createProfile) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return createErrorResponse("Authentication required to create profile", 401);
      }

      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: authError } = await authClient.auth.getUser();
      
      if (authError || !user?.email) {
        return createErrorResponse("Invalid authentication token", 401);
      }

      authenticatedEmail = user.email;

      if (email && email.toLowerCase() !== authenticatedEmail.toLowerCase()) {
        return createErrorResponse("Email does not match authenticated user", 403);
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Sanitize inputs
    const sanitizedAnswers = {
      sleepPosition: answers.sleepPosition,
      painPoints: answers.painPoints.map(p => p.replace(/[<>{}[\]`$]/g, '')),
      pillowIssues: answers.pillowIssues.map(p => p.replace(/[<>{}[\]`$]/g, '')),
      sleepGoals: answers.sleepGoals.map(g => g.replace(/[<>{}[\]`$]/g, '')),
    };

    // AI Analysis via centralized AI Brain (OpenAI)
    console.log("[analyze-sleep-quiz] Calling AI Brain for product recommendations");
    const analysis = await analyzeQuizForRecommendations(sanitizedAnswers);
    console.log("[analyze-sleep-quiz] AI analysis complete:", analysis.recommendations?.length, "recommendations");

    const trackingEmail = email;
    const profileEmail = authenticatedEmail || email;

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
                  sleep_position: answers.sleepPosition,
                  pain_points: answers.painPoints,
                  pillow_issues: answers.pillowIssues,
                  sleep_goals: answers.sleepGoals,
                  quiz_completed_at: new Date().toISOString(),
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

    // Create Sleep Coach profile if authenticated
    let profileCreated = false;
    if (createProfile && authenticatedEmail) {
      const sleepPositionMap: Record<string, string> = {
        'back': 'back',
        'side': 'side',
        'stomach': 'stomach',
        'combination': 'mixed'
      };

      const hasStressGoal = answers.sleepGoals?.some((g: string) => 
        g.toLowerCase().includes('stress') || g.toLowerCase().includes('better sleep')
      );
      const stressLevel = hasStressGoal ? 'high' : 'medium';

      const hasPain = answers.painPoints?.some((p: string) => p.toLowerCase() !== 'no pain');
      const wantsRefreshed = answers.sleepGoals?.includes('Wake up refreshed');
      let wakeUpCondition = 'neutral';
      if (hasPain) wakeUpCondition = 'stiff';
      else if (!wantsRefreshed) wakeUpCondition = 'tired';
      else if (!hasPain && wantsRefreshed) wakeUpCondition = 'energized';

      try {
        const { data: existingProfile } = await supabase
          .from('sleep_profiles')
          .select('email')
          .eq('email', authenticatedEmail)
          .single();

        const profileData = {
          email: authenticatedEmail,
          sleep_position: sleepPositionMap[answers.sleepPosition] || 'mixed',
          pain_points: answers.painPoints.filter((p: string) => p.toLowerCase() !== 'no pain'),
          stress_level: stressLevel,
          wake_up_condition: wakeUpCondition,
          temperature_preference: answers.pillowIssues?.includes('Gets too hot') ? 'cold' : 'neutral',
        };

        if (!existingProfile) {
          const { error } = await supabase.from('sleep_profiles').insert(profileData);
          if (!error) {
            profileCreated = true;
            console.log("[analyze-sleep-quiz] Sleep Coach profile created for:", authenticatedEmail);
          }
        } else {
          await supabase.from('sleep_profiles').update(profileData).eq('email', authenticatedEmail);
          profileCreated = true;
          console.log("[analyze-sleep-quiz] Sleep Coach profile updated for:", authenticatedEmail);
        }

        // TRIGGER SLEEP SYNC using centralized function
        if (profileCreated && KLAVIYO_PRIVATE_API_KEY) {
          console.log("[Sleep Sync] Triggering for quiz completion:", authenticatedEmail);
          try {
            // Use single source of truth for Sleep Sync
            const { attributes, event } = await syncAndStoreAttributes(supabase, authenticatedEmail, "quiz_completion");
            
            await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, authenticatedEmail, event.eventName, event.payload);
            console.log("[Sleep Sync] Completed for:", authenticatedEmail);
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

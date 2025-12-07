/**
 * Analyze Sleep Quiz Edge Function
 * 
 * Analyzes quiz responses with AI (via AI Brain) and optionally creates Sleep Coach profile.
 * Triggers Sleep Sync after profile creation.
 * 
 * Uses OPENAI_API_KEY via centralized AI Brain - NO Lovable AI.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { analyzeQuizForRecommendations } from "../_shared/ai-brain.ts";
import {
  generateSleepAttributes,
  buildSleepSyncEvent,
  sendKlaviyoEvent,
} from "../_shared/sleep-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const rawBody = await req.json();
    const parseResult = requestSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { answers, email, createProfile } = parseResult.data;
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
    const KLAVIYO_MAIN_LIST_ID = Deno.env.get("KLAVIYO_MAIN_LIST_ID");

    // Verify OPENAI_API_KEY is available
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate if profile creation requested
    let authenticatedEmail: string | null = null;
    if (createProfile) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authentication required to create profile" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: authError } = await authClient.auth.getUser();
      
      if (authError || !user?.email) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authenticatedEmail = user.email;

      if (email && email.toLowerCase() !== authenticatedEmail.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: "Email does not match authenticated user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
      } catch (klaviyoError) {
        console.error("Klaviyo tracking error:", klaviyoError);
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
            console.log("Sleep Coach profile created for:", authenticatedEmail);
          }
        } else {
          await supabase.from('sleep_profiles').update(profileData).eq('email', authenticatedEmail);
          profileCreated = true;
          console.log("Sleep Coach profile updated for:", authenticatedEmail);
        }

        // TRIGGER SLEEP SYNC after profile creation/update
        if (profileCreated && KLAVIYO_PRIVATE_API_KEY) {
          console.log("[Sleep Sync] Triggering for quiz completion:", authenticatedEmail);
          try {
            const attributes = await generateSleepAttributes(supabase, authenticatedEmail);
            const event = buildSleepSyncEvent(attributes, "quiz_completion");

            await supabase
              .from('sleep_attributes_state')
              .upsert({
                email: authenticatedEmail,
                data: attributes,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'email' });

            await supabase
              .from('sleep_attributes_history')
              .insert({ email: authenticatedEmail, data: attributes });

            await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, authenticatedEmail, event.eventName, event.payload);
            console.log("[Sleep Sync] Completed for:", authenticatedEmail);
          } catch (syncError) {
            console.error("[Sleep Sync] Error:", syncError);
          }
        }
      } catch (profileError) {
        console.error("Sleep profile creation error:", profileError);
      }
    }

    return new Response(
      JSON.stringify({ ...analysis, profileCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-sleep-quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

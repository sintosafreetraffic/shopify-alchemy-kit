import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const answersSchema = z.object({
  sleepPosition: z.enum(['back', 'side', 'stomach', 'combination']),
  painPoints: z.array(z.string().max(100, "Pain point too long")).max(10, "Too many pain points"),
  pillowIssues: z.array(z.string().max(100, "Pillow issue too long")).max(10, "Too many pillow issues"),
  sleepGoals: z.array(z.string().max(100, "Sleep goal too long")).max(10, "Too many sleep goals"),
});

const requestSchema = z.object({
  answers: answersSchema,
  email: z.string().email("Invalid email format").max(255, "Email too long").optional(),
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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
    const KLAVIYO_MAIN_LIST_ID = Deno.env.get("KLAVIYO_MAIN_LIST_ID");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // SECURITY: If createProfile is requested, require authentication
    let authenticatedEmail: string | null = null;
    if (createProfile) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authentication required to create profile" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the JWT and get user email
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: authError } = await authClient.auth.getUser();
      
      if (authError || !user?.email) {
        console.error("Auth error:", authError);
        return new Response(
          JSON.stringify({ error: "Invalid authentication token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authenticatedEmail = user.email;

      // SECURITY: Verify the provided email matches the authenticated user
      if (email && email.toLowerCase() !== authenticatedEmail.toLowerCase()) {
        console.error("Email mismatch - provided:", email, "authenticated:", authenticatedEmail);
        return new Response(
          JSON.stringify({ error: "Email does not match authenticated user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use service role client for database operations (only after auth verification)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const systemPrompt = `You are a sleep health expert for RiseByNight, analyzing customer sleep quiz responses to recommend products.

Available Products:
1. Rise By Night™ Ergonomic Sleep Pillow ($129.99) - Contoured memory foam pillow for neck/back pain relief, side and back sleepers
2. Rise By Night™ Ergonomic Knee Pillow ($69.99) - Memory foam knee pillow for hip alignment, side sleepers with lower back pain
3. Rise By Night™ Silk Deep Sleep Mask ($29.99) - Premium silk sleep mask for light blocking, all sleep positions
4. Rise By Night™ Complete Sleep Bundle ($149.99) - All three products bundled at a discount

Analyze the quiz responses and provide:
1. A personalized sleep assessment (2-3 sentences about their sleep issues)
2. Ranked product recommendations with specific reasons why each product helps THEIR specific situation
3. Bundle recommendation if multiple products would benefit them

Format your response EXACTLY as JSON with this structure:
{
  "assessment": "Personalized assessment text here",
  "recommendations": [
    {
      "product": "Product name",
      "reason": "Why this specific product helps their situation",
      "priority": "high" | "medium" | "low"
    }
  ],
  "bundleRecommended": true/false,
  "bundleReason": "Why the bundle is beneficial for them (if recommended)"
}`;

    // Sanitize user input to prevent prompt injection
    const sanitizedAnswers = {
      sleepPosition: answers.sleepPosition,
      painPoints: answers.painPoints.map(p => p.replace(/[<>{}[\]`$]/g, '')),
      pillowIssues: answers.pillowIssues.map(p => p.replace(/[<>{}[\]`$]/g, '')),
      sleepGoals: answers.sleepGoals.map(g => g.replace(/[<>{}[\]`$]/g, '')),
    };

    const userPrompt = `Sleep Quiz Responses:
Sleep Position: ${sanitizedAnswers.sleepPosition}
Pain Points: ${sanitizedAnswers.painPoints.join(", ")}
Current Pillow Issues: ${sanitizedAnswers.pillowIssues.join(", ")}
Sleep Goals: ${sanitizedAnswers.sleepGoals.join(", ")}

Analyze and recommend products.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error("No analysis returned from AI");
    }

    // Parse JSON from AI response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Use authenticated email for profile creation, provided email for Klaviyo tracking only
    const trackingEmail = email;
    const profileEmail = authenticatedEmail || email;

    // If email provided, track in Klaviyo (this is safe - just marketing tracking)
    if (trackingEmail && KLAVIYO_PRIVATE_API_KEY) {
      console.log("Tracking quiz completion for:", trackingEmail);
      
      // Create Klaviyo profile with quiz data
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
                  recommended_products: analysis.recommendations.map((r: { product: string }) => r.product),
                  bundle_recommended: analysis.bundleRecommended,
                }
              },
            },
          }),
        });

        const profileData = await profileResponse.json();
        console.log("Klaviyo profile created/updated:", profileData?.data?.id);

        // Subscribe to list if configured
        if (KLAVIYO_MAIN_LIST_ID && profileData?.data?.id) {
          await fetch(`https://a.klaviyo.com/api/lists/${KLAVIYO_MAIN_LIST_ID}/relationships/profiles/`, {
            method: "POST",
            headers: {
              "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
              "Content-Type": "application/json",
              "revision": "2024-02-15",
            },
            body: JSON.stringify({
              data: [{ type: "profile", id: profileData.data.id }],
            }),
          });
        }

        // Track quiz completion event
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
                  pillow_issues: answers.pillowIssues,
                  sleep_goals: answers.sleepGoals,
                  assessment: analysis.assessment,
                  recommendations: analysis.recommendations,
                  bundle_recommended: analysis.bundleRecommended,
                },
              },
            },
          }),
        });
        console.log("Klaviyo event tracked: Completed Sleep Quiz");
      } catch (klaviyoError) {
        console.error("Klaviyo tracking error:", klaviyoError);
      }
    }

    // Create Sleep Coach profile only if authenticated (already verified above)
    if (createProfile && authenticatedEmail) {
      // Map sleep position
      const sleepPositionMap: Record<string, string> = {
        'back': 'back',
        'side': 'side',
        'stomach': 'stomach',
        'combination': 'mixed'
      };

      // Infer stress level from quiz answers
      const hasStressGoal = answers.sleepGoals?.some((g: string) => 
        g.toLowerCase().includes('stress') || g.toLowerCase().includes('better sleep')
      );
      const stressLevel = hasStressGoal ? 'high' : 'medium';

      // Infer wake up condition from pain points and goals
      const hasPain = answers.painPoints?.some((p: string) => p.toLowerCase() !== 'no pain');
      const wantsRefreshed = answers.sleepGoals?.includes('Wake up refreshed');
      let wakeUpCondition = 'neutral';
      if (hasPain) wakeUpCondition = 'stiff';
      else if (!wantsRefreshed) wakeUpCondition = 'tired';
      else if (!hasPain && wantsRefreshed) wakeUpCondition = 'energized';

      try {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('sleep_profiles')
          .select('email')
          .eq('email', authenticatedEmail)
          .single();

        if (!existingProfile) {
          // Create new sleep profile from quiz data
          const { error: insertError } = await supabase
            .from('sleep_profiles')
            .insert({
              email: authenticatedEmail,
              sleep_position: sleepPositionMap[answers.sleepPosition] || 'mixed',
              pain_points: answers.painPoints.filter((p: string) => p.toLowerCase() !== 'no pain'),
              stress_level: stressLevel,
              wake_up_condition: wakeUpCondition,
              temperature_preference: answers.pillowIssues?.includes('Gets too hot') ? 'cold' : 'neutral',
            });

          if (insertError) {
            console.error("Error creating sleep profile:", insertError);
          } else {
            console.log("Sleep Coach profile created for:", authenticatedEmail);
          }
        } else {
          // Update existing profile
          await supabase
            .from('sleep_profiles')
            .update({
              sleep_position: sleepPositionMap[answers.sleepPosition] || 'mixed',
              pain_points: answers.painPoints.filter((p: string) => p.toLowerCase() !== 'no pain'),
              stress_level: stressLevel,
              wake_up_condition: wakeUpCondition,
              temperature_preference: answers.pillowIssues?.includes('Gets too hot') ? 'cold' : 'neutral',
            })
            .eq('email', authenticatedEmail);
          console.log("Sleep Coach profile updated for:", authenticatedEmail);
        }
      } catch (profileError) {
        console.error("Sleep profile creation error:", profileError);
      }
    }

    return new Response(
      JSON.stringify({ ...analysis, profileCreated: createProfile && !!authenticatedEmail }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-sleep-quiz:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

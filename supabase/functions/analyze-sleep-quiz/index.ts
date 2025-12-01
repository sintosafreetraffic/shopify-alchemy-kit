import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const userPrompt = `Sleep Quiz Responses:
Sleep Position: ${answers.sleepPosition}
Pain Points: ${answers.painPoints.join(", ")}
Current Pillow Issues: ${answers.pillowIssues.join(", ")}
Sleep Goals: ${answers.sleepGoals.join(", ")}

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

    return new Response(
      JSON.stringify(analysis),
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

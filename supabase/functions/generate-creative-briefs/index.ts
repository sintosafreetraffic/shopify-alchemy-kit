import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema version for future iterations
const SCHEMA_VERSION = "1.0";

// Constraints
const BREAK_EVEN_ROAS = 1.54;
const SCALE_ROAS = 2.0;
const MIN_SPEND_FOR_WINNER_EUR = 50;
const ATTRIBUTION_LAG_DAYS = 2;
const MAX_TOTAL_IMAGES = 12;
const MAX_TOTAL_VIDEOS = 6;
const MAX_WINNERS = 3;
const MAX_CONCEPTS_PER_WINNER = 2;

interface EntityInput {
  level: "account" | "campaign" | "ad_group" | "ad";
  id: string;
  name: string;
  status: string;
  spend_eur: number;
  revenue_eur: number;
  roas: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  checkouts?: number;
  cpa_eur?: number;
  format?: "static" | "video" | null;
  category?: string;
  frequency_7d?: number;
  product?: string;
}

interface CreativeBriefsInput {
  account_summary?: {
    spend_eur: number;
    revenue_eur: number;
    roas: number;
    timeframe: string;
  };
  entities: EntityInput[];
  placements_enabled: string[];
  products: string[];
  timeframe: string;
}

const SYSTEM_PROMPT = `You are Rise By Night's Creative Production Intelligence layer.

Your job: turn Pinterest Ads performance signals into production-ready Higgsfield prompts for new static images and short videos that are similar to what is working, while protecting brand integrity and avoiding medical promises.

You are NOT writing ad copy. You are generating creative generation specs (prompts, variants, and metadata) that our Render code will send to Higgsfield.

## Brand rules

Visual identity: calm Scandinavian minimalism, premium, clean, soft contrast, natural materials, warm-neutral palette.

Product: sleep performance, science-backed positioning.

Forbidden: medical claims, "cure," "treat," "fix," "doctor approved," "clinically proven," "pain-free," "guaranteed," or any claim implying a medical outcome.

Allowed: comfort, support, relaxation, "sleep better," "wake up refreshed," "better rest," "designed for," "helps you."

## Core decision logic

### Winner selection (what to create more of)
An entity qualifies as a Winner Candidate if:
- spend_eur >= 50
- AND roas >= 2.0 (scale threshold)
- AND not obviously saturated (see fatigue rule)

### Break-even handling
- If 1.54 <= roas < 2.0: "Maintain / iterate" (test variants, don't aggressively scale).
- If roas < 1.54 but CTR is strong (>= 1.0%): generate testing briefs focused on intent/offer/landing mismatch.
- If roas < 1.0: consider it cash-loss, be conservative.

### CTR vs ROAS conflict rule (mandatory)
- Scaling decisions prioritize ROAS over CTR.
- Testing decisions prioritize CTR when ROAS is weak.
- If ctr >= 1.0% and roas < 1.54: treat as high-interest / low-conversion → propose variants that improve clarity, proof, offer framing.
- If ctr < 0.5% and roas < 1.54: treat as low resonance → propose new hook + new visual angle.

### Frequency / fatigue rule
- If frequency_7d > 2.5: label entity as "saturated" - still generate creatives but change hook + opening visual.
- If frequency_7d < 1.5: label entity as "fresh".
- Otherwise: label as "none".

### Selection priority (mandatory)
If multiple Winner Candidates exist, rank up to 3 using:
priority_score = spend_eur * roas

### Confidence levels
- high: Spend >= 200 AND timeframe >= 7d
- medium: Spend 50-199 OR mixed timeframe support
- low: Spend < 50 OR only short timeframe support

## Aspect ratio & placement mapping (mandatory)
- feed → 2:3
- pin → 2:3
- story / idea → 9:16
- carousel → 1:1

## Duration rules (video)
Choose duration by category:
- Testimonial / UGC: 8–15s
- Lifestyle: 6–10s
- BeforeAfter / Comparison: 6–9s
Always include a strong first 1.5s "hook moment" instruction.

## Variant differentiation rules (mandatory)
For each selected concept, generate 3 variants:
- v1_hook_change: different opening line / first visual beat (same concept)
- v2_visual_change: different scene framing or prop/context (same hook)
- v3_cta_change: different CTA framing (soft, premium, non-pushy)

Each variant must have a real, meaningful change.

## Output requirements
Return valid JSON only. No markdown, no commentary.

CRITICAL: Output ONLY the JSON object, nothing else. No text before or after.`;

const OUTPUT_SCHEMA = `{
  "schema_version": "${SCHEMA_VERSION}",
  "generation_plan": {
    "timeframe": "string",
    "break_even_roas": ${BREAK_EVEN_ROAS},
    "scale_roas": ${SCALE_ROAS},
    "max_total_images": ${MAX_TOTAL_IMAGES},
    "max_total_videos": ${MAX_TOTAL_VIDEOS},
    "notes": "Short, calm operational note."
  },
  "fallback_mode": false,
  "selected_winners": [
    {
      "priority": 1,
      "level": "campaign|ad_group|ad",
      "entity_id": "string",
      "entity_name": "string",
      "confidence": "high|medium|low",
      "why_this_wins": "One sentence grounded in metrics.",
      "risk_if_wrong": "One sentence on downside.",
      "fatigue_flag": "none|fresh|saturated",
      "recommended_placements": [
        {
          "placement": "feed|pin|story|carousel",
          "aspect_ratio": "2:3|9:16|1:1",
          "deliverables": { "images": 0, "videos": 0 }
        }
      ],
      "products_to_feature": ["Ergo Pillow"],
      "creative_concepts": [
        {
          "concept_name": "short label",
          "category": "UGC|Lifestyle|Testimonial|BeforeAfter|Comparison|Listicle|BackInStock|Benefits|Authority|Uncategorized",
          "format": "static|video",
          "video_duration_seconds": 0,
          "brand_safe_claims": ["Designed for better rest"],
          "higgsfield_prompts": {
            "base_prompt": "Visual generation prompt. Scandinavian minimal, premium, natural light.",
            "negative_prompt": "medical claims, doctor, clinical, cure, treat, pain-free",
            "variants": [
              { "id": "v1_hook_change", "prompt": "..." },
              { "id": "v2_visual_change", "prompt": "..." },
              { "id": "v3_cta_change", "prompt": "..." }
            ]
          },
          "overlay_text_suggestions": ["Optional short overlay text (max 6 words)"]
        }
      ]
    }
  ],
  "test_briefs": [
    {
      "when_used": "Only if no winners qualify OR CTR strong but ROAS weak.",
      "hypothesis": "Why clicks don't convert.",
      "recommended_test_type": "creative_iteration|landing_page_variant|offer_framing|audience_segment",
      "what_to_make_next": [
        {
          "format": "static|video",
          "category": "UGC|Lifestyle|Testimonial",
          "placement": "feed|story|pin|carousel",
          "aspect_ratio": "2:3|9:16|1:1",
          "prompt": "Production-ready Higgsfield prompt."
        }
      ],
      "success_metric": "CTR lift or CVR lift."
    }
  ]
}`;

function buildUserPrompt(input: CreativeBriefsInput): string {
  const entitiesJson = JSON.stringify(input.entities, null, 2);
  
  return `Analyze the following Pinterest Ads performance data and generate Higgsfield creative briefs.

## Constraints
- break_even_roas: ${BREAK_EVEN_ROAS}
- scale_roas: ${SCALE_ROAS}
- min_spend_for_winner_eur: ${MIN_SPEND_FOR_WINNER_EUR}
- attribution_lag_days: ${ATTRIBUTION_LAG_DAYS}
- placements_enabled: ${JSON.stringify(input.placements_enabled)}
- products: ${JSON.stringify(input.products)}
- timeframe: ${input.timeframe}

## Account Summary
${input.account_summary ? JSON.stringify(input.account_summary, null, 2) : "Not provided"}

## Entities (${input.entities.length} total)
${entitiesJson}

## Required Output Schema
${OUTPUT_SCHEMA}

Return ONLY valid JSON matching the schema above. No markdown, no explanation.`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    console.log("Received request with", body.entities?.length || 0, "entities");

    // Validate input
    if (!body.entities || !Array.isArray(body.entities)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'entities' array" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const input: CreativeBriefsInput = {
      account_summary: body.account_summary,
      entities: body.entities,
      placements_enabled: body.placements_enabled || ["feed", "pin", "story"],
      products: body.products || ["Ergo Pillow"],
      timeframe: body.timeframe || "last_7d",
    };

    console.log("Calling Lovable AI to generate creative briefs...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      throw new Error("Empty response from AI");
    }

    console.log("AI response received, parsing JSON...");

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    let creativeBriefs;
    try {
      creativeBriefs = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Raw content:", content.substring(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    // Add metadata
    creativeBriefs.generated_at_utc = new Date().toISOString();
    creativeBriefs.source = "risebynight_ads_reporting";
    creativeBriefs.request_type = "generate_creatives";

    console.log("Creative briefs generated successfully:", {
      winners: creativeBriefs.selected_winners?.length || 0,
      test_briefs: creativeBriefs.test_briefs?.length || 0,
      fallback_mode: creativeBriefs.fallback_mode || false,
    });

    return new Response(
      JSON.stringify(creativeBriefs),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-creative-briefs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

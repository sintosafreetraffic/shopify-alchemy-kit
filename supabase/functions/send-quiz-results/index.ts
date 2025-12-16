/**
 * Send Quiz Results Email v3 - Curated Snapshot
 * 
 * DESIGN PHILOSOPHY:
 * - Accept FULL assessment payload (for analytics, Klaviyo, future templates)
 * - Render MINIMAL curated snapshot in email (premium, calm, scientific tone)
 * - No emojis, no hype, no marketing language
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Full payload schema - accepts everything, renders selectively
const requestSchema = z.object({
  email: z.string().email().max(255),
  sleepIdentity: z.object({
    position: z.string(),
    label: z.string(),
    description: z.string(),
  }),
  persona: z.object({
    cluster: z.string(),
    label: z.string(),
    description: z.string(),
    confidence_score: z.number().optional(),
    confidence_rationale: z.string().optional().nullable(),
    recommended_modules: z.array(z.number()).optional(),
    core_need: z.string().optional(),
  }),
  top_risk_drivers: z.array(z.string()).optional(),
  scores: z.object({
    spine_alignment_score: z.number().optional(),
    pillow_fit_score: z.number().optional(),
    nighttime_recovery_score: z.number().optional(),
    environment_score: z.number().optional(),
    light_sensitivity_score: z.number().optional(),
    temperature_disruption_score: z.number().optional(),
    alignment_risk_score: z.number().optional(),
    neck_support_score: z.number().optional(),
    sleep_stability_score: z.number().optional(),
  }).passthrough(),
  energy_potential_score: z.number().optional(),
  environmentFindings: z.object({
    keyIssues: z.array(z.string()),
    summary: z.string(),
  }).optional(),
  productRecommendations: z.object({
    primary: z.string(),
    secondary: z.string().optional().nullable(),
    bundle: z.string().optional().nullable(),
    reasoning: z.string().optional(),
    persona_reasoning: z.string().optional(),
    fit_explanation: z.string().optional(),
  }),
  coachReadinessLabel: z.string().optional(),
  coachReadinessRationale: z.string().optional(),
  coachPreview: z.object({
    day_1_3: z.string(),
    day_4_7: z.string(),
    day_7_14: z.string(),
  }).optional(),
  quiz_version: z.string().optional(),
  locale: z.string().optional(),
  traffic_source: z.string().optional(),
}).passthrough(); // Accept additional fields for future extensibility

type QuizResultsRequest = z.infer<typeof requestSchema>;

// Brand colors
const BRAND_PRIMARY = "#3e81e0";
const BRAND_DARK = "#0f172a";
const BRAND_LIGHT_BG = "#f8fafc";

// Product display info
const PRODUCT_DISPLAY: Record<string, { name: string; route: string }> = {
  ergonomic_pillow: { 
    name: "Rise By Night™ Ergonomic Sleep Pillow", 
    route: "/product/ergonomic-pillow",
  },
  knee_pillow: { 
    name: "Rise By Night™ Ergonomic Knee Pillow", 
    route: "/product/knee-pillow",
  },
  silk_mask: { 
    name: "Rise By Night™ Silk Sleep Mask", 
    route: "/product/sleep-mask",
  },
};

// Helper to get confidence label
function getConfidenceLabel(score: number): string {
  if (score >= 75) return "High confidence match";
  if (score >= 50) return "Good match";
  return "Closest match";
}

// Helper to humanize risk driver
function humanizeRiskDriver(driver: string): string {
  const map: Record<string, string> = {
    "neck_shoulder_tension": "Neck and shoulder tension may be affecting your sleep quality",
    "pillow_support_inadequate": "Your current pillow may not be providing adequate support",
    "light_sensitivity": "Light exposure could be disrupting your sleep depth",
    "temperature_disruption": "Temperature regulation may need attention",
    "sleep_latency": "Time to fall asleep could be optimized",
    "frequent_awakenings": "Nighttime awakenings may be fragmenting your rest",
    "morning_stiffness": "Morning stiffness suggests alignment opportunities",
    "stress_activation": "Evening stress patterns may be affecting sleep onset",
    "screen_time": "Screen exposure before bed could be impacting sleep quality",
  };
  return map[driver] || driver.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Helper to get score color
function getScoreColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 45) return "#f59e0b";
  return "#ef4444";
}

// Generate MINIMAL curated email HTML
function generateEmailHTML(data: QuizResultsRequest): string {
  const baseUrl = "https://www.risebynight.com";
  const logoUrl = "https://www.risebynight.com/favicon-192.png";
  
  const primaryProduct = PRODUCT_DISPLAY[data.productRecommendations.primary] || 
    { name: data.productRecommendations.primary, route: "/" };
  
  const confidenceScore = data.persona.confidence_score ?? 70;
  const confidenceLabel = getConfidenceLabel(confidenceScore);
  
  // Get first 1-2 risk drivers for insights
  const topInsights = (data.top_risk_drivers || []).slice(0, 2);
  
  // Calculate display scores
  const spineScore = data.scores.spine_alignment_score ?? (100 - (data.scores.alignment_risk_score || 30));
  const energyScore = data.energy_potential_score ?? 65;
  
  // Get first focus from coach preview
  const firstFocus = data.coachPreview?.day_1_3 || "Establishing proper pillow positioning and alignment fundamentals";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Sleep Profile Snapshot - Rise By Night</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          
          <!-- Header - Clean, minimal -->
          <tr>
            <td style="background: ${BRAND_DARK}; padding: 32px 28px; text-align: center;">
              <img src="${logoUrl}" alt="Rise By Night" width="48" height="48" style="display: block; margin: 0 auto 16px; border-radius: 12px; background: white; padding: 3px;" />
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 6px; letter-spacing: -0.3px;">Your Sleep Profile Snapshot</h1>
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">Based on your science-backed assessment</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 28px;">
              
              <!-- Section 1: Identity Snapshot -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <!-- Persona with confidence badge -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f7ff 0%, #e8f2ff 100%); border-radius: 14px; border: 1px solid #d4e5fc;">
                      <tr>
                        <td style="padding: 24px;">
                          <span style="display: inline-block; background: ${BRAND_PRIMARY}; color: white; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">${confidenceLabel}</span>
                          <h2 style="font-size: 18px; color: ${BRAND_DARK}; font-weight: 600; margin: 8px 0 10px;">${data.persona.label}</h2>
                          <p style="font-size: 14px; color: #475569; line-height: 1.55; margin: 0;">${data.persona.description}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Section 2: Key Insights (max 2) -->
              ${topInsights.length > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">Key Insights</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND_LIGHT_BG}; border-radius: 12px; border: 1px solid #e2e8f0;">
                      ${topInsights.map((driver, i) => `
                      <tr>
                        <td style="padding: 14px 16px;${i < topInsights.length - 1 ? ' border-bottom: 1px solid #e2e8f0;' : ''}">
                          <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">${humanizeRiskDriver(driver)}</p>
                        </td>
                      </tr>
                      `).join('')}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Section 3: Primary Product Recommendation -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">Recommended For You</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND_DARK}; border-radius: 14px;">
                      <tr>
                        <td style="padding: 24px; text-align: center;">
                          <h3 style="font-size: 16px; color: #ffffff; font-weight: 600; margin: 0 0 10px;">${primaryProduct.name}</h3>
                          <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 18px; line-height: 1.5;">
                            ${data.productRecommendations.persona_reasoning || `Selected based on your ${data.sleepIdentity.position} sleeping position and assessment results.`}
                          </p>
                          <a href="${baseUrl}${primaryProduct.route}" style="display: inline-block; background: ${BRAND_PRIMARY}; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;">View Product</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Section 4: Progress Snapshot (teaser - 2 scores only) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">Your Snapshot Scores</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Spine Alignment -->
                        <td width="48%" style="background: ${BRAND_LIGHT_BG}; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0;">
                          <p style="font-size: 11px; color: #64748b; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">Spine Alignment</p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <span style="font-size: 24px; font-weight: 700; color: ${getScoreColor(spineScore)};">${spineScore}%</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-top: 8px;">
                                <div style="height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                                  <div style="height: 100%; width: ${spineScore}%; background: ${getScoreColor(spineScore)}; border-radius: 2px;"></div>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td width="4%"></td>
                        <!-- Morning Energy -->
                        <td width="48%" style="background: ${BRAND_LIGHT_BG}; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0;">
                          <p style="font-size: 11px; color: #64748b; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">Energy Potential</p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <span style="font-size: 24px; font-weight: 700; color: ${getScoreColor(energyScore)};">${energyScore}%</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-top: 8px;">
                                <div style="height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                                  <div style="height: 100%; width: ${energyScore}%; background: ${getScoreColor(energyScore)}; border-radius: 2px;"></div>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Section 5: Coach Plan Teaser -->
              ${data.coachPreview ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">Your First Focus</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
                      <tr>
                        <td style="padding: 18px;">
                          <p style="font-size: 13px; color: #166534; margin: 0; line-height: 1.55;">${firstFocus}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Section 6: CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, #2563eb 100%); border-radius: 14px;">
                <tr>
                  <td style="padding: 28px; text-align: center;">
                    <h3 style="font-size: 17px; color: #ffffff; font-weight: 600; margin: 0 0 10px;">Your Full Sleep Profile Awaits</h3>
                    <p style="font-size: 13px; color: rgba(255,255,255,0.85); margin: 0 0 20px; line-height: 1.5;">Access detailed scores, environment insights, and your personalized coaching plan.</p>
                    <a href="${baseUrl}/sleep-coach" style="display: inline-block; background: #ffffff; color: ${BRAND_PRIMARY}; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Your Full Sleep Profile</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer - Minimal -->
          <tr>
            <td style="background: ${BRAND_LIGHT_BG}; padding: 24px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 8px;">Questions? <a href="mailto:support@risebynight.com" style="color: ${BRAND_PRIMARY}; text-decoration: none;">support@risebynight.com</a></p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} Rise By Night. Loofdakstraat 10, 3036JN Rotterdam</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const body = await req.json();
    
    // Log full payload for analytics/debugging (but don't expose in response)
    console.log("[send-quiz-results] Full payload received:", JSON.stringify({
      email: body.email,
      persona_cluster: body.persona?.cluster,
      quiz_version: body.quiz_version,
      traffic_source: body.traffic_source,
      score_count: Object.keys(body.scores || {}).length,
      risk_driver_count: (body.top_risk_drivers || []).length,
    }));
    
    // Validate input
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.flatten());
      return new Response(
        JSON.stringify({ error: "Invalid request data", details: parseResult.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = parseResult.data;
    console.log(`[send-quiz-results] Sending curated snapshot email to: ${data.email}`);

    // Generate minimal HTML email
    const htmlContent = generateEmailHTML(data);

    // Send email using verified domain
    const emailResponse = await resend.emails.send({
      from: "Rise By Night <results@send.risebynight.com>",
      to: [data.email],
      subject: `Your Sleep Profile Snapshot`,
      html: htmlContent,
    });

    console.log("[send-quiz-results] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, response: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send email";
    console.error("[send-quiz-results] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

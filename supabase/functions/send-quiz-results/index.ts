/**
 * Send Quiz Results Email
 * 
 * Sends a beautifully formatted sleep quiz results email to the user.
 * Uses Resend for email delivery with a premium HTML template.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
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
    rationale: z.string().optional(),
    confidence: z.number().optional(),
  }),
  scores: z.object({
    alignment_risk_score: z.number(),
    neck_support_score: z.number(),
    sleep_stability_score: z.number(),
    environment_score: z.number(),
  }),
  productRecommendations: z.object({
    primary_product: z.string(),
    secondary_product: z.string().optional().nullable(),
    recommended_bundle: z.string().optional().nullable(),
    persona_reasoning: z.string().optional(),
  }),
  environmentFindings: z.object({
    keyIssues: z.array(z.string()),
    summary: z.string(),
  }).optional(),
  topRiskDrivers: z.array(z.string()).optional(),
  coachReadinessLabel: z.string().optional(),
  energyPotentialScore: z.number().optional(),
});

type QuizResultsRequest = z.infer<typeof requestSchema>;

// Brand colors
const BRAND_PRIMARY = "#3e81e0";
const BRAND_DARK = "#0f172a";
const BRAND_GOLD = "#fcd34d";

// Helper to get score color
function getScoreColor(score: number): string {
  if (score >= 75) return "#10b981"; // emerald
  if (score >= 50) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

// Helper to get score label
function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 45) return "Moderate";
  return "Needs attention";
}

// Generate HTML email template
function generateEmailHTML(data: QuizResultsRequest): string {
  const baseUrl = "https://www.risebynight.com";
  const logoUrl = `${baseUrl}/favicon-192.png`;
  
  const productRoutes: Record<string, { name: string; route: string }> = {
    ergonomic_pillow: { name: "Rise By Night™ Ergonomic Sleep Pillow", route: "/product/ergonomic-pillow" },
    knee_pillow: { name: "Rise By Night™ Ergonomic Knee Pillow", route: "/product/knee-pillow" },
    silk_mask: { name: "Rise By Night™ Silk Sleep Mask", route: "/product/sleep-mask" },
  };

  const primaryProduct = productRoutes[data.productRecommendations.primary_product] || 
    { name: data.productRecommendations.primary_product, route: "/" };
  
  const riskDriversHtml = data.topRiskDrivers?.map(driver => 
    `<span style="display: inline-block; background: #e0edff; color: ${BRAND_PRIMARY}; padding: 6px 14px; border-radius: 20px; font-size: 13px; margin: 4px; font-weight: 500;">${driver.replace(/_/g, ' ')}</span>`
  ).join('') || '';

  const keyIssuesHtml = data.environmentFindings?.keyIssues?.map(issue =>
    `<li style="margin-bottom: 10px; color: #475569; font-size: 14px;">${issue}</li>`
  ).join('') || '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Sleep Assessment Results - Rise By Night</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header with Logo -->
    <div style="background: linear-gradient(135deg, ${BRAND_DARK} 0%, #1e3a5f 100%); padding: 32px 30px; text-align: center;">
      <img src="${logoUrl}" alt="Rise By Night" width="56" height="56" style="display: block; margin: 0 auto 16px; border-radius: 12px;" />
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0 0 6px; letter-spacing: -0.3px;">Your Sleep Assessment Results</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">Personalized insights from Rise By Night</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px 28px;">
      
      <!-- Sleep Identity -->
      <div style="margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px;">Your Sleep Identity</p>
        <h2 style="font-size: 20px; color: ${BRAND_DARK}; font-weight: 600; margin: 0 0 10px;">${data.sleepIdentity.label}</h2>
        <p style="font-size: 15px; color: #64748b; line-height: 1.6; margin: 0;">${data.sleepIdentity.description}</p>
      </div>

      <!-- Persona Card -->
      <div style="background: linear-gradient(135deg, #f0f7ff 0%, #e8f2ff 100%); border-radius: 16px; padding: 24px; margin-bottom: 28px; border: 1px solid #d4e5fc;">
        <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px;">Your Sleep Persona</p>
        <h3 style="font-size: 18px; color: ${BRAND_DARK}; font-weight: 600; margin: 0 0 10px;">${data.persona.label}</h3>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 14px;">${data.persona.description}</p>
        ${data.persona.rationale ? `
        <div style="border-top: 1px solid #c7dcf7; padding-top: 14px; margin-top: 14px;">
          <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Why This Matches You</p>
          <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">${data.persona.rationale}</p>
        </div>
        ` : ''}
      </div>

      <!-- Key Focus Areas -->
      ${data.topRiskDrivers && data.topRiskDrivers.length > 0 ? `
      <div style="margin-bottom: 28px;">
        <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">Key Focus Areas</p>
        <div>
          ${riskDriversHtml}
        </div>
      </div>
      ` : ''}

      <!-- Scores Section -->
      <div style="margin-bottom: 28px; background: #fafbfc; border-radius: 12px; padding: 20px;">
        <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px;">Your Sleep Scores</p>
        
        <div style="margin-bottom: 14px;">
          <div style="margin-bottom: 6px;">
            <span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Neck Support</span>
            <span style="font-size: 12px; color: ${getScoreColor(data.scores.neck_support_score)}; float: right; font-weight: 600;">${getScoreLabel(data.scores.neck_support_score)}</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${data.scores.neck_support_score}%; background: ${getScoreColor(data.scores.neck_support_score)}; border-radius: 3px;"></div>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="margin-bottom: 6px;">
            <span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Sleep Stability</span>
            <span style="font-size: 12px; color: ${getScoreColor(data.scores.sleep_stability_score)}; float: right; font-weight: 600;">${getScoreLabel(data.scores.sleep_stability_score)}</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${data.scores.sleep_stability_score}%; background: ${getScoreColor(data.scores.sleep_stability_score)}; border-radius: 3px;"></div>
          </div>
        </div>

        <div>
          <div style="margin-bottom: 6px;">
            <span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Environment</span>
            <span style="font-size: 12px; color: ${getScoreColor(data.scores.environment_score)}; float: right; font-weight: 600;">${getScoreLabel(data.scores.environment_score)}</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${data.scores.environment_score}%; background: ${getScoreColor(data.scores.environment_score)}; border-radius: 3px;"></div>
          </div>
        </div>
      </div>

      <!-- Environment Findings -->
      ${data.environmentFindings && data.environmentFindings.keyIssues.length > 0 ? `
      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid #bbf7d0;">
        <p style="font-size: 11px; color: #166534; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">Environment Insights</p>
        <ul style="margin: 0 0 12px; padding-left: 18px;">
          ${keyIssuesHtml}
        </ul>
        <p style="font-size: 13px; color: #475569; margin: 0; font-style: italic;">${data.environmentFindings.summary}</p>
      </div>
      ` : ''}

      <!-- Product Recommendation -->
      <div style="background: linear-gradient(135deg, ${BRAND_DARK} 0%, #1e3a5f 100%); border-radius: 16px; padding: 28px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Recommended For You</p>
        <h3 style="font-size: 17px; color: #ffffff; font-weight: 600; margin: 0 0 12px;">${primaryProduct.name}</h3>
        ${data.productRecommendations.persona_reasoning ? `
        <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 20px; line-height: 1.5;">${data.productRecommendations.persona_reasoning}</p>
        ` : ''}
        <a href="${baseUrl}${primaryProduct.route}" style="display: inline-block; background: ${BRAND_PRIMARY}; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Product →</a>
      </div>

      <!-- Sleep Coach CTA - Prominent -->
      <div style="background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, #2563eb 100%); border-radius: 16px; padding: 28px; text-align: center;">
        <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 50%; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 24px;">🎯</span>
        </div>
        <h3 style="font-size: 18px; color: #ffffff; font-weight: 600; margin: 0 0 8px;">Ready for Personalized Coaching?</h3>
        <p style="font-size: 14px; color: rgba(255,255,255,0.85); margin: 0 0 6px;">Get a custom 7-day sleep plan tailored to your profile</p>
        ${data.coachReadinessLabel ? `
        <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin: 0 0 18px;">Your Coach Readiness: <strong style="color: #ffffff;">${data.coachReadinessLabel}</strong></p>
        ` : ''}
        <a href="${baseUrl}/sleep-coach" style="display: inline-block; background: #ffffff; color: ${BRAND_PRIMARY}; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Access Sleep Coach →</a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 28px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <img src="${logoUrl}" alt="Rise By Night" width="36" height="36" style="display: block; margin: 0 auto 12px; border-radius: 8px; opacity: 0.7;" />
      <p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">Questions? We're here to help.</p>
      <a href="mailto:support@risebynight.com" style="color: ${BRAND_PRIMARY}; text-decoration: none; font-size: 13px; font-weight: 500;">support@risebynight.com</a>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} Rise By Night. All rights reserved.</p>
        <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0;">Loofdakstraat 10, 3036JN Rotterdam</p>
      </div>
    </div>

  </div>
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
    
    // Validate input
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error);
      return new Response(
        JSON.stringify({ error: "Invalid request data", details: parseResult.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = parseResult.data;
    console.log(`Sending quiz results email to: ${data.email}`);

    // Generate HTML email
    const htmlContent = generateEmailHTML(data);

    // Send email using verified domain
    const emailResponse = await resend.emails.send({
      from: "Rise By Night <results@send.risebynight.com>",
      to: [data.email],
      subject: `Your Sleep Assessment Results - ${data.persona.label}`,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send email";
    console.error("Error sending quiz results email:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

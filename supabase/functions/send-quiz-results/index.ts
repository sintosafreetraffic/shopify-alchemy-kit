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
  
  const productRoutes: Record<string, { name: string; route: string }> = {
    ergonomic_pillow: { name: "Rise By Night™ Ergonomic Sleep Pillow", route: "/product/ergonomic-pillow" },
    knee_pillow: { name: "Rise By Night™ Ergonomic Knee Pillow", route: "/product/knee-pillow" },
    silk_mask: { name: "Rise By Night™ Silk Sleep Mask", route: "/product/sleep-mask" },
  };

  const primaryProduct = productRoutes[data.productRecommendations.primary_product] || 
    { name: data.productRecommendations.primary_product, route: "/" };
  
  const riskDriversHtml = data.topRiskDrivers?.map(driver => 
    `<span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; margin: 3px;">${driver.replace(/_/g, ' ')}</span>`
  ).join('') || '';

  const keyIssuesHtml = data.environmentFindings?.keyIssues?.map(issue =>
    `<li style="margin-bottom: 8px; color: #475569;">${issue}</li>`
  ).join('') || '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Sleep Assessment Results - Rise By Night</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 40px 30px; text-align: center;">
      <div style="width: 60px; height: 60px; background: #fcd34d; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">🌙</span>
      </div>
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 8px;">Your Sleep Assessment Results</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">Personalized analysis by Rise By Night</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px;">
      
      <!-- Sleep Identity -->
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; color: #64748b; font-weight: 500; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Your Sleep Identity</h2>
        <h3 style="font-size: 20px; color: #0f172a; font-weight: 600; margin: 0 0 12px;">${data.sleepIdentity.label}</h3>
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0;">${data.sleepIdentity.description}</p>
      </div>

      <!-- Persona -->
      <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <h2 style="font-size: 16px; color: #7c3aed; font-weight: 500; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Your Sleep Persona</h2>
        <h3 style="font-size: 18px; color: #0f172a; font-weight: 600; margin: 0 0 12px;">${data.persona.label}</h3>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 12px;">${data.persona.description}</p>
        ${data.persona.rationale ? `
        <div style="border-top: 1px solid #ddd6fe; padding-top: 12px; margin-top: 12px;">
          <p style="font-size: 12px; color: #7c3aed; font-weight: 500; margin: 0 0 4px;">Why this matches you</p>
          <p style="font-size: 13px; color: #64748b; margin: 0;">${data.persona.rationale}</p>
        </div>
        ` : ''}
      </div>

      <!-- Key Focus Areas -->
      ${data.topRiskDrivers && data.topRiskDrivers.length > 0 ? `
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; color: #64748b; font-weight: 500; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Key Focus Areas</h2>
        <div style="margin-bottom: 8px;">
          ${riskDriversHtml}
        </div>
      </div>
      ` : ''}

      <!-- Scores -->
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; color: #64748b; font-weight: 500; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;">Your Sleep Scores</h2>
        
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 14px; color: #0f172a;">Neck Support</span>
            <span style="font-size: 13px; color: ${getScoreColor(data.scores.neck_support_score)};">${getScoreLabel(data.scores.neck_support_score)}</span>
          </div>
          <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${data.scores.neck_support_score}%; background: ${getScoreColor(data.scores.neck_support_score)}; border-radius: 4px;"></div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 14px; color: #0f172a;">Sleep Stability</span>
            <span style="font-size: 13px; color: ${getScoreColor(data.scores.sleep_stability_score)};">${getScoreLabel(data.scores.sleep_stability_score)}</span>
          </div>
          <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${data.scores.sleep_stability_score}%; background: ${getScoreColor(data.scores.sleep_stability_score)}; border-radius: 4px;"></div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 14px; color: #0f172a;">Environment</span>
            <span style="font-size: 13px; color: ${getScoreColor(data.scores.environment_score)};">${getScoreLabel(data.scores.environment_score)}</span>
          </div>
          <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${data.scores.environment_score}%; background: ${getScoreColor(data.scores.environment_score)}; border-radius: 4px;"></div>
          </div>
        </div>
      </div>

      <!-- Environment Findings -->
      ${data.environmentFindings && data.environmentFindings.keyIssues.length > 0 ? `
      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <h2 style="font-size: 16px; color: #166534; font-weight: 500; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Environment Insights</h2>
        <ul style="margin: 0 0 12px; padding-left: 20px;">
          ${keyIssuesHtml}
        </ul>
        <p style="font-size: 13px; color: #475569; margin: 0; font-style: italic;">${data.environmentFindings.summary}</p>
      </div>
      ` : ''}

      <!-- Product Recommendation -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); border-radius: 12px; padding: 24px; margin-bottom: 28px; text-align: center;">
        <h2 style="font-size: 14px; color: #94a3b8; font-weight: 500; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Recommended For You</h2>
        <h3 style="font-size: 18px; color: #ffffff; font-weight: 600; margin: 0 0 12px;">${primaryProduct.name}</h3>
        ${data.productRecommendations.persona_reasoning ? `
        <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 20px; line-height: 1.5;">${data.productRecommendations.persona_reasoning}</p>
        ` : ''}
        <a href="${baseUrl}${primaryProduct.route}" style="display: inline-block; background: #fcd34d; color: #0f172a; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Product →</a>
      </div>

      <!-- Coach CTA -->
      ${data.coachReadinessLabel ? `
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
        <h3 style="font-size: 16px; color: #0f172a; font-weight: 600; margin: 0 0 8px;">🎯 Ready for Personalized Coaching?</h3>
        <p style="font-size: 14px; color: #64748b; margin: 0 0 16px;">Your Coach Readiness: <strong>${data.coachReadinessLabel}</strong></p>
        <a href="${baseUrl}/sleep-coach" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">Access Sleep Coach</a>
      </div>
      ` : ''}

    </div>

    <!-- Footer -->
    <div style="background: #f1f5f9; padding: 24px 30px; text-align: center;">
      <p style="font-size: 13px; color: #64748b; margin: 0 0 12px;">Questions? Reply to this email or contact us at</p>
      <a href="mailto:support@risebynight.com" style="color: #7c3aed; text-decoration: none; font-size: 13px;">support@risebynight.com</a>
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

    // Send email (using onboarding@resend.dev until risebynight.com is verified)
    const emailResponse = await resend.emails.send({
      from: "Rise By Night <onboarding@resend.dev>",
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

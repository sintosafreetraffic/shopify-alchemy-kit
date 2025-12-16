/**
 * Send Quiz Results Email v2
 * 
 * Sends a comprehensive sleep assessment results email matching the UI exactly.
 * Uses Resend for email delivery with a premium HTML template.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema - matches SleepAssessment structure
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
    recommended_modules: z.array(z.number()).optional(),
  }),
  scores: z.object({
    alignment_risk_score: z.number(),
    neck_support_score: z.number(),
    sleep_stability_score: z.number(),
    environment_score: z.number(),
    light_sensitivity_score: z.number().optional(),
    temperature_disruption_score: z.number().optional(),
  }),
  productRecommendations: z.object({
    primary_product: z.string(),
    secondary_product: z.string().optional().nullable(),
    recommended_bundle: z.string().optional().nullable(),
    persona_reasoning: z.string().optional(),
    fit_explanation: z.string().optional(),
  }),
  environmentFindings: z.object({
    keyIssues: z.array(z.string()),
    summary: z.string(),
  }).optional(),
  topRiskDrivers: z.array(z.string()).optional(),
  coachReadinessLabel: z.string().optional(),
  coachReadinessRationale: z.string().optional(),
  energyPotentialScore: z.number().optional(),
  coachPreview: z.object({
    day_1_3: z.string(),
    day_4_7: z.string(),
    day_7_14: z.string(),
  }).optional(),
});

type QuizResultsRequest = z.infer<typeof requestSchema>;

// Brand colors
const BRAND_PRIMARY = "#3e81e0";
const BRAND_DARK = "#0f172a";

// Module definitions matching frontend
const MODULE_DEFINITIONS: Record<number, { name: string; description: string }> = {
  4: { name: "Alignment Fundamentals", description: "Core spinal alignment principles" },
  6: { name: "Environment Optimization", description: "Light, noise, and temperature control" },
  7: { name: "Temperature Regulation", description: "Optimal sleep temperature strategies" },
  8: { name: "Deep Sleep Enhancement", description: "Maximizing restorative sleep phases" },
  9: { name: "Evening Routine Reset", description: "Wind-down protocols for better sleep onset" },
  10: { name: "Morning Mobility", description: "Gentle morning movement practices" },
  11: { name: "Hip & Lower Body", description: "Lower body alignment techniques" },
  12: { name: "Sleep Hygiene Foundations", description: "Daily habits that support consistent, higher-quality sleep" },
};

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

// Product display info
const PRODUCT_DISPLAY: Record<string, { name: string; route: string; description: string }> = {
  ergonomic_pillow: { 
    name: "Rise By Night™ Ergonomic Sleep Pillow", 
    route: "/product/ergonomic-pillow",
    description: "Contoured memory foam designed for cervical support",
  },
  knee_pillow: { 
    name: "Rise By Night™ Ergonomic Knee Pillow", 
    route: "/product/knee-pillow",
    description: "Hip alignment and lower back comfort for side sleepers",
  },
  silk_mask: { 
    name: "Rise By Night™ Silk Sleep Mask", 
    route: "/product/sleep-mask",
    description: "Complete light blocking for uninterrupted deep sleep",
  },
};

const BUNDLE_DISPLAY: Record<string, { name: string; description: string }> = {
  alignment_set: { name: "Alignment Set", description: "Complete spinal support from neck to hips" },
  deep_sleep_set: { name: "Deep Sleep Set", description: "Optimized support with complete darkness" },
  performance_set: { name: "Performance Set", description: "Full optimization for maximum recovery" },
};

// Generate HTML email template
function generateEmailHTML(data: QuizResultsRequest): string {
  const baseUrl = "https://www.risebynight.com";
  // Using a hosted logo URL that works reliably in emails
  const logoUrl = "https://www.risebynight.com/favicon-192.png";
  
  const primaryProduct = PRODUCT_DISPLAY[data.productRecommendations.primary_product] || 
    { name: data.productRecommendations.primary_product, route: "/", description: "" };
  
  const secondaryProduct = data.productRecommendations.secondary_product 
    ? PRODUCT_DISPLAY[data.productRecommendations.secondary_product]
    : null;
    
  const bundle = data.productRecommendations.recommended_bundle
    ? BUNDLE_DISPLAY[data.productRecommendations.recommended_bundle]
    : null;
  
  // Risk drivers as tags
  const riskDriversHtml = data.topRiskDrivers?.map(driver => 
    `<span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 20px; font-size: 12px; margin: 4px; font-weight: 500;">${driver.replace(/_/g, ' ')}</span>`
  ).join('') || '';

  // Environment findings
  const keyIssuesHtml = data.environmentFindings?.keyIssues?.map(issue =>
    `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;"><p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">${issue}</p></td></tr>`
  ).join('') || '';

  // Recommended modules
  const modulesHtml = data.persona.recommended_modules?.map(moduleNum => {
    const mod = MODULE_DEFINITIONS[moduleNum];
    return mod ? `
    <tr>
      <td style="padding: 10px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 10px;">
          <tr>
            <td width="44" style="padding: 12px; text-align: center; vertical-align: middle;">
              <div style="width: 32px; height: 32px; line-height: 32px; text-align: center; background: ${BRAND_PRIMARY}; color: white; border-radius: 50%; font-weight: 600; font-size: 14px;">${moduleNum}</div>
            </td>
            <td style="padding: 12px 12px 12px 0;">
              <p style="margin: 0 0 2px; font-size: 14px; font-weight: 600; color: ${BRAND_DARK};">${mod.name}</p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">${mod.description}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ` : '';
  }).join('') || '';

  // Confidence label
  const confidencePercent = Math.round((data.persona.confidence || 70));
  const confidenceLabel = confidencePercent >= 75 ? 'High match' : confidencePercent >= 50 ? 'Good match' : 'Closest match';

  // Calculate scores for display
  const alignmentRiskLabel = getScoreLabel(100 - data.scores.alignment_risk_score);
  const neckSupportLabel = getScoreLabel(data.scores.neck_support_score);
  const sleepStabilityLabel = getScoreLabel(data.scores.sleep_stability_score);
  const environmentLabel = getScoreLabel(data.scores.environment_score);
  const lightSensitivityLabel = getScoreLabel(100 - (data.scores.light_sensitivity_score || 50));
  const temperatureLabel = getScoreLabel(100 - (data.scores.temperature_disruption_score || 30));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Sleep Assessment Results - Rise By Night</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_DARK} 0%, #1e3a5f 100%); padding: 36px 32px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <img src="${logoUrl}" alt="Rise By Night" width="56" height="56" style="display: block; margin: 0 auto 18px; border-radius: 14px; background: white; padding: 4px;" />
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.3px;">Your Sleep Assessment Results</h1>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">Personalized insights from Rise By Night</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 28px;">
              
              <!-- Sleep Identity -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid #e2e8f0;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1.2px;">Your Sleep Identity</p>
                    <h2 style="font-size: 22px; color: ${BRAND_DARK}; font-weight: 600; margin: 0 0 12px; line-height: 1.3;">${data.sleepIdentity.label}</h2>
                    <p style="font-size: 15px; color: #64748b; line-height: 1.65; margin: 0;">${data.sleepIdentity.description}</p>
                  </td>
                </tr>
              </table>

              <!-- Persona Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f7ff 0%, #e8f2ff 100%); border-radius: 16px; margin-bottom: 28px; border: 1px solid #d4e5fc;">
                <tr>
                  <td style="padding: 26px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="display: inline-block; background: ${BRAND_PRIMARY}; color: white; font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">${confidenceLabel}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 1px;">Your Sleep Persona</p>
                    <h3 style="font-size: 20px; color: ${BRAND_DARK}; font-weight: 600; margin: 0 0 12px;">${data.persona.label}</h3>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 18px;">${data.persona.description}</p>
                    ${data.persona.rationale ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #c7dcf7; padding-top: 18px;">
                      <tr>
                        <td>
                          <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">Why this matches you</p>
                          <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.55;">${data.persona.rationale}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Recommended Focus Modules -->
              ${data.persona.recommended_modules && data.persona.recommended_modules.length > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 1px;">Recommended Focus Modules</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${modulesHtml}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Key Focus Areas -->
              ${data.topRiskDrivers && data.topRiskDrivers.length > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 1px;">Key Focus Areas</p>
                    <p style="font-size: 12px; color: #64748b; margin: 0 0 12px;">What we identified as priorities</p>
                    <div>
                      ${riskDriversHtml}
                    </div>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Coach Readiness -->
              ${data.coachReadinessLabel ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border-radius: 14px; margin-bottom: 28px; border: 1px solid #bbf7d0;">
                <tr>
                  <td style="padding: 22px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="font-size: 11px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Coach Readiness</span>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 20px;">${data.coachReadinessLabel}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 13px; color: #15803d; margin: 12px 0 0; line-height: 1.55;">${data.coachReadinessRationale || "Your sleep foundation is solid. You're well-positioned to see meaningful improvements from personalized coaching and optimization strategies."}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Morning Energy Potential -->
              ${data.energyPotentialScore !== undefined ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fffbeb; border-radius: 14px; margin-bottom: 28px; border: 1px solid #fde68a;">
                <tr>
                  <td style="padding: 22px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="font-size: 11px; color: #92400e; font-weight: 600; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px;">Morning Energy Potential</p>
                          <p style="font-size: 13px; color: #a16207; margin: 0 0 14px; line-height: 1.5;">Your profile suggests ${data.energyPotentialScore >= 70 ? 'strong' : data.energyPotentialScore >= 45 ? 'good' : 'meaningful'} morning energy potential with the right support.</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background: #fef3c7; border-radius: 6px; height: 10px; width: 100%;">
                                <div style="background: #f59e0b; border-radius: 6px; height: 10px; width: ${data.energyPotentialScore}%;"></div>
                              </td>
                              <td width="60" align="right">
                                <span style="font-size: 20px; font-weight: 700; color: #92400e;">${data.energyPotentialScore}%</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Alignment & Support Scores -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafbfc; border-radius: 14px; margin-bottom: 28px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 22px;">
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Alignment & Support</p>
                    <p style="font-size: 12px; color: #64748b; margin: 0 0 18px;">How well your current setup supports your spine</p>
                    
                    <!-- Alignment Risk -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td><span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Alignment Risk</span></td>
                        <td align="right"><span style="font-size: 12px; color: ${getScoreColor(100 - data.scores.alignment_risk_score)}; font-weight: 600;">${alignmentRiskLabel}</span></td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px;">
                          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${100 - data.scores.alignment_risk_score}%; background: ${getScoreColor(100 - data.scores.alignment_risk_score)}; border-radius: 3px;"></div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Neck Support -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td><span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Neck Support</span></td>
                        <td align="right"><span style="font-size: 12px; color: ${getScoreColor(data.scores.neck_support_score)}; font-weight: 600;">${neckSupportLabel}</span></td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px;">
                          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${data.scores.neck_support_score}%; background: ${getScoreColor(data.scores.neck_support_score)}; border-radius: 3px;"></div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Sleep Stability -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td><span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Sleep Stability</span></td>
                        <td align="right"><span style="font-size: 12px; color: ${getScoreColor(data.scores.sleep_stability_score)}; font-weight: 600;">${sleepStabilityLabel}</span></td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px;">
                          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${data.scores.sleep_stability_score}%; background: ${getScoreColor(data.scores.sleep_stability_score)}; border-radius: 3px;"></div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Environment & Sleep Quality Scores -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafbfc; border-radius: 14px; margin-bottom: 28px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 22px;">
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Environment & Sleep Quality</p>
                    <p style="font-size: 12px; color: #64748b; margin: 0 0 18px;">External factors affecting your rest</p>
                    
                    <!-- Environment -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td><span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Environment</span></td>
                        <td align="right"><span style="font-size: 12px; color: ${getScoreColor(data.scores.environment_score)}; font-weight: 600;">${environmentLabel}</span></td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px;">
                          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${data.scores.environment_score}%; background: ${getScoreColor(data.scores.environment_score)}; border-radius: 3px;"></div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Light Sensitivity -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td><span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Light Sensitivity</span></td>
                        <td align="right"><span style="font-size: 12px; color: ${getScoreColor(100 - (data.scores.light_sensitivity_score || 50))}; font-weight: 600;">${lightSensitivityLabel}</span></td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px;">
                          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${100 - (data.scores.light_sensitivity_score || 50)}%; background: ${getScoreColor(100 - (data.scores.light_sensitivity_score || 50))}; border-radius: 3px;"></div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Temperature Comfort -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td><span style="font-size: 13px; color: ${BRAND_DARK}; font-weight: 500;">Temperature Comfort</span></td>
                        <td align="right"><span style="font-size: 12px; color: ${getScoreColor(100 - (data.scores.temperature_disruption_score || 30))}; font-weight: 600;">${temperatureLabel}</span></td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px;">
                          <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${100 - (data.scores.temperature_disruption_score || 30)}%; background: ${getScoreColor(100 - (data.scores.temperature_disruption_score || 30))}; border-radius: 3px;"></div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Environment Findings -->
              ${data.environmentFindings && data.environmentFindings.keyIssues.length > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 1px;">Environment Insights</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                      ${keyIssuesHtml}
                      <tr>
                        <td style="padding: 14px;">
                          <p style="margin: 0; font-size: 13px; color: #64748b; font-style: italic;">${data.environmentFindings.summary}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Product Recommendations -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 1px;">Your Recommended Setup</p>
                    <p style="font-size: 12px; color: #64748b; margin: 0 0 18px;">High confidence match</p>
                    
                    <!-- Primary Product -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${BRAND_DARK} 0%, #1e3a5f 100%); border-radius: 16px; margin-bottom: 14px;">
                      <tr>
                        <td style="padding: 26px; text-align: center;">
                          <p style="font-size: 10px; color: #94a3b8; font-weight: 600; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1.5px;">Primary Recommendation</p>
                          <h3 style="font-size: 18px; color: #ffffff; font-weight: 600; margin: 0 0 8px;">${primaryProduct.name}</h3>
                          <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 20px;">${primaryProduct.description}</p>
                          <a href="${baseUrl}${primaryProduct.route}" style="display: inline-block; background: ${BRAND_PRIMARY}; color: #ffffff; padding: 13px 34px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">View Product →</a>
                        </td>
                      </tr>
                    </table>

                    ${secondaryProduct ? `
                    <!-- Secondary Product -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 14px; margin-bottom: 14px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 22px;">
                          <p style="font-size: 10px; color: #64748b; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1.5px;">Recommended Add-on</p>
                          <p style="font-size: 16px; color: ${BRAND_DARK}; font-weight: 600; margin: 0 0 4px;">${secondaryProduct.name}</p>
                          <p style="font-size: 13px; color: #64748b; margin: 0;">${secondaryProduct.description}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${bundle ? `
                    <!-- Bundle -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 14px; margin-bottom: 14px; border: 1px solid #bbf7d0;">
                      <tr>
                        <td style="padding: 22px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <p style="font-size: 10px; color: #166534; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1.5px;">Best Value Bundle</p>
                                <p style="font-size: 16px; color: #166534; font-weight: 600; margin: 0 0 4px;">${bundle.name}</p>
                                <p style="font-size: 13px; color: #15803d; margin: 0;">${bundle.description}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${data.productRecommendations.persona_reasoning ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 18px;">
                          <p style="font-size: 12px; color: ${BRAND_DARK}; font-weight: 600; margin: 0 0 6px;">Why this fits your persona</p>
                          <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.55;">${data.productRecommendations.persona_reasoning}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- AI Sleep Coach Plan Preview -->
              ${data.coachPreview ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 11px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Your AI Sleep Coach Plan</p>
                    <p style="font-size: 12px; color: #64748b; margin: 0 0 18px;">Preview of your personalized 14-day program</p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafbfc; border-radius: 14px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 18px; border-bottom: 1px solid #e2e8f0;">
                          <p style="font-size: 12px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 6px;">Days 1–3: Setup</p>
                          <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">${data.coachPreview.day_1_3}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 18px; border-bottom: 1px solid #e2e8f0;">
                          <p style="font-size: 12px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 6px;">Days 4–7: Adjustment</p>
                          <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">${data.coachPreview.day_4_7}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 18px;">
                          <p style="font-size: 12px; color: ${BRAND_PRIMARY}; font-weight: 600; margin: 0 0 6px;">Days 7–14: Consolidation</p>
                          <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">${data.coachPreview.day_7_14}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Sleep Coach CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, #2563eb 100%); border-radius: 18px;">
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🎯</div>
                    <h3 style="font-size: 20px; color: #ffffff; font-weight: 600; margin: 0 0 10px;">Ready for Personalized Coaching?</h3>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.85); margin: 0 0 8px; line-height: 1.5;">Get a custom 7-day sleep plan tailored to your profile</p>
                    ${data.coachReadinessLabel ? `
                    <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin: 0 0 22px;">Your Coach Readiness: <strong style="color: #ffffff;">${data.coachReadinessLabel}</strong></p>
                    ` : '<div style="height: 22px;"></div>'}
                    <a href="${baseUrl}/sleep-coach" style="display: inline-block; background: #ffffff; color: ${BRAND_PRIMARY}; padding: 15px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">Access Sleep Coach →</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <img src="${logoUrl}" alt="Rise By Night" width="40" height="40" style="display: block; margin: 0 auto 14px; border-radius: 10px; opacity: 0.8;" />
              <p style="font-size: 14px; color: #64748b; margin: 0 0 10px;">Questions? We're here to help.</p>
              <a href="mailto:support@risebynight.com" style="color: ${BRAND_PRIMARY}; text-decoration: none; font-size: 14px; font-weight: 500;">support@risebynight.com</a>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <tr>
                  <td align="center">
                    <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} Rise By Night. All rights reserved.</p>
                    <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0;">Loofdakstraat 10, 3036JN Rotterdam</p>
                  </td>
                </tr>
              </table>
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

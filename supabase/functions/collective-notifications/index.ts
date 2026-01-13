import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders, createErrorResponse, createSuccessResponse, requireEnvVar } from "../_shared/env.ts";

interface NotificationRequest {
  type: "application_submitted" | "application_approved" | "admin_alert";
  application_id?: string;
  applicant_name?: string;
  applicant_email?: string;
  preferred_tier?: string;
  reason?: string;
  affiliate_referral_code?: string;
}

const ADMIN_EMAIL = "info.optiseek@gmail.com";
const FROM_EMAIL = "Rise By Night <collective@send.risebynight.com>";

const tierLabels: Record<string, string> = {
  everyday: "Everyday Advocate",
  creator: "Creator",
  professional: "Sleep Professional",
};

function generateApplicationConfirmationEmail(name: string, tier: string): string {
  const tierLabel = tierLabels[tier] || tier;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to the Sleep Collective</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0c;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);">
      
      <!-- Logo/Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 32px;">🌙</span>
        </div>
        <h1 style="color: #f8fafc; margin: 0; font-size: 28px;">Application Received</h1>
      </div>

      <!-- Content -->
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
        Hi ${name},
      </p>
      
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
        Thank you for applying to join the <strong style="color: #a5b4fc;">Sleep Collective</strong> as a <strong style="color: #a5b4fc;">${tierLabel}</strong>.
      </p>
      
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
        We're reviewing your application and will be in touch within 2-3 business days. In the meantime, make sure you've created an account on our website so we can activate your affiliate dashboard right away if you're approved.
      </p>

      <div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <p style="color: #a5b4fc; font-size: 14px; margin: 0;">
          <strong>Quick Tip:</strong> Haven't created an account yet? 
          <a href="https://www.risebynight.com/signin" style="color: #818cf8; text-decoration: underline;">Sign up here</a> 
          with the same email you used to apply.
        </p>
      </div>

      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        If you have any questions, feel free to reply to this email.
      </p>

      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;">
      <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
        Rise By Night · Sleep Collective<br>
        <a href="https://www.risebynight.com" style="color: #6366f1; text-decoration: none;">www.risebynight.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateAdminAlertEmail(
  applicantName: string,
  applicantEmail: string,
  tier: string,
  reason: string
): string {
  const tierLabel = tierLabels[tier] || tier;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Collective Application</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <span style="font-size: 32px; margin-right: 12px;">📋</span>
        <h1 style="margin: 0; font-size: 24px; color: #111827;">New Collective Application</h1>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Name</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">${applicantName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;"><a href="mailto:${applicantEmail}" style="color: #6366f1;">${applicantEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Tier</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${tierLabel}</td>
        </tr>
      </table>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Why they want to join:</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">${reason}</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://www.risebynight.com/admin/collective-applications" 
           style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500;">
          Review Applications
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
        Sleep Collective Admin Alert
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateApprovalEmail(name: string, referralCode: string): string {
  const dashboardUrl = "https://www.risebynight.com/affiliate";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to the Sleep Collective!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0c;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);">
      
      <!-- Celebration Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <h1 style="color: #f8fafc; margin: 0; font-size: 32px;">You're In!</h1>
        <p style="color: #a5b4fc; font-size: 18px; margin: 8px 0 0;">Welcome to the Sleep Collective</p>
      </div>

      <!-- Content -->
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
        Hi ${name},
      </p>
      
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
        Great news! Your application to join the Sleep Collective has been <strong style="color: #34d399;">approved</strong>. 
        Your affiliate account is now active and ready to go.
      </p>

      <!-- Referral Code Box -->
      <div style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <p style="color: #a5b4fc; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Your Referral Code</p>
        <p style="color: #f8fafc; font-size: 28px; font-weight: bold; font-family: monospace; margin: 0; letter-spacing: 2px;">${referralCode}</p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);">
          Open Your Dashboard →
        </a>
      </div>

      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
        In your dashboard you can:
      </p>
      
      <ul style="color: #94a3b8; font-size: 14px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
        <li>Track your referrals and commissions</li>
        <li>Get your unique referral link</li>
        <li>Access promotional resources</li>
        <li>Set up your payout preferences</li>
      </ul>

      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        Questions? Just reply to this email – we're here to help you succeed.
      </p>

      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;">
      <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
        Rise By Night · Sleep Collective<br>
        <a href="https://www.risebynight.com" style="color: #6366f1; text-decoration: none;">www.risebynight.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[collective-notifications] RESEND_API_KEY not configured");
      return createErrorResponse("Email service not configured", 500);
    }

    const resend = new Resend(resendApiKey);
    const body: NotificationRequest = await req.json();

    console.log(`[collective-notifications] Processing ${body.type} notification`);

    switch (body.type) {
      case "application_submitted": {
        if (!body.applicant_name || !body.applicant_email || !body.preferred_tier) {
          return createErrorResponse("Missing required fields for application_submitted", 400);
        }

        // Send confirmation to applicant
        const confirmationHtml = generateApplicationConfirmationEmail(
          body.applicant_name,
          body.preferred_tier
        );

        const confirmResult = await resend.emails.send({
          from: FROM_EMAIL,
          to: [body.applicant_email],
          subject: "We received your Sleep Collective application 🌙",
          html: confirmationHtml,
        });

        console.log("[collective-notifications] Confirmation email sent:", confirmResult);

        // Send admin alert
        const adminHtml = generateAdminAlertEmail(
          body.applicant_name,
          body.applicant_email,
          body.preferred_tier,
          body.reason || "Not provided"
        );

        const adminResult = await resend.emails.send({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          subject: `📋 New Collective Application: ${body.applicant_name}`,
          html: adminHtml,
        });

        console.log("[collective-notifications] Admin alert sent:", adminResult);

        return createSuccessResponse({
          success: true,
          confirmationEmailId: confirmResult.data?.id,
          adminEmailId: adminResult.data?.id,
        });
      }

      case "application_approved": {
        if (!body.applicant_name || !body.applicant_email || !body.affiliate_referral_code) {
          return createErrorResponse("Missing required fields for application_approved", 400);
        }

        const approvalHtml = generateApprovalEmail(
          body.applicant_name,
          body.affiliate_referral_code
        );

        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [body.applicant_email],
          subject: "🎉 You're approved! Welcome to the Sleep Collective",
          html: approvalHtml,
        });

        console.log("[collective-notifications] Approval email sent:", result);

        return createSuccessResponse({
          success: true,
          emailId: result.data?.id,
        });
      }

      default:
        return createErrorResponse(`Unknown notification type: ${body.type}`, 400);
    }
  } catch (error: any) {
    console.error("[collective-notifications] Error:", error);
    return createErrorResponse(error.message || "Internal server error", 500);
  }
});

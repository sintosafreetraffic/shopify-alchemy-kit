import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createSuccessResponse, requireEnvVar } from "../_shared/env.ts";

interface ProvisionRequest {
  application_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = requireEnvVar("SUPABASE_URL");
    const serviceRoleKey = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = requireEnvVar("SUPABASE_ANON_KEY");
    
    // First verify the user is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return createErrorResponse("Authentication required", 401);
    }

    // Create a user-context client to verify auth and check role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth verification failed:", authError);
      return createErrorResponse("Invalid authentication", 401);
    }

    // Check if user has admin role using the has_role function
    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (roleError) {
      console.error("Role check error:", roleError);
      return createErrorResponse("Failed to verify permissions", 500);
    }

    if (!isAdmin) {
      console.error(`User ${user.id} attempted admin action without admin role`);
      return createErrorResponse("Admin access required", 403);
    }

    console.log(`Admin ${user.id} (${user.email}) initiating affiliate provision`);
    
    // Use service role client for actual operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { application_id }: ProvisionRequest = await req.json();

    if (!application_id) {
      return createErrorResponse("application_id is required", 400);
    }

    // Fetch the application
    const { data: application, error: appError } = await supabase
      .from("collective_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      console.error("Application fetch error:", appError);
      return createErrorResponse("Application not found", 404);
    }

    if (application.status !== "approved") {
      return createErrorResponse("Application must be approved before provisioning", 400);
    }

    // Check if affiliate already linked
    if (application.affiliate_id) {
      return createSuccessResponse({ 
        message: "Affiliate already provisioned",
        affiliate_id: application.affiliate_id 
      });
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("User lookup error:", userError);
      return createErrorResponse("Failed to lookup user", 500);
    }

    const applicantUser = userData.users.find(u => u.email?.toLowerCase() === application.email.toLowerCase());

    if (!applicantUser) {
      console.log(`No user found for email: ${application.email}`);
      return createErrorResponse("User must sign up before affiliate account can be created", 400);
    }

    // Check if applicant already has an affiliate account
    const { data: existingAffiliate } = await supabase
      .from("affiliates")
      .select("id, track")
      .eq("user_id", applicantUser.id)
      .single();

    let affiliateId: string;
    
    // Determine track based on preferred tier
    const track = application.preferred_tier === "everyday" ? "partner" 
                : application.preferred_tier === "creator" ? "ambassador"
                : application.preferred_tier === "professional" ? "ambassador"
                : "partner";

    if (existingAffiliate) {
      // Update existing affiliate with track
      affiliateId = existingAffiliate.id;
      
      await supabase
        .from("affiliates")
        .update({ track })
        .eq("id", affiliateId);
        
      console.log(`Updated existing affiliate ${affiliateId} with track: ${track}`);
    } else {
      // Create new affiliate account
      const referralCode = `RBN${Date.now().toString(36).toUpperCase()}`;
      
      const { data: newAffiliate, error: createError } = await supabase
        .from("affiliates")
        .insert({
          user_id: applicantUser.id,
          referral_code: referralCode,
          track,
          tier: "bronze",
          status: "active",
        })
        .select("id")
        .single();

      if (createError || !newAffiliate) {
        console.error("Affiliate creation error:", createError);
        return createErrorResponse("Failed to create affiliate account", 500);
      }

      affiliateId = newAffiliate.id;
      console.log(`Created new affiliate ${affiliateId} with track: ${track}`);
    }

    // Link affiliate to application
    const { error: linkError } = await supabase
      .from("collective_applications")
      .update({ affiliate_id: affiliateId })
      .eq("id", application_id);

    if (linkError) {
      console.error("Application link error:", linkError);
      return createErrorResponse("Failed to link affiliate to application", 500);
    }

    console.log(`Successfully provisioned affiliate ${affiliateId} for application ${application_id}`);

    // Get the affiliate's referral code for the approval email
    const { data: affiliateData } = await supabase
      .from("affiliates")
      .select("referral_code")
      .eq("id", affiliateId)
      .single();

    // Send approval email to applicant
    try {
      const notificationPayload = {
        type: "application_approved",
        applicant_name: application.name,
        applicant_email: application.email,
        affiliate_referral_code: affiliateData?.referral_code || "N/A",
      };

      const notificationResponse = await fetch(
        `${supabaseUrl}/functions/v1/collective-notifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify(notificationPayload),
        }
      );

      if (!notificationResponse.ok) {
        console.error("Failed to send approval email:", await notificationResponse.text());
      } else {
        console.log("Approval email sent successfully");
      }
    } catch (emailError) {
      console.error("Error sending approval email:", emailError);
      // Don't fail the whole request if email fails
    }

    return createSuccessResponse({
      message: "Affiliate provisioned successfully",
      affiliate_id: affiliateId,
      track,
    });

  } catch (error) {
    console.error("Provision error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createSuccessResponse, requireEnvVar } from "../_shared/env.ts";
import { authenticateRequest } from "../_shared/auth.ts";

interface UGCSubmission {
  content_url: string;
  content_type: "instagram_post" | "instagram_reel" | "tiktok" | "youtube" | "blog" | "review" | "other";
  description?: string;
}

const VALID_CONTENT_TYPES = [
  "instagram_post",
  "instagram_reel", 
  "tiktok",
  "youtube",
  "blog",
  "review",
  "other"
];

const URL_REGEX = /^https?:\/\/.+/i;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = requireEnvVar("SUPABASE_URL");
    const serviceRoleKey = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = requireEnvVar("SUPABASE_ANON_KEY");
    
    // Authenticate request
    const authHeader = req.headers.get("Authorization");
    const authResult = await authenticateRequest(authHeader, supabaseUrl, anonKey);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || "Unauthorized", authResult.status);
    }

    const userId = authResult.user.id;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { content_url, content_type, description }: UGCSubmission = await req.json();

    // Validate content_url
    if (!content_url || typeof content_url !== "string") {
      return createErrorResponse("content_url is required", 400);
    }

    const trimmedUrl = content_url.trim();
    if (trimmedUrl.length > 2000) {
      return createErrorResponse("content_url must be less than 2000 characters", 400);
    }

    if (!URL_REGEX.test(trimmedUrl)) {
      return createErrorResponse("content_url must be a valid URL starting with http:// or https://", 400);
    }

    // Validate content_type
    if (!content_type || !VALID_CONTENT_TYPES.includes(content_type)) {
      return createErrorResponse(`content_type must be one of: ${VALID_CONTENT_TYPES.join(", ")}`, 400);
    }

    // Validate description (optional)
    const trimmedDescription = description?.trim() || null;
    if (trimmedDescription && trimmedDescription.length > 1000) {
      return createErrorResponse("description must be less than 1000 characters", 400);
    }

    // Find affiliate account for this user
    const { data: affiliate, error: affError } = await supabase
      .from("affiliates")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (affError || !affiliate) {
      console.error("Affiliate lookup error:", affError);
      return createErrorResponse("You must be an affiliate to submit UGC", 403);
    }

    // Insert UGC submission
    const { data: submission, error: insertError } = await supabase
      .from("partner_ugc_submissions")
      .insert({
        affiliate_id: affiliate.id,
        content_url: trimmedUrl,
        content_type,
        description: trimmedDescription,
        status: "pending",
      })
      .select("id, content_url, content_type, description, status, created_at")
      .single();

    if (insertError) {
      console.error("UGC submission error:", insertError);
      return createErrorResponse("Failed to submit UGC", 500);
    }

    console.log(`UGC submitted: ${submission.id} by affiliate ${affiliate.id}`);

    return createSuccessResponse({
      message: "UGC submitted successfully",
      submission,
    });

  } catch (error) {
    console.error("UGC submit error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});

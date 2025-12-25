/**
 * Shared Cron Authentication Helper
 * Centralizes x-cron-secret validation for all cron-triggered edge functions.
 * 
 * Usage:
 *   import { requireCronSecret } from "../_shared/cronAuth.ts";
 *   
 *   const authError = requireCronSecret(req);
 *   if (authError) return authError;
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/**
 * Validates the x-cron-secret header against CRON_SECRET environment variable.
 * 
 * @param req - The incoming request
 * @returns Response (error) if auth fails, null if auth succeeds (proceed with handler)
 */
export function requireCronSecret(req: Request): Response | null {
  const expectedSecret = Deno.env.get("CRON_SECRET");
  
  // Missing env configuration
  if (!expectedSecret) {
    console.error("[cronAuth] CRON_SECRET not configured in environment");
    return new Response(
      JSON.stringify({ success: false, error: "CRON_SECRET not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  const providedSecret = req.headers.get("x-cron-secret");
  
  // Missing or invalid secret
  if (!providedSecret || providedSecret !== expectedSecret) {
    console.error("[cronAuth] Invalid or missing x-cron-secret header");
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Auth passed - never log the actual secret value
  return null;
}

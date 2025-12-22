/**
 * Toggle Pinterest CAPI Edge Function
 * 
 * Password-protected endpoint to toggle between Render and direct CAPI for Pinterest tracking.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

const TOGGLE_PASSWORD = "risebynight2024"; // Simple password protection

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Toggle Pinterest CAPI] Request received");

  try {
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, password } = await req.json();

    // GET action doesn't require password
    if (action === "get_status") {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'pinterest_direct_capi')
        .single();

      if (error) {
        console.error("[Toggle Pinterest CAPI] Error fetching status:", error);
        return createSuccessResponse({ enabled: false, error: error.message });
      }

      const enabled = data?.value?.enabled === true;
      console.log("[Toggle Pinterest CAPI] Current status:", enabled);
      return createSuccessResponse({ enabled });
    }

    // TOGGLE action requires password
    if (action === "toggle") {
      if (password !== TOGGLE_PASSWORD) {
        console.error("[Toggle Pinterest CAPI] Invalid password attempt");
        return createErrorResponse("Invalid password", 401);
      }

      // Get current value
      const { data: current, error: fetchError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'pinterest_direct_capi')
        .single();

      if (fetchError) {
        console.error("[Toggle Pinterest CAPI] Error fetching current:", fetchError);
        return createErrorResponse("Failed to fetch current setting", 500);
      }

      const currentEnabled = current?.value?.enabled === true;
      const newEnabled = !currentEnabled;

      // Update the setting
      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ value: { enabled: newEnabled } })
        .eq('key', 'pinterest_direct_capi');

      if (updateError) {
        console.error("[Toggle Pinterest CAPI] Error updating:", updateError);
        return createErrorResponse("Failed to update setting", 500);
      }

      console.log("[Toggle Pinterest CAPI] Toggled to:", newEnabled);
      return createSuccessResponse({ 
        enabled: newEnabled, 
        message: `Pinterest CAPI switched to ${newEnabled ? 'DIRECT (Supabase)' : 'RENDER (external)'}` 
      });
    }

    return createErrorResponse("Invalid action", 400);
  } catch (error: any) {
    console.error("[Toggle Pinterest CAPI] Error:", error);
    return createErrorResponse(error.message || "Unknown error", 500);
  }
});

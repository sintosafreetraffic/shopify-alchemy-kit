import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Pinterest OAuth Edge Function
 * 
 * Handles the complete OAuth 2.0 flow for Pinterest API:
 * - GET ?action=authorize → Redirects to Pinterest authorization
 * - GET ?code=...&state=... → Handles callback, exchanges code for tokens
 * - GET ?action=refresh → Refreshes expired access token
 * 
 * Required secrets:
 * - PINTEREST_APP_ID
 * - PINTEREST_APP_SECRET
 * 
 * Scopes requested: ads:read (required for EQS API)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_API_URL = "https://api.pinterest.com/v5";
// Scopes needed for Pinterest API (EQS, boards, pins, etc.)
const SCOPES = "user_accounts:read,ads:read,boards:read,pins:read";

function requireEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope: string }> {
  const credentials = btoa(`${appId}:${appSecret}`);
  
  const response = await fetch(`${PINTEREST_API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Pinterest OAuth] Token exchange failed:", response.status, error);
    throw new Error(`Token exchange failed: ${response.status} - ${error}`);
  }

  return response.json();
}

async function refreshAccessToken(
  refreshToken: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope: string }> {
  const credentials = btoa(`${appId}:${appSecret}`);
  
  const response = await fetch(`${PINTEREST_API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Pinterest OAuth] Token refresh failed:", response.status, error);
    throw new Error(`Token refresh failed: ${response.status} - ${error}`);
  }

  return response.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  console.log("[Pinterest OAuth] Request:", { action, hasCode: !!code, hasState: !!state, error });

  try {
    const PINTEREST_APP_ID = requireEnvVar("PINTEREST_APP_ID");
    const PINTEREST_APP_SECRET = requireEnvVar("PINTEREST_APP_SECRET");
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    // Build the redirect URI (this function's URL with callback path)
    const baseUrl = `${SUPABASE_URL}/functions/v1/pinterest-oauth`;
    const redirectUri = baseUrl;

    // ACTION: Start authorization flow
    if (action === "authorize") {
      // Get the origin for redirect back (passed from frontend)
      const origin = url.searchParams.get("origin") || "https://risebynight.nl";
      
      // Generate state for CSRF protection - include origin for redirect
      const stateToken = `${crypto.randomUUID()}|${origin}`;
      
      const authUrl = new URL(PINTEREST_AUTH_URL);
      authUrl.searchParams.set("client_id", PINTEREST_APP_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("state", stateToken);

      console.log("[Pinterest OAuth] Redirecting to Pinterest authorization, origin:", origin);
      
      // Return the auth URL for the frontend to redirect to
      return new Response(
        JSON.stringify({ 
          auth_url: authUrl.toString(),
          state: stateToken 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // ACTION: Handle OAuth callback (code exchange)
    if (code && state) {
      // Get the app URL from the state parameter or use a fallback
      // The state is expected to be in format: uuid|app_url
      let appUrl = "https://risebynight.nl"; // Fallback app URL
      let stateToken = state;
      
      if (state.includes("|")) {
        const parts = state.split("|");
        stateToken = parts[0];
        appUrl = parts[1] || appUrl;
      }

      if (error) {
        console.error("[Pinterest OAuth] Authorization denied:", error);
        // Redirect back to app with error
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${appUrl}/risebynight/tracking?pinterest_error=${encodeURIComponent(error)}`,
          },
        });
      }

      console.log("[Pinterest OAuth] Exchanging code for tokens");
      
      const tokens = await exchangeCodeForTokens(code, redirectUri, PINTEREST_APP_ID, PINTEREST_APP_SECRET);
      
      console.log("[Pinterest OAuth] Token exchange successful, expires_in:", tokens.expires_in);

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Store tokens in database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Upsert - we only keep one set of Pinterest tokens
      const { error: dbError } = await supabase
        .from("pinterest_oauth_tokens")
        .upsert({
          id: "00000000-0000-0000-0000-000000000001", // Fixed ID for single-tenant
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_type: "bearer",
          expires_at: expiresAt,
          scopes: tokens.scope.split(",").map(s => s.trim()),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (dbError) {
        console.error("[Pinterest OAuth] Failed to store tokens:", dbError);
        throw new Error("Failed to store tokens");
      }

      console.log("[Pinterest OAuth] Tokens stored successfully");

      // Redirect back to tracking page with success
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${appUrl}/risebynight/tracking?pinterest_connected=true`,
        },
      });
    }

    // ACTION: Refresh token
    if (action === "refresh") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Get current refresh token
      const { data: tokenData, error: fetchError } = await supabase
        .from("pinterest_oauth_tokens")
        .select("*")
        .single();

      if (fetchError || !tokenData) {
        throw new Error("No Pinterest tokens found - please re-authorize");
      }

      if (!tokenData.refresh_token) {
        throw new Error("No refresh token available - please re-authorize");
      }

      console.log("[Pinterest OAuth] Refreshing access token");
      
      const tokens = await refreshAccessToken(tokenData.refresh_token, PINTEREST_APP_ID, PINTEREST_APP_SECRET);
      
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Update tokens in database
      const { error: updateError } = await supabase
        .from("pinterest_oauth_tokens")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || tokenData.refresh_token,
          expires_at: expiresAt,
          scopes: tokens.scope.split(",").map(s => s.trim()),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenData.id);

      if (updateError) {
        throw new Error("Failed to update tokens");
      }

      console.log("[Pinterest OAuth] Token refresh successful");

      return new Response(
        JSON.stringify({ success: true, expires_at: expiresAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: Get token status
    if (action === "status") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: tokenData, error: fetchError } = await supabase
        .from("pinterest_oauth_tokens")
        .select("expires_at, scopes, updated_at")
        .single();

      if (fetchError || !tokenData) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isExpired = new Date(tokenData.expires_at) < new Date();

      return new Response(
        JSON.stringify({
          connected: true,
          expired: isExpired,
          expires_at: tokenData.expires_at,
          scopes: tokenData.scopes,
          last_updated: tokenData.updated_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Invalid request",
        hint: "Use ?action=authorize to start OAuth, ?action=status to check connection, or ?action=refresh to refresh tokens"
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err) {
    console.error("[Pinterest OAuth] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

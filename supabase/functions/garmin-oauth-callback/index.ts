import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin OAuth Callback - Completes OAuth 2.0 Authorization Code flow
// GET /garmin-oauth-callback
// 
// Verifies state, exchanges authorization code for tokens,
// stores tokens in sleep_sources.metadata + garmin_token_hash
// Redirects to frontend with success/error params
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatePayload {
  user_id: string;
  source: 'garmin';
  timestamp: number;
  nonce: string;
  redirect_origin: string;
}

// Default fallback origin
const DEFAULT_ORIGIN = 'https://app.risebynight.com';

// Verify HMAC signature on state
async function verifyState(stateString: string, secret: string): Promise<{ valid: boolean; payload?: StatePayload; error?: string }> {
  try {
    const stateObject = JSON.parse(atob(stateString));
    const { payload, signature } = stateObject;
    
    if (!payload || !signature) {
      return { valid: false, error: 'Invalid state structure' };
    }
    
    // Check timestamp (10 minute expiry)
    const age = Date.now() - payload.timestamp;
    if (age > 10 * 60 * 1000) {
      return { valid: false, error: 'State expired' };
    }
    
    // Verify signature
    const encoder = new TextEncoder();
    const data = JSON.stringify(payload);
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Convert hex signature to Uint8Array
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
    );
    
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(data));
    
    if (!valid) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: `State verification failed: ${error}` };
  }
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  // Never log tokens, codes, or hashes
  const safeData = data ? { ...data } : {};
  delete safeData.access_token;
  delete safeData.refresh_token;
  delete safeData.code;
  delete safeData.code_verifier;
  delete safeData.token_hash;
  delete safeData.pepper;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-oauth-callback',
    message,
    ...safeData,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// Compute SHA-256 hash of access token with pepper
async function computeTokenHash(accessToken: string, pepper: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${accessToken}:${pepper}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildSuccessRedirect(origin: string): string {
  return `${origin}/settings/sleep-sources?garmin=success`;
}

function buildErrorRedirect(origin: string, reason: string): string {
  return `${origin}/settings/sleep-sources?garmin=error&reason=${encodeURIComponent(reason)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // We'll extract redirect_origin from state, but need a fallback for early errors
  let redirectOrigin = DEFAULT_ORIGIN;
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const garminClientId = Deno.env.get('GARMIN_CLIENT_ID');
    const garminClientSecret = Deno.env.get('GARMIN_CLIENT_SECRET');
    const stateSigningSecret = Deno.env.get('STATE_SIGNING_SECRET');
    const tokenHashPepper = Deno.env.get('GARMIN_TOKEN_HASH_PEPPER');
    
    if (!garminClientId || !garminClientSecret || !stateSigningSecret) {
      log('error', 'Missing required Garmin OAuth secrets');
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'server_config'), 302);
    }
    
    if (!tokenHashPepper) {
      log('error', 'Missing GARMIN_TOKEN_HASH_PEPPER secret');
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'server_config'), 302);
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Parse callback parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    
    // Try to extract redirect_origin from state early (even before full verification)
    if (state) {
      try {
        const stateObject = JSON.parse(atob(state));
        if (stateObject?.payload?.redirect_origin) {
          redirectOrigin = stateObject.payload.redirect_origin;
        }
      } catch {
        // State parsing failed, use default origin
      }
    }
    
    // Handle Garmin error response (user denied consent)
    if (error) {
      log('warn', 'Garmin OAuth error response', { error, errorDescription });
      const reason = error === 'access_denied' ? 'access_denied' : 'garmin_error';
      return Response.redirect(buildErrorRedirect(redirectOrigin, reason), 302);
    }
    
    if (!code || !state) {
      log('warn', 'Missing OAuth callback parameters');
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'missing_params'), 302);
    }
    
    // Verify state
    const stateResult = await verifyState(state, stateSigningSecret);
    if (!stateResult.valid || !stateResult.payload) {
      log('warn', 'State verification failed', { error: stateResult.error });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'invalid_state'), 302);
    }
    
    const { user_id: userId, nonce: stateNonce, redirect_origin: stateRedirectOrigin } = stateResult.payload;
    
    // Update redirect origin from verified state
    if (stateRedirectOrigin) {
      redirectOrigin = stateRedirectOrigin;
    }
    
    log('info', 'Processing Garmin OAuth 2.0 callback', { userId, redirectOrigin });
    
    // Get stored code_verifier
    const { data: sourceRow, error: fetchError } = await supabaseAdmin
      .from('sleep_sources')
      .select('metadata')
      .eq('user_id', userId)
      .eq('source', 'garmin')
      .single();
    
    if (fetchError || !sourceRow) {
      log('error', 'Failed to fetch stored OAuth state', { userId, error: fetchError?.message });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'session_not_found'), 302);
    }
    
    const metadata = sourceRow.metadata as Record<string, unknown>;
    const codeVerifier = metadata?.code_verifier as string;
    const storedNonce = metadata?.nonce as string;
    const storedRedirectOrigin = metadata?.redirect_origin as string;
    
    if (!codeVerifier) {
      log('error', 'Missing code_verifier', { userId });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'session_invalid'), 302);
    }
    
    // Verify nonce matches
    if (storedNonce !== stateNonce) {
      log('error', 'Nonce mismatch', { userId });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'nonce_mismatch'), 302);
    }
    
    // Use stored redirect origin for token exchange (must match what was sent to Garmin)
    const tokenRedirectUri = `${storedRedirectOrigin || redirectOrigin}/auth/garmin/callback`;
    
    // Exchange authorization code for tokens (Garmin OAuth 2.0 PKCE endpoint)
    const tokenEndpoint = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: tokenRedirectUri,
      client_id: garminClientId,
      client_secret: garminClientSecret,
      code_verifier: codeVerifier,
    });
    
    log('info', 'Exchanging authorization code for tokens', { userId, tokenRedirectUri });
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenParams.toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log('error', 'Failed to exchange code for tokens', { 
        userId, 
        status: tokenResponse.status, 
        error: errorText 
      });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'token_exchange_failed'), 302);
    }
    
    let tokenData: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };
    
    try {
      tokenData = await tokenResponse.json();
    } catch {
      log('error', 'Failed to parse token response', { userId });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'invalid_token_response'), 302);
    }
    
    const { access_token, refresh_token, expires_in } = tokenData;
    
    if (!access_token) {
      log('error', 'Missing access_token in response', { userId });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'missing_access_token'), 302);
    }
    
    // Compute token hash for indexed lookup (webhook correlation)
    const tokenHash = await computeTokenHash(access_token, tokenHashPepper);
    
    // Calculate token expiry timestamp
    const now = new Date();
    const expiresAt = expires_in 
      ? new Date(now.getTime() + expires_in * 1000).toISOString() 
      : null;
    
    // Store tokens and update status
    const { error: updateError } = await supabaseAdmin
      .from('sleep_sources')
      .update({
        status: 'connected', // Mark as connected after successful token exchange
        connected_at: now.toISOString(),
        revoked_at: null,
        consent_granted_at: now.toISOString(),
        consent_version: '2.0',
        garmin_token_hash: tokenHash,
        garmin_token_hash_updated_at: now.toISOString(),
        metadata: {
          oauth_version: '2.0',
          access_token,
          refresh_token: refresh_token || null,
          expires_at: expiresAt,
          oauth_completed_at: now.toISOString(),
          oauth_pending: false,
          // Clear PKCE state
          code_verifier: null,
          nonce: null,
          redirect_origin: null,
          // device_model will be populated on first webhook
        },
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
      .eq('source', 'garmin');
    
    if (updateError) {
      log('error', 'Failed to store access tokens', { userId, error: updateError.message });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'storage_failed'), 302);
    }
    
    log('info', 'Garmin OAuth 2.0 completed successfully', { 
      userId, 
      hashSet: true,
      hasRefreshToken: !!refresh_token,
      expiresIn: expires_in,
    });
    
    // Redirect to success page
    return Response.redirect(buildSuccessRedirect(redirectOrigin), 302);
    
  } catch (error) {
    log('error', 'Unexpected error in garmin-oauth-callback', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return Response.redirect(buildErrorRedirect(redirectOrigin, 'internal_error'), 302);
  }
});

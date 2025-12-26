import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin OAuth Start - Initiates OAuth 2.0 Authorization Code flow
// GET/POST /garmin-oauth-start
// 
// Generates signed state with PKCE, stores code_verifier,
// and returns Garmin OAuth2 authorize URL for redirect.
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
}

// HMAC-SHA256 signing for state parameter
async function signState(payload: StatePayload, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = JSON.stringify(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const stateObject = {
    payload,
    signature: signatureHex,
  };
  
  return btoa(JSON.stringify(stateObject));
}

// Generate random string for PKCE code_verifier
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Use URL-safe base64 encoding
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate SHA-256 hash for code_challenge
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  // URL-safe base64 encoding
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  // Never log sensitive data
  const safeData = data ? { ...data } : {};
  delete safeData.code_verifier;
  delete safeData.client_secret;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-oauth-start',
    message,
    ...safeData,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const garminClientId = Deno.env.get('GARMIN_CLIENT_ID');
    const garminClientSecret = Deno.env.get('GARMIN_CLIENT_SECRET');
    const stateSigningSecret = Deno.env.get('STATE_SIGNING_SECRET');
    
    if (!garminClientId || !garminClientSecret || !stateSigningSecret) {
      log('error', 'Missing required Garmin OAuth secrets');
      return new Response(
        JSON.stringify({ error: 'Garmin OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Authenticate user via JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      log('warn', 'Invalid JWT token', { error: authError?.message });
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = user.id;
    log('info', 'Starting Garmin OAuth 2.0 flow', { userId });
    
    // OAuth 2.0 configuration
    const redirectUri = 'https://app.risebynight.com/auth/garmin/callback';
    
    // Garmin OAuth 2.0 endpoints (Health API)
    const authorizeEndpoint = 'https://connect.garmin.com/oauthConfirm';
    
    // Generate PKCE code_verifier and code_challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Generate signed state with expiry
    const nonce = generateNonce();
    const statePayload: StatePayload = {
      user_id: userId,
      source: 'garmin',
      timestamp: Date.now(),
      nonce,
    };
    
    const signedState = await signState(statePayload, stateSigningSecret);
    
    // Store code_verifier and OAuth state in database
    const { error: upsertError } = await supabaseAdmin
      .from('sleep_sources')
      .upsert({
        user_id: userId,
        source: 'garmin',
        status: 'pending',
        metadata: {
          oauth_pending: true,
          oauth_version: '2.0',
          code_verifier: codeVerifier,
          oauth_started_at: new Date().toISOString(),
          nonce,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,source',
      });
    
    if (upsertError) {
      log('error', 'Failed to store OAuth state', { error: upsertError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to store OAuth state' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build Garmin OAuth 2.0 authorization URL
    // Garmin uses standard OAuth 2.0 with PKCE
    const authParams = new URLSearchParams({
      client_id: garminClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'sleep',  // Request sleep data access
      state: signedState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    
    const authorizeUrl = `${authorizeEndpoint}?${authParams.toString()}`;
    
    log('info', 'Garmin OAuth 2.0 started successfully', { 
      userId, 
      redirectUri,
      hasCodeChallenge: true,
    });
    
    // Return the authorization URL for the frontend to redirect
    return new Response(
      JSON.stringify({ 
        authorization_url: authorizeUrl,
        state: signedState,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    log('error', 'Unexpected error in garmin-oauth-start', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

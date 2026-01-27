import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin OAuth Start - Initiates OAuth 1.0a Authorization flow
// GET/POST /garmin-oauth-start
// 
// Gets request token from Garmin, stores token_secret,
// and returns Garmin OAuth1 authorize URL for redirect.
// 
// OAuth 1.0a is required for Garmin Health API backfill endpoints.
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
  request_token: string;
  request_token_secret: string;
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

// Create OAuth 1.0a signature
async function createOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): Promise<string> {
  const sortedParams = Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  delete safeData.client_secret;
  delete safeData.request_token_secret;
  
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
    
    // Get redirect_origin from request body or query params
    let redirectOrigin = 'https://app.risebynight.com';
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.redirect_origin) {
          redirectOrigin = body.redirect_origin;
        }
      } catch {
        // Body parsing failed, use default
      }
    } else {
      const url = new URL(req.url);
      const originParam = url.searchParams.get('redirect_origin');
      if (originParam) {
        redirectOrigin = originParam;
      }
    }
    
    log('info', 'Starting Garmin OAuth 1.0a flow', { userId, redirectOrigin });
    
    // ============================================================
    // Step 1: Get Request Token from Garmin
    // ============================================================
    const requestTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
    
    // Build callback URL - points to our OAuth 1.0a callback function
    const callbackUrl = `${supabaseUrl}/functions/v1/garmin-oauth1-callback`;
    
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: garminClientId,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
      oauth_version: '1.0',
      oauth_callback: callbackUrl,
    };
    
    // Sign request (no token secret for request_token endpoint)
    const signature = await createOAuthSignature(
      'POST',
      requestTokenUrl,
      oauthParams,
      garminClientSecret,
      '' // No token secret yet
    );
    oauthParams.oauth_signature = signature;
    
    const authHeaderValue = 'OAuth ' + Object.keys(oauthParams)
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ');
    
    log('info', 'Requesting OAuth 1.0a request token', { userId });
    
    const requestTokenResponse = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeaderValue,
      },
    });
    
    if (!requestTokenResponse.ok) {
      const errorText = await requestTokenResponse.text();
      log('error', 'Failed to get request token', { 
        userId, 
        status: requestTokenResponse.status,
        error: errorText.substring(0, 200),
      });
      return new Response(
        JSON.stringify({ error: 'Failed to initiate Garmin OAuth' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse response (form-urlencoded)
    const responseText = await requestTokenResponse.text();
    const responseParams = new URLSearchParams(responseText);
    const requestToken = responseParams.get('oauth_token');
    const requestTokenSecret = responseParams.get('oauth_token_secret');
    
    if (!requestToken || !requestTokenSecret) {
      log('error', 'Missing tokens in request_token response', { userId });
      return new Response(
        JSON.stringify({ error: 'Invalid response from Garmin' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Got request token, preparing authorization URL', { userId });
    
    // ============================================================
    // Step 2: Create signed state with request token secret
    // ============================================================
    const nonce = generateNonce();
    const statePayload: StatePayload = {
      user_id: userId,
      source: 'garmin',
      timestamp: Date.now(),
      nonce,
      redirect_origin: redirectOrigin,
      request_token: requestToken,
      request_token_secret: requestTokenSecret,
    };
    
    const signedState = await signState(statePayload, stateSigningSecret);
    
    // Store OAuth state in database
    const { error: upsertError } = await supabaseAdmin
      .from('sleep_sources')
      .upsert({
        user_id: userId,
        source: 'garmin',
        status: 'pending',
        metadata: {
          oauth_pending: true,
          oauth_version: '1.0a',
          request_token: requestToken,
          request_token_secret: requestTokenSecret,
          oauth_started_at: new Date().toISOString(),
          nonce,
          redirect_origin: redirectOrigin,
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
    
    // ============================================================
    // Step 3: Build authorization URL
    // ============================================================
    const authorizeEndpoint = 'https://connect.garmin.com/oauthConfirm';
    const authParams = new URLSearchParams({
      oauth_token: requestToken,
      oauth_callback: callbackUrl,
      state: signedState,
    });
    
    const authorizeUrl = `${authorizeEndpoint}?${authParams.toString()}`;
    
    log('info', 'Garmin OAuth 1.0a started successfully', { 
      userId, 
      callbackUrl,
      hasRequestToken: true,
    });
    
    return new Response(
      JSON.stringify({ 
        authorization_url: authorizeUrl,
        state: signedState,
        oauth_version: '1.0a',
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

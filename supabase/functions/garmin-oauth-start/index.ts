import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin OAuth Start - Initiates OAuth 1.0a flow
// GET /garmin/oauth/start
// 
// Creates signed state with HMAC, stores request token,
// and redirects user to Garmin consent screen.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatePayload {
  user_id: string;
  source: 'garmin';
  timestamp: number;
  request_token?: string;
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
  
  // Encode payload + signature as base64
  const stateObject = {
    payload,
    signature: signatureHex,
  };
  
  return btoa(JSON.stringify(stateObject));
}

// OAuth 1.0a signature generation
function oauthEncode(input: string): string {
  // OAuth uses RFC3986 which requires encoding ! ' ( ) * as well
  return encodeURIComponent(input).replace(/[!'()*]/g, (c) =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): Promise<string> {
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${oauthEncode(key)}=${oauthEncode(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBase = `${method.toUpperCase()}&${oauthEncode(url)}&${oauthEncode(sortedParams)}`;

  // Create signing key
  const signingKey = `${oauthEncode(consumerSecret)}&${oauthEncode(tokenSecret)}`;

  // Generate HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureBase));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-oauth-start',
    message,
    ...data,
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
    log('info', 'Starting Garmin OAuth flow', { userId });
    
    // Get callback URL from request or use default app URL
    const url = new URL(req.url);
    const callbackUrl = url.searchParams.get('callback_url') || 
      'https://app.risebynight.com/auth/garmin/callback';
    
    // Step 1: Get request token from Garmin (OAuth 1.0a)
    const requestTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();
    
    // OAuth params for signature - oauth_callback must be included in signature base
    const oauthParams: Record<string, string> = {
      oauth_callback: callbackUrl,
      oauth_consumer_key: garminClientId,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_version: '1.0',
    };
    
    const signature = await generateOAuthSignature(
      'POST',
      requestTokenUrl,
      oauthParams,
      garminClientSecret
    );
    
    // Garmin is strict about where it reads parameters from; send OAuth params in the
    // POST body as application/x-www-form-urlencoded (OAuth 1.0a compliant).
    const tokenRequestParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
    const tokenRequestBody = new URLSearchParams(tokenRequestParams).toString();

    log('info', 'Requesting Garmin request token', {
      callbackUrl,
      timestamp,
      nonceLen: nonce.length,
      bodyLen: tokenRequestBody.length,
    });

    const requestTokenResponse = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        // Garmin expects form-encoded requests for OAuth 1.0a endpoints
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    });
    
    if (!requestTokenResponse.ok) {
      const errorText = await requestTokenResponse.text();
      log('error', 'Failed to get Garmin request token', { 
        status: requestTokenResponse.status, 
        error: errorText 
      });
      return new Response(
        JSON.stringify({ error: 'Failed to initiate Garmin OAuth', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const responseText = await requestTokenResponse.text();
    const responseParams = new URLSearchParams(responseText);
    const requestToken = responseParams.get('oauth_token');
    const requestTokenSecret = responseParams.get('oauth_token_secret');
    
    if (!requestToken || !requestTokenSecret) {
      log('error', 'Missing tokens in Garmin response', { response: responseText });
      return new Response(
        JSON.stringify({ error: 'Invalid Garmin response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create signed state with request token
    const statePayload: StatePayload = {
      user_id: userId,
      source: 'garmin',
      timestamp: Date.now(),
      request_token: requestToken,
    };
    
    const signedState = await signState(statePayload, stateSigningSecret);
    
    // Store request token secret temporarily (needed for callback)
    // Using sleep_sources metadata to store pending OAuth state
    const { error: upsertError } = await supabaseAdmin
      .from('sleep_sources')
      .upsert({
        user_id: userId,
        source: 'garmin',
        status: 'pending',
        metadata: {
          oauth_pending: true,
          request_token: requestToken,
          request_token_secret: requestTokenSecret,
          oauth_started_at: new Date().toISOString(),
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
    
    // Build Garmin authorization URL
    const authorizeUrl = `https://connect.garmin.com/oauthConfirm?oauth_token=${encodeURIComponent(requestToken)}&oauth_callback=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(signedState)}`;
    
    log('info', 'Garmin OAuth started successfully', { userId, authorizeUrl });
    
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

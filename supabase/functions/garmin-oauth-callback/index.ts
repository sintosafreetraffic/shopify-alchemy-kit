import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin OAuth Callback - Completes OAuth 1.0a flow
// GET /garmin/oauth/callback
// 
// Verifies state, exchanges verifier for access token,
// stores tokens in sleep_sources.metadata + garmin_token_hash
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

// OAuth 1.0a signature generation
function oauthEncode(input: string): string {
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
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${oauthEncode(key)}=${oauthEncode(params[key])}`)
    .join('&');

  const signatureBase = `${method.toUpperCase()}&${oauthEncode(url)}&${oauthEncode(sortedParams)}`;
  const signingKey = `${oauthEncode(consumerSecret)}&${oauthEncode(tokenSecret)}`;

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
  // Never log tokens or hashes
  const safeData = data ? { ...data } : {};
  delete safeData.access_token;
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
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const garminClientId = Deno.env.get('GARMIN_CLIENT_ID');
    const garminClientSecret = Deno.env.get('GARMIN_CLIENT_SECRET');
    const stateSigningSecret = Deno.env.get('STATE_SIGNING_SECRET');
    const tokenHashPepper = Deno.env.get('GARMIN_TOKEN_HASH_PEPPER');
    
    if (!garminClientId || !garminClientSecret || !stateSigningSecret) {
      log('error', 'Missing required Garmin OAuth secrets');
      return new Response(
        JSON.stringify({ error: 'Garmin OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!tokenHashPepper) {
      log('error', 'Missing GARMIN_TOKEN_HASH_PEPPER secret');
      return new Response(
        JSON.stringify({ error: 'Garmin OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Parse callback parameters
    const url = new URL(req.url);
    const oauthToken = url.searchParams.get('oauth_token');
    const oauthVerifier = url.searchParams.get('oauth_verifier');
    const state = url.searchParams.get('state');
    
    if (!oauthToken || !oauthVerifier || !state) {
      log('warn', 'Missing OAuth callback parameters');
      return new Response(
        JSON.stringify({ error: 'Missing OAuth callback parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify state
    const stateResult = await verifyState(state, stateSigningSecret);
    if (!stateResult.valid || !stateResult.payload) {
      log('warn', 'State verification failed', { error: stateResult.error });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired state', details: stateResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { user_id: userId, request_token: stateRequestToken } = stateResult.payload;
    
    // Verify request token matches
    if (stateRequestToken !== oauthToken) {
      log('warn', 'Request token mismatch', { userId });
      return new Response(
        JSON.stringify({ error: 'Token mismatch' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Processing Garmin OAuth callback', { userId });
    
    // Get stored request token secret
    const { data: sourceRow, error: fetchError } = await supabaseAdmin
      .from('sleep_sources')
      .select('metadata')
      .eq('user_id', userId)
      .eq('source', 'garmin')
      .single();
    
    if (fetchError || !sourceRow) {
      log('error', 'Failed to fetch stored OAuth state', { userId, error: fetchError?.message });
      return new Response(
        JSON.stringify({ error: 'OAuth session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const metadata = sourceRow.metadata as Record<string, unknown>;
    const requestTokenSecret = metadata?.request_token_secret as string;
    
    if (!requestTokenSecret) {
      log('error', 'Missing request token secret', { userId });
      return new Response(
        JSON.stringify({ error: 'OAuth session invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Exchange for access token
    const accessTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();
    
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: garminClientId,
      oauth_token: oauthToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      oauth_verifier: oauthVerifier,
    };
    
    const signature = await generateOAuthSignature(
      'POST',
      accessTokenUrl,
      oauthParams,
      garminClientSecret,
      requestTokenSecret
    );
    
    const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };

    const authHeaderValue = 'OAuth ' + Object.keys(headerParams)
      .sort()
      .map((key) => `${oauthEncode(key)}="${oauthEncode(headerParams[key])}"`)
      .join(', ');
    
    log('info', 'Exchanging verifier for access token', { userId });
    
    const accessTokenResponse = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeaderValue,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (!accessTokenResponse.ok) {
      const errorText = await accessTokenResponse.text();
      log('error', 'Failed to exchange for access token', { 
        userId, 
        status: accessTokenResponse.status, 
        error: errorText 
      });
      return new Response(
        JSON.stringify({ error: 'Failed to complete Garmin OAuth', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const accessResponseText = await accessTokenResponse.text();
    const accessParams = new URLSearchParams(accessResponseText);
    const accessToken = accessParams.get('oauth_token');
    const accessTokenSecret = accessParams.get('oauth_token_secret');
    
    if (!accessToken || !accessTokenSecret) {
      log('error', 'Missing access tokens in Garmin response', { userId });
      return new Response(
        JSON.stringify({ error: 'Invalid Garmin access token response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Compute token hash for indexed lookup
    const tokenHash = await computeTokenHash(accessToken, tokenHashPepper);
    
    // Store tokens, hash, and update status
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('sleep_sources')
      .update({
        status: 'pending', // Will become 'connected' on first successful data ingest
        connected_at: now,
        revoked_at: null,
        consent_granted_at: now,
        consent_version: '1.0',
        garmin_token_hash: tokenHash,
        garmin_token_hash_updated_at: now,
        metadata: {
          access_token: accessToken,
          access_token_secret: accessTokenSecret,
          oauth_completed_at: now,
          oauth_pending: false,
          // device_model will be populated on first webhook
        },
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('source', 'garmin');
    
    if (updateError) {
      log('error', 'Failed to store access tokens', { userId, error: updateError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to store credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Garmin OAuth completed successfully', { userId, hashSet: true });
    
    // Redirect to success page or return success JSON
    // For now, return JSON - frontend can redirect
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Garmin connected successfully. Sleep data will sync automatically.',
        user_id: userId,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    log('error', 'Unexpected error in garmin-oauth-callback', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

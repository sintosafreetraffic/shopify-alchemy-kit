import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin OAuth 1.0a Callback - Exchanges verifier for Access Token
// GET /garmin-oauth1-callback
// 
// Receives oauth_token and oauth_verifier from Garmin authorization,
// exchanges for access_token and access_token_secret,
// stores tokens in sleep_sources.metadata
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default fallback origin
const DEFAULT_ORIGIN = 'https://app.risebynight.com';

interface StatePayload {
  user_id: string;
  source: 'garmin';
  timestamp: number;
  nonce: string;
  redirect_origin: string;
  request_token: string;
  request_token_secret: string;
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const safeData = data ? { ...data } : {};
  delete safeData.access_token;
  delete safeData.token_secret;
  delete safeData.request_token_secret;
  delete safeData.oauth_verifier;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-oauth1-callback',
    message,
    ...safeData,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// Verify HMAC signature on state
async function verifyState(stateString: string, secret: string): Promise<{ valid: boolean; payload?: StatePayload; error?: string }> {
  try {
    const stateObject = JSON.parse(atob(stateString));
    const { payload, signature } = stateObject;
    
    if (!payload || !signature) {
      return { valid: false, error: 'Invalid state structure' };
    }
    
    // Check timestamp (15 minute expiry for OAuth 1.0a flow)
    const age = Date.now() - payload.timestamp;
    if (age > 15 * 60 * 1000) {
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

// Create OAuth 1.0a signature
async function createOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
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
    const oauthToken = url.searchParams.get('oauth_token');
    const oauthVerifier = url.searchParams.get('oauth_verifier');
    const state = url.searchParams.get('state');
    
    // Try to extract redirect_origin from state early
    if (state) {
      try {
        const stateObject = JSON.parse(atob(state));
        if (stateObject?.payload?.redirect_origin) {
          redirectOrigin = stateObject.payload.redirect_origin;
        }
      } catch {
        // State parsing failed, use default
      }
    }
    
    if (!oauthToken || !oauthVerifier || !state) {
      log('warn', 'Missing OAuth 1.0a callback parameters', { 
        hasToken: !!oauthToken, 
        hasVerifier: !!oauthVerifier, 
        hasState: !!state 
      });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'missing_params'), 302);
    }
    
    // Verify state
    const stateResult = await verifyState(state, stateSigningSecret);
    if (!stateResult.valid || !stateResult.payload) {
      log('warn', 'State verification failed', { error: stateResult.error });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'invalid_state'), 302);
    }
    
    const { 
      user_id: userId, 
      redirect_origin: stateRedirectOrigin,
      request_token: storedRequestToken,
      request_token_secret: requestTokenSecret,
    } = stateResult.payload;
    
    if (stateRedirectOrigin) {
      redirectOrigin = stateRedirectOrigin;
    }
    
    // Verify the oauth_token matches what we stored
    if (oauthToken !== storedRequestToken) {
      log('error', 'OAuth token mismatch', { userId });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'token_mismatch'), 302);
    }
    
    log('info', 'Processing Garmin OAuth 1.0a callback', { userId });
    
    // Exchange request token for access token
    const accessTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
    
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: garminClientId,
      oauth_token: oauthToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
      oauth_version: '1.0',
      oauth_verifier: oauthVerifier,
    };
    
    const signature = await createOAuthSignature(
      'POST', 
      accessTokenUrl, 
      oauthParams, 
      garminClientSecret, 
      requestTokenSecret
    );
    oauthParams.oauth_signature = signature;
    
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ');
    
    log('info', 'Exchanging request token for access token', { userId });
    
    const accessTokenResponse = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
    });
    
    if (!accessTokenResponse.ok) {
      const errorText = await accessTokenResponse.text();
      log('error', 'Failed to exchange for access token', { 
        userId, 
        status: accessTokenResponse.status,
        error: errorText.substring(0, 200),
      });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'token_exchange_failed'), 302);
    }
    
    // Parse access token response (form-urlencoded)
    const responseText = await accessTokenResponse.text();
    const responseParams = new URLSearchParams(responseText);
    const accessToken = responseParams.get('oauth_token');
    const accessTokenSecret = responseParams.get('oauth_token_secret');
    
    if (!accessToken || !accessTokenSecret) {
      log('error', 'Missing access token in response', { userId });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'missing_access_token'), 302);
    }
    
    // Compute token hash for webhook correlation
    const tokenHash = await computeTokenHash(accessToken, tokenHashPepper);
    
    const now = new Date();
    
    // Store tokens - OAuth 1.0a tokens don't expire
    const { error: updateError } = await supabaseAdmin
      .from('sleep_sources')
      .update({
        status: 'connected',
        connected_at: now.toISOString(),
        revoked_at: null,
        consent_granted_at: now.toISOString(),
        consent_version: '1.0a',
        garmin_token_hash: tokenHash,
        garmin_token_hash_updated_at: now.toISOString(),
        metadata: {
          oauth_version: '1.0a',
          access_token: accessToken,
          token_secret: accessTokenSecret, // Critical for OAuth 1.0a signing!
          oauth_completed_at: now.toISOString(),
          oauth_pending: false,
          // Clear temporary state
          request_token: null,
          request_token_secret: null,
          nonce: null,
          redirect_origin: null,
        },
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
      .eq('source', 'garmin');
    
    if (updateError) {
      log('error', 'Failed to store access tokens', { userId, error: updateError.message });
      return Response.redirect(buildErrorRedirect(redirectOrigin, 'storage_failed'), 302);
    }
    
    log('info', 'Garmin OAuth 1.0a completed successfully', { 
      userId,
      hashSet: true,
      hasTokenSecret: true,
    });
    
    // ============================================================
    // KLAVIYO TRACKING: Send wearable connected event
    // ============================================================
    try {
      const klaviyoApiKey = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
      
      if (klaviyoApiKey) {
        // Get user email
        const { data: userData } = await supabaseAdmin
          .from('sleep_profiles')
          .select('email')
          .eq('id', userId)
          .maybeSingle();
        
        let userEmail = userData?.email;
        if (!userEmail) {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
          userEmail = authUser?.user?.email;
        }
        
        if (userEmail) {
          // Get all connected wearables
          const { data: allSources } = await supabaseAdmin
            .from('sleep_sources')
            .select('source')
            .eq('user_id', userId)
            .eq('status', 'connected');
          
          const connectedWearables = allSources?.map(s => s.source) || ['garmin'];
          
          log('info', 'Sending Klaviyo wearable connected event', { userId, userEmail, connectedWearables });
          
          // Send event
          await fetch('https://a.klaviyo.com/api/events/', {
            method: 'POST',
            headers: {
              'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
              'Content-Type': 'application/json',
              'revision': '2024-02-15',
            },
            body: JSON.stringify({
              data: {
                type: 'event',
                attributes: {
                  metric: { data: { type: 'metric', attributes: { name: 'RBN_Wearable_Connected' } } },
                  profile: { data: { type: 'profile', attributes: { email: userEmail } } },
                  properties: {
                    device_type: 'garmin',
                    oauth_version: '1.0a',
                    connected_wearables: connectedWearables.join(', '),
                    has_backfill_support: true,
                  },
                  time: now.toISOString(),
                },
              },
            }),
          });
          
          log('info', 'Klaviyo wearable tracking sent successfully');
        }
      }
    } catch (klaviyoError) {
      log('warn', 'Failed to send Klaviyo wearable tracking', { 
        error: klaviyoError instanceof Error ? klaviyoError.message : String(klaviyoError) 
      });
    }
    
    // Redirect to success page
    return Response.redirect(buildSuccessRedirect(redirectOrigin), 302);
    
  } catch (error) {
    log('error', 'Unexpected error in garmin-oauth1-callback', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return Response.redirect(buildErrorRedirect(redirectOrigin, 'internal_error'), 302);
  }
});

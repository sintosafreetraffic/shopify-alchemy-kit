import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Garmin Deauth Handler - Receives deauthorization from Garmin
// POST /garmin/deauth
// 
// When user revokes access in Garmin Connect, this endpoint
// is called to mark the source as revoked and clear tokens/hash.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-garmin-signature',
};

interface GarminDeauthPayload {
  userId: string; // Garmin user ID
  userAccessToken: string; // Our stored OAuth token
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  // Never log tokens or hashes
  const safeData = data ? { ...data } : {};
  delete safeData.access_token;
  delete safeData.userAccessToken;
  delete safeData.token_hash;
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'garmin-deauth',
    message,
    ...safeData,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// Verify Garmin webhook signature
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison
    if (signature.length !== expectedHex.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    log('error', 'Signature verification error', { error: String(error) });
    return false;
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
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const garminWebhookSecret = Deno.env.get('GARMIN_WEBHOOK_SECRET');
    const tokenHashPepper = Deno.env.get('GARMIN_TOKEN_HASH_PEPPER');
    
    if (!garminWebhookSecret) {
      log('error', 'GARMIN_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get raw body for signature verification
    const bodyText = await req.text();
    const signature = req.headers.get('x-garmin-signature') || req.headers.get('X-Garmin-Signature');
    
    if (!signature) {
      log('warn', 'Missing X-Garmin-Signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify signature
    const isValid = await verifySignature(bodyText, signature, garminWebhookSecret);
    if (!isValid) {
      log('warn', 'Invalid deauth webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse payload
    let payload: GarminDeauthPayload;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      log('error', 'Malformed deauth payload', { error: String(e) });
      return new Response(
        JSON.stringify({ error: 'Malformed JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { userAccessToken } = payload;
    
    if (!userAccessToken) {
      log('warn', 'Missing userAccessToken in deauth payload');
      return new Response(
        JSON.stringify({ error: 'Missing userAccessToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    log('info', 'Processing Garmin deauth request');
    
    // Try indexed lookup first if pepper is available
    let matchingSource: { id: string; user_id: string; metadata: Record<string, unknown> } | null = null;
    
    if (tokenHashPepper) {
      const tokenHash = await computeTokenHash(userAccessToken, tokenHashPepper);
      
      const { data: indexedSource, error: indexedError } = await supabaseAdmin
        .from('sleep_sources')
        .select('id, user_id, metadata')
        .eq('source', 'garmin')
        .eq('garmin_token_hash', tokenHash)
        .limit(1)
        .single();
      
      if (!indexedError && indexedSource) {
        matchingSource = indexedSource as { id: string; user_id: string; metadata: Record<string, unknown> };
        log('info', 'User resolved via indexed hash lookup for deauth', { userId: matchingSource.user_id });
      }
    }
    
    // Fallback to legacy scan
    if (!matchingSource) {
      const { data: sources, error: fetchError } = await supabaseAdmin
        .from('sleep_sources')
        .select('id, user_id, metadata')
        .eq('source', 'garmin')
        .not('metadata', 'is', null);
      
      if (fetchError) {
        log('error', 'Failed to query sleep_sources', { error: fetchError.message });
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Find matching user by access token
      const found = sources?.find(s => {
        const meta = s.metadata as Record<string, unknown>;
        return meta?.access_token === userAccessToken;
      });
      
      if (found) {
        matchingSource = found as { id: string; user_id: string; metadata: Record<string, unknown> };
      }
    }
    
    if (!matchingSource) {
      log('warn', 'No matching user for deauth token');
      // Return 200 anyway - Garmin expects acknowledgment
      return new Response(
        JSON.stringify({ success: true, message: 'No matching user found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = matchingSource.user_id;
    const now = new Date().toISOString();
    const metadata = matchingSource.metadata as Record<string, unknown>;
    
    // Update status to revoked, clear tokens AND hash for security
    const { error: updateError } = await supabaseAdmin
      .from('sleep_sources')
      .update({
        status: 'revoked',
        revoked_at: now,
        garmin_token_hash: null, // Clear hash on revoke
        garmin_token_hash_updated_at: null,
        metadata: {
          ...metadata,
          // Clear tokens for security
          access_token: null,
          access_token_secret: null,
          revoked_reason: 'garmin_deauth',
          revoked_at: now,
        },
        updated_at: now,
      })
      .eq('id', matchingSource.id);
    
    if (updateError) {
      log('error', 'Failed to update source status', { userId, error: updateError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to process deauth' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    log('info', 'Garmin source revoked successfully', { userId, hashCleared: true });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Source disconnected',
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    log('error', 'Unexpected error in garmin-deauth', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Garmin Health API - Push Handler
 * POST /garmin-health-push
 * 
 * Garmin pushes full data payloads directly (no callback needed).
 * We store raw, normalize, and update last sync.
 */

import {
  log,
  computePayloadHash,
  storeRawEvent,
  normalizeDaily,
  normalizeSleep,
  updateHealthLastSync,
  createAdminClient,
  GarminDailyPayload,
  GarminSleepPayload,
} from '../_shared/garminHealth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-garmin-signature',
};

// Signature verification
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

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify signature
    const signature = req.headers.get('x-garmin-signature') || '';
    const webhookSecret = Deno.env.get('GARMIN_WEBHOOK_SECRET') || '';
    
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        log('warn', 'Invalid signature on health push');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      log('warn', 'Invalid JSON in health push');
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createAdminClient();
    const tokenHashPepper = Deno.env.get('GARMIN_TOKEN_HASH_PEPPER') || '';

    // Determine summary type
    const url = new URL(req.url);
    const summaryType = url.searchParams.get('type') || 
                        (body.summaryType as string) || 
                        detectSummaryType(body);

    // Get items array based on summary type
    const items = extractItems(body, summaryType);

    log('info', 'Health push received', { 
      summaryType, 
      itemCount: items.length 
    });

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const usersSynced = new Set<string>();

    for (const item of items) {
      try {
        const typedItem = item as GarminDailyPayload | GarminSleepPayload;
        
        // Resolve user from token
        const encoder = new TextEncoder();
        const combined = `${typedItem.userAccessToken}:${tokenHashPepper}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(combined));
        const tokenHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const { data: source } = await supabase
          .from('sleep_sources')
          .select('user_id, user_timezone, on_hold, status')
          .eq('source', 'garmin')
          .eq('garmin_token_hash', tokenHash)
          .limit(1)
          .single();

        // Check on_hold
        if (source?.on_hold) {
          log('info', 'User on hold, skipping', { garminUserId: typedItem.userId });
          skipped++;
          continue;
        }

        // Check revoked
        if (source?.status === 'revoked') {
          log('info', 'User revoked, skipping', { garminUserId: typedItem.userId });
          skipped++;
          continue;
        }

        const userId = source?.user_id || null;

        // Store raw event
        const payloadHash = await computePayloadHash({ type: 'push', summaryType, item });
        const rawResult = await storeRawEvent(supabase, {
          domain: 'health',
          summary_type: summaryType,
          garmin_user_id: typedItem.userId,
          summary_id: typedItem.summaryId || null,
          upload_window_start: null,
          upload_window_end: null,
          payload: { type: 'push', item },
          payload_hash: payloadHash,
        });

        // Normalize based on type
        if (summaryType === 'dailies') {
          const result = await normalizeDaily(
            supabase, 
            typedItem as GarminDailyPayload, 
            rawResult.id, 
            userId
          );
          if (!result.success) {
            log('warn', 'Failed to normalize daily', { error: result.error });
          }
        } else if (summaryType === 'sleeps') {
          const result = await normalizeSleep(
            supabase, 
            typedItem as GarminSleepPayload, 
            rawResult.id, 
            userId
          );
          if (!result.success) {
            log('warn', 'Failed to normalize sleep', { error: result.error });
          }
        }

        if (userId) {
          usersSynced.add(userId);
        }
        processed++;
      } catch (err) {
        log('error', 'Error processing push item', { error: String(err) });
        errors++;
      }
    }

    // Update last sync for all users
    for (const userId of usersSynced) {
      await updateHealthLastSync(supabase, userId);
    }

    log('info', 'Health push processing complete', { 
      summaryType,
      total: items.length,
      processed,
      skipped,
      errors,
      usersUpdated: usersSynced.size,
      durationMs: Date.now() - startTime
    });

    return new Response(JSON.stringify({ 
      ok: true,
      processed,
      skipped,
      errors
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log('error', 'Health push handler error', { error: String(err) });
    // Always return 200 to prevent Garmin retries
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Detect summary type from payload structure
function detectSummaryType(body: Record<string, unknown>): string {
  if (body.dailies) return 'dailies';
  if (body.sleeps) return 'sleeps';
  if (body.epochs) return 'epochs';
  if (body.stressDetails) return 'stress';
  if (body.bodyComps) return 'bodyComps';
  if (body.pulseOx) return 'pulseOx';
  if (body.respiration) return 'respiration';
  if (body.userMetrics) return 'userMetrics';
  if (body.hrv) return 'hrv';
  if (body.bloodPressure) return 'bloodPressure';
  return 'unknown';
}

// Extract items array from various payload formats
function extractItems(body: Record<string, unknown>, summaryType: string): unknown[] {
  const key = summaryType === 'stress' ? 'stressDetails' : summaryType;
  const items = body[key];
  if (Array.isArray(items)) return items;
  
  // Check for nested structure
  for (const val of Object.values(body)) {
    if (Array.isArray(val) && val.length > 0) {
      return val;
    }
  }
  
  return [];
}

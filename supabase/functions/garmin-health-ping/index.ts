/**
 * Garmin Health API - Ping Handler
 * POST /garmin-health-ping
 * 
 * Garmin sends pings when new data is available. We must:
 * 1. Return 200 immediately (<1s)
 * 2. Process callback URL asynchronously after response
 * 
 * Ping payload contains callback URL with query window.
 * We fetch callback, store raw, normalize dailies/sleeps.
 */

import {
  log,
  computePayloadHash,
  storeRawEvent,
  normalizeDaily,
  normalizeSleep,
  updateHealthLastSync,
  fetchCallback,
  createAdminClient,
  GarminDailyPayload,
  GarminSleepPayload,
  HealthPingItem,
} from '../_shared/garminHealth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-garmin-signature',
};

// Signature verification (same as main webhook)
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

// Process ping items asynchronously (after returning 200)
async function processPingItems(
  items: HealthPingItem[],
  summaryType: string
) {
  const supabase = createAdminClient();
  const tokenHashPepper = Deno.env.get('GARMIN_TOKEN_HASH_PEPPER') || '';

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    try {
      // Resolve user from token
      const encoder = new TextEncoder();
      const combined = `${item.userAccessToken}:${tokenHashPepper}`;
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

      // Check on_hold - accept but don't process
      if (source?.on_hold) {
        log('info', 'User on hold, skipping processing', { garminUserId: item.userId });
        skipped++;
        continue;
      }

      // Check revoked
      if (source?.status === 'revoked') {
        log('info', 'User revoked, skipping', { garminUserId: item.userId });
        skipped++;
        continue;
      }

      const userId = source?.user_id || null;

      // Store ping event raw
      const pingHash = await computePayloadHash({ type: 'ping', summaryType, item });
      await storeRawEvent(supabase, {
        domain: 'health',
        summary_type: summaryType,
        garmin_user_id: item.userId,
        summary_id: item.summaryId || null,
        upload_window_start: item.uploadStartTimeInSeconds || null,
        upload_window_end: item.uploadEndTimeInSeconds || null,
        payload: { type: 'ping', item },
        payload_hash: pingHash,
      });

      // Fetch callback if present
      if (item.callbackURL) {
        const callbackResult = await fetchCallback(item.callbackURL);
        
        if (callbackResult.success && callbackResult.data) {
          const callbackData = callbackResult.data as Record<string, unknown>[];

          // Store callback response raw
          const callbackHash = await computePayloadHash({ type: 'callback', summaryType, data: callbackData });
          const rawResult = await storeRawEvent(supabase, {
            domain: 'health',
            summary_type: summaryType,
            garmin_user_id: item.userId,
            summary_id: null,
            upload_window_start: item.uploadStartTimeInSeconds || null,
            upload_window_end: item.uploadEndTimeInSeconds || null,
            payload: { type: 'callback', data: callbackData },
            payload_hash: callbackHash,
          });

          // Normalize based on summary type
          if (summaryType === 'dailies' && Array.isArray(callbackData)) {
            for (const daily of callbackData as unknown as GarminDailyPayload[]) {
              await normalizeDaily(supabase, daily, rawResult.id, userId);
            }
          } else if (summaryType === 'sleeps' && Array.isArray(callbackData)) {
            for (const sleep of callbackData as unknown as GarminSleepPayload[]) {
              await normalizeSleep(supabase, sleep, rawResult.id, userId);
            }
          }

          // Update last sync
          if (userId) {
            await updateHealthLastSync(supabase, userId);
          }

          processed++;
        } else {
          log('warn', 'Callback fetch failed', { 
            garminUserId: item.userId, 
            error: callbackResult.error 
          });
          errors++;
        }
      } else {
        // No callback - might be deregistration
        log('info', 'Ping without callback (possible deregistration)', { 
          garminUserId: item.userId,
          summaryType 
        });
        processed++;
      }
    } catch (err) {
      log('error', 'Error processing ping item', { 
        garminUserId: item.userId, 
        error: String(err) 
      });
      errors++;
    }
  }

  log('info', 'Ping processing complete', { 
    summaryType, 
    total: items.length, 
    processed, 
    skipped, 
    errors 
  });
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
        log('warn', 'Invalid signature on health ping');
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
      log('warn', 'Invalid JSON in health ping');
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract summary type from URL or body
    const url = new URL(req.url);
    const summaryType = url.searchParams.get('type') || 
                        (body.summaryType as string) || 
                        'unknown';

    // Get items array
    const items = (body.dailies || body.sleeps || body.epochs || 
                   body.activities || body[summaryType] || []) as HealthPingItem[];

    log('info', 'Health ping received', { 
      summaryType, 
      itemCount: items.length,
      responseTimeMs: Date.now() - startTime
    });

    // Return 200 immediately (Garmin requires <30s, we aim for <1s)
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // Process asynchronously after returning response
    // Use waitUntil pattern via EdgeRuntime.waitUntil if available
    const processPromise = processPingItems(items, summaryType);
    
    // @ts-ignore - Deno Deploy specific
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processPromise);
    } else {
      // Fallback: don't await, let it run
      processPromise.catch(err => log('error', 'Background processing failed', { error: String(err) }));
    }

    return response;
  } catch (err) {
    log('error', 'Health ping handler error', { error: String(err) });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

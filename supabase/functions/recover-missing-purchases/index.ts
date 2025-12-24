/**
 * Phase 3: Recovery & Self-Healing Edge Function
 * 
 * Automatically recovers failed Pinterest tracking events using first-party data.
 * Requires x-cron-secret header for authentication.
 * 
 * Query params:
 * - dry_run=1: No writes, no outbound calls
 * - limit: Max orders per run (default 50, clamped to 50)
 * - max_age_days: How far back to look (default 7, clamped to 30)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// SHA-256 hash for payload fingerprint
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compute payload fingerprint for idempotency
async function computeFingerprint(orderId: string, value: number, currency: string): Promise<string> {
  return sha256(`${orderId}||${value}||${currency}`);
}

// Pattern-based render_status classification
function isSuccessLike(status: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('success') || s === 'fallback_render' || s === 'recovered_success';
}

function isTransient(status: string | null, createdAt: Date): boolean {
  if (!status) return true; // NULL is transient
  const s = status.toLowerCase();
  if (s === 'pending') {
    // Stale pending: older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return createdAt < fiveMinutesAgo;
  }
  return s.includes('timeout') || s.includes('rate');
}

function isTerminal(status: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('invalid') || s.includes('rejected');
}

// Backoff calculation: returns milliseconds since last attempt before retry is allowed
function getBackoffMs(attemptNo: number): number {
  switch (attemptNo) {
    case 1: return 0; // immediate
    case 2: return 15 * 60 * 1000; // 15 minutes
    case 3: return 60 * 60 * 1000; // 1 hour
    case 4: return 6 * 60 * 60 * 1000; // 6 hours
    case 5: return 24 * 60 * 60 * 1000; // 24 hours
    default: return Infinity; // No more retries
  }
}

interface RecoveryStats {
  candidates_found: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  dead_lettered: number;
  rate_limited: boolean;
  method_direct_capi: number;
  method_render: number;
  method_none: number;
  durations: number[];
}

interface RecoveryCandidate {
  order_id: string;
  value: number;
  currency: string;
  epik: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page: string | null;
  source_table: 'missing' | 'pinterest';
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[Recovery] Request received at", new Date().toISOString());

  // Security: Require x-cron-secret header
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  
  if (!cronSecret || cronSecret !== expectedSecret) {
    console.error("[Recovery] Unauthorized - invalid or missing x-cron-secret");
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log("[Recovery] Auth passed via x-cron-secret");

  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === '1';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 50);
    const maxAgeDays = Math.min(parseInt(url.searchParams.get('max_age_days') || '7', 10) || 7, 30);

    console.log("[Recovery] Params:", { dryRun, limit, maxAgeDays });

    // Clamp logging
    if (url.searchParams.get('limit') && parseInt(url.searchParams.get('limit')!, 10) > 50) {
      console.log("[Recovery] Clamped limit from", url.searchParams.get('limit'), "to 50");
    }
    if (url.searchParams.get('max_age_days') && parseInt(url.searchParams.get('max_age_days')!, 10) > 30) {
      console.log("[Recovery] Clamped max_age_days from", url.searchParams.get('max_age_days'), "to 30");
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Detect available recovery methods
    const hasDirectCapi = !!Deno.env.get('PINTEREST_CONVERSION_TOKEN');
    const hasRenderServer = !!Deno.env.get('TRACKING_SERVER_URL');
    console.log("[Recovery] Available methods:", { hasDirectCapi, hasRenderServer });

    const stats: RecoveryStats = {
      candidates_found: 0,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      dead_lettered: 0,
      rate_limited: false,
      method_direct_capi: 0,
      method_render: 0,
      method_none: 0,
      durations: [],
    };

    // Step 1: Get candidates from missing_purchase_events
    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: missingEvents, error: missingError } = await supabase
      .from('missing_purchase_events')
      .select('order_id, order_created_at, detected_at')
      .eq('status', 'detected')
      .gte('detected_at', cutoffDate)
      .limit(limit);

    if (missingError) {
      console.error("[Recovery] Error fetching missing_purchase_events:", missingError);
      throw new Error(`Failed to fetch missing events: ${missingError.message}`);
    }

    console.log("[Recovery] Found", missingEvents?.length || 0, "candidates in missing_purchase_events");

    // For each missing event, try to get data from pinterest_purchase_events
    const candidates: RecoveryCandidate[] = [];
    
    for (const missing of missingEvents || []) {
      // Look up the original event data
      const { data: eventData } = await supabase
        .from('pinterest_purchase_events')
        .select('*')
        .eq('order_id', missing.order_id)
        .single();

      if (eventData) {
        // Skip if already success-like
        if (isSuccessLike(eventData.render_status)) {
          console.log("[Recovery] Skipping", missing.order_id, "- already success-like:", eventData.render_status);
          continue;
        }
        
        candidates.push({
          order_id: eventData.order_id,
          value: eventData.value,
          currency: eventData.currency,
          epik: eventData.epik,
          utm_source: eventData.utm_source,
          utm_medium: eventData.utm_medium,
          utm_campaign: eventData.utm_campaign,
          utm_content: eventData.utm_content,
          utm_term: eventData.utm_term,
          landing_page: eventData.landing_page,
          source_table: 'missing',
        });
      } else {
        // No pinterest_purchase_events data - we can't recover without value/currency
        console.log("[Recovery] No event data for order", missing.order_id, "- cannot recover");
      }
    }

    stats.candidates_found = candidates.length;
    console.log("[Recovery] Valid candidates:", candidates.length);

    if (dryRun) {
      console.log("[Recovery] DRY RUN - no writes or outbound calls");
      
      // Log job even in dry run
      const { error: jobError } = await supabase.from('tracking_jobs').insert({
        job_name: 'recover-missing-purchases',
        success: true,
        duration_ms: Date.now() - startTime,
        stats: { ...stats, dry_run: true },
      });
      
      if (jobError) {
        console.error("[Recovery] Failed to log job:", jobError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          candidates_found: stats.candidates_found,
          attempted: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          dead_lettered: 0,
          rate_limited: false,
          stats: {
            method_direct_capi: 0,
            method_render: 0,
            method_none: 0,
            avg_duration_ms: 0,
          },
          error: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process candidates with concurrency limit
    const MAX_CONCURRENT = 5;
    const MAX_ATTEMPTS = 5;

    for (const candidate of candidates) {
      if (stats.rate_limited) {
        console.log("[Recovery] Rate limited - stopping");
        break;
      }

      // Check previous attempts
      const { data: prevAttempts } = await supabase
        .from('recovery_purchase_attempts')
        .select('attempt_no, created_at, outcome')
        .eq('order_id', candidate.order_id)
        .order('attempt_no', { ascending: false })
        .limit(1);

      const lastAttempt = prevAttempts?.[0];
      const attemptNo = lastAttempt ? lastAttempt.attempt_no + 1 : 1;

      // Check if already succeeded
      const { data: successAttempt } = await supabase
        .from('recovery_purchase_attempts')
        .select('id')
        .eq('order_id', candidate.order_id)
        .eq('outcome', 'success')
        .limit(1);

      if (successAttempt && successAttempt.length > 0) {
        console.log("[Recovery] Order", candidate.order_id, "already has success - skipping");
        stats.skipped++;
        continue;
      }

      // Check max attempts
      if (attemptNo > MAX_ATTEMPTS) {
        console.log("[Recovery] Order", candidate.order_id, "exceeded max attempts - dead lettering");
        
        // Dead letter
        await supabase.from('recovery_dead_letters').upsert({
          order_id: candidate.order_id,
          final_status: 'dead_lettered',
          reason: 'max_attempts_exceeded',
          last_attempt_no: attemptNo - 1,
          last_error_code: lastAttempt?.outcome === 'failed' ? 'max_retries' : null,
          last_error_message: `Exceeded ${MAX_ATTEMPTS} attempts`,
        }, { onConflict: 'order_id' });

        // Update missing_purchase_events
        await supabase
          .from('missing_purchase_events')
          .update({ status: 'ignored' })
          .eq('order_id', candidate.order_id);

        stats.dead_lettered++;
        continue;
      }

      // Check backoff
      if (lastAttempt) {
        const backoffMs = getBackoffMs(attemptNo);
        const lastAttemptTime = new Date(lastAttempt.created_at).getTime();
        const timeSinceLastAttempt = Date.now() - lastAttemptTime;
        
        if (timeSinceLastAttempt < backoffMs) {
          console.log("[Recovery] Order", candidate.order_id, "in backoff - skipping");
          stats.skipped++;
          continue;
        }
      }

      // Determine method and attempt recovery
      let method: 'direct_capi' | 'render' | 'none' = 'none';
      if (hasDirectCapi) method = 'direct_capi';
      else if (hasRenderServer) method = 'render';

      if (method === 'none') {
        console.log("[Recovery] No recovery method available for", candidate.order_id);
        
        const fingerprint = await computeFingerprint(candidate.order_id, candidate.value, candidate.currency);
        await supabase.from('recovery_purchase_attempts').insert({
          order_id: candidate.order_id,
          attempt_no: attemptNo,
          method: 'none',
          payload_fingerprint: fingerprint,
          outcome: 'skipped',
          error_code: 'no_method',
          error_message: 'No recovery method configured',
        });

        stats.skipped++;
        stats.method_none++;
        continue;
      }

      stats.attempted++;
      const attemptStart = Date.now();
      const fingerprint = await computeFingerprint(candidate.order_id, candidate.value, candidate.currency);

      try {
        let result: { success: boolean; status: number; response: any; error?: string };

        if (method === 'direct_capi') {
          // Call pinterest-capi-direct
          stats.method_direct_capi++;
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
          
          try {
            const response = await fetch(
              `${SUPABASE_URL}/functions/v1/pinterest-capi-direct`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  order_id: candidate.order_id,
                  value: candidate.value,
                  currency: candidate.currency,
                  pinterest_click_id: candidate.epik,
                  utm_source: candidate.utm_source,
                  utm_medium: candidate.utm_medium,
                  utm_campaign: candidate.utm_campaign,
                  utm_content: candidate.utm_content,
                  utm_term: candidate.utm_term,
                  landing_page: candidate.landing_page,
                }),
                signal: controller.signal,
              }
            );
            
            clearTimeout(timeout);
            
            const body = await response.json();
            result = {
              success: response.ok,
              status: response.status,
              response: body,
              error: response.ok ? undefined : body.error || 'Unknown error',
            };

            // Check for rate limiting
            if (response.status === 429) {
              stats.rate_limited = true;
              console.log("[Recovery] Rate limited by Pinterest API");
            }
          } catch (fetchError: any) {
            if (fetchError.name === 'AbortError') {
              result = {
                success: false,
                status: 0,
                response: null,
                error: 'timeout',
              };
            } else {
              throw fetchError;
            }
          }
        } else {
          // Use render server
          stats.method_render++;
          const TRACKING_SERVER_URL = Deno.env.get('TRACKING_SERVER_URL')!;
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          
          try {
            const response = await fetch(
              `${TRACKING_SERVER_URL}/track`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'purchase',
                  order_id: candidate.order_id,
                  value: candidate.value,
                  currency: candidate.currency,
                  epik: candidate.epik,
                  utm_source: candidate.utm_source,
                  utm_medium: candidate.utm_medium,
                  utm_campaign: candidate.utm_campaign,
                  landing_page: candidate.landing_page,
                }),
                signal: controller.signal,
              }
            );
            
            clearTimeout(timeout);
            
            const body = await response.json().catch(() => ({}));
            result = {
              success: response.ok,
              status: response.status,
              response: body,
              error: response.ok ? undefined : 'Render tracking failed',
            };

            if (response.status === 429) {
              stats.rate_limited = true;
            }
          } catch (fetchError: any) {
            if (fetchError.name === 'AbortError') {
              result = {
                success: false,
                status: 0,
                response: null,
                error: 'timeout',
              };
            } else {
              throw fetchError;
            }
          }
        }

        const duration = Date.now() - attemptStart;
        stats.durations.push(duration);

        // Filter response_json to allowed fields only
        const safeResponse = result.response ? {
          request_id: result.response.request_id,
          pinterest_event_id: result.response.event_id,
          error_type: result.response.error_type,
          retry_after: result.response.retry_after,
        } : null;

        // Record attempt
        await supabase.from('recovery_purchase_attempts').insert({
          order_id: candidate.order_id,
          attempt_no: attemptNo,
          method,
          payload_fingerprint: fingerprint,
          outcome: result.success ? 'success' : 'failed',
          http_status: result.status,
          error_code: result.success ? null : (result.error === 'timeout' ? 'timeout' : 'api_error'),
          error_message: result.error || null,
          response_json: safeResponse,
          duration_ms: duration,
        });

        if (result.success) {
          stats.succeeded++;
          console.log("[Recovery] ✅ Recovered", candidate.order_id);

          // Update missing_purchase_events
          await supabase
            .from('missing_purchase_events')
            .update({ status: 'recovered' })
            .eq('order_id', candidate.order_id);

          // Update pinterest_purchase_events render_status
          await supabase
            .from('pinterest_purchase_events')
            .update({ render_status: 'recovered_success' })
            .eq('order_id', candidate.order_id);
        } else {
          stats.failed++;
          console.log("[Recovery] ❌ Failed", candidate.order_id, ":", result.error);
        }
      } catch (error: any) {
        const duration = Date.now() - attemptStart;
        stats.durations.push(duration);
        stats.failed++;

        console.error("[Recovery] Exception for", candidate.order_id, ":", error.message);

        await supabase.from('recovery_purchase_attempts').insert({
          order_id: candidate.order_id,
          attempt_no: attemptNo,
          method,
          payload_fingerprint: fingerprint,
          outcome: 'failed',
          http_status: null,
          error_code: 'exception',
          error_message: error.message,
          response_json: null,
          duration_ms: duration,
        });
      }
    }

    // Calculate average duration
    const avgDuration = stats.durations.length > 0
      ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
      : 0;

    // Log job completion
    const totalDuration = Date.now() - startTime;
    const { error: jobLogError } = await supabase.from('tracking_jobs').insert({
      job_name: 'recover-missing-purchases',
      success: true,
      duration_ms: totalDuration,
      stats: {
        candidates_found: stats.candidates_found,
        attempted: stats.attempted,
        succeeded: stats.succeeded,
        failed: stats.failed,
        skipped: stats.skipped,
        dead_lettered: stats.dead_lettered,
        rate_limited: stats.rate_limited,
      },
    });

    if (jobLogError) {
      console.error("[Recovery] Failed to log job:", jobLogError);
    }

    console.log("[Recovery] Complete:", stats);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: false,
        candidates_found: stats.candidates_found,
        attempted: stats.attempted,
        succeeded: stats.succeeded,
        failed: stats.failed,
        skipped: stats.skipped,
        dead_lettered: stats.dead_lettered,
        rate_limited: stats.rate_limited,
        stats: {
          method_direct_capi: stats.method_direct_capi,
          method_render: stats.method_render,
          method_none: stats.method_none,
          avg_duration_ms: avgDuration,
        },
        error: null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("[Recovery] Fatal error:", error);

    // Try to log failure
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      await supabase.from('tracking_jobs').insert({
        job_name: 'recover-missing-purchases',
        success: false,
        duration_ms: Date.now() - startTime,
        error: error.message,
      });
    } catch {}

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

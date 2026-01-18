/**
 * A/B Probability Compute Edge Function
 * v2.4.1 - Server-side Bayesian probability calculation
 * 
 * Returns computed probabilities for A/B test decision-making:
 * - P(B>A) for ATC rate
 * - P(B>A) for Purchase rate
 * - P(B>A) for Quality (refund proxy) - if data exists
 * 
 * Uses data-seeded RNG for deterministic results (changes only when data changes)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Configuration
// ============================================================================

const METHOD_VERSION = 'v2.4.1-beta-mc-1000';
const MONTE_CARLO_SAMPLES = 1000;
const MIN_SAMPLES_FOR_PROBABILITY = 30;
const MIN_PURCHASES_FOR_PROBABILITY = 10;
const MIN_ATC_FOR_PROBABILITY = 5;
const MIN_QUALITY_EVENTS = 5;
const CACHE_TTL_SECONDS = 300; // 5 minutes

// ============================================================================
// Cyrb53 Hash (fast, no dependencies)
// ============================================================================

function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// ============================================================================
// Seeded RNG (data-seeded, deterministic)
// ============================================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

function createDataSeed(
  testName: string,
  sessionsA: number,
  sessionsB: number,
  atcA: number,
  atcB: number,
  purchasesA: number,
  purchasesB: number,
  refundsA: number = 0,
  refundsB: number = 0
): number {
  const seedString = `${testName}|${sessionsA}|${sessionsB}|${atcA}|${atcB}|${purchasesA}|${purchasesB}|${refundsA}|${refundsB}`;
  return cyrb53(seedString);
}

// ============================================================================
// Beta Distribution Sampling
// ============================================================================

function sampleGammaSeeded(shape: number, rng: SeededRandom): number {
  if (shape < 1) {
    return sampleGammaSeeded(shape + 1, rng) * Math.pow(rng.next(), 1 / shape);
  }
  
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  
  while (true) {
    let x: number, v: number;
    do {
      // Box-Muller transform for standard normal
      const u1 = rng.next();
      const u2 = rng.next();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    
    v = v * v * v;
    const u = rng.next();
    
    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }
    
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

function sampleBetaSeeded(alpha: number, beta: number, rng: SeededRandom): number {
  const gammaA = sampleGammaSeeded(alpha, rng);
  const gammaB = sampleGammaSeeded(beta, rng);
  return gammaA / (gammaA + gammaB);
}

function calculateProbabilityBBetterThanA(
  conversionsA: number,
  sessionsA: number,
  conversionsB: number,
  sessionsB: number,
  rng: SeededRandom,
  minConversions: number = 5
): number | null {
  if (sessionsA < MIN_SAMPLES_FOR_PROBABILITY || sessionsB < MIN_SAMPLES_FOR_PROBABILITY) {
    return null;
  }
  if (conversionsA < minConversions || conversionsB < minConversions) {
    return null;
  }
  
  // Beta distribution parameters (Jeffreys prior)
  const alphaA = conversionsA + 1;
  const betaA = sessionsA - conversionsA + 1;
  const alphaB = conversionsB + 1;
  const betaB = sessionsB - conversionsB + 1;
  
  let bWins = 0;
  for (let i = 0; i < MONTE_CARLO_SAMPLES; i++) {
    const sampleA = sampleBetaSeeded(alphaA, betaA, rng);
    const sampleB = sampleBetaSeeded(alphaB, betaB, rng);
    if (sampleB > sampleA) bWins++;
  }
  
  return bWins / MONTE_CARLO_SAMPLES;
}

// For quality, we want P(B worse than A) for refund rate
// i.e., P(refund_rate_B > refund_rate_A) - higher is BAD
function calculateQualityProbability(
  refundsA: number,
  purchasesA: number,
  refundsB: number,
  purchasesB: number,
  rng: SeededRandom
): number | null {
  if (purchasesA < MIN_QUALITY_EVENTS || purchasesB < MIN_QUALITY_EVENTS) {
    return null;
  }
  if (refundsA < 1 && refundsB < 1) {
    return null; // No quality events to analyze
  }
  
  // Beta parameters for refund rate
  const alphaA = refundsA + 1;
  const betaA = purchasesA - refundsA + 1;
  const alphaB = refundsB + 1;
  const betaB = purchasesB - refundsB + 1;
  
  let bWorse = 0;
  for (let i = 0; i < MONTE_CARLO_SAMPLES; i++) {
    const sampleA = sampleBetaSeeded(alphaA, betaA, rng);
    const sampleB = sampleBetaSeeded(alphaB, betaB, rng);
    if (sampleB > sampleA) bWorse++; // Higher refund rate = worse
  }
  
  return bWorse / MONTE_CARLO_SAMPLES;
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { testName } = await req.json().catch(() => ({ testName: 'urgency_scarcity_test' }));
    
    console.log(`[ab-probability-compute] Computing probabilities for test: ${testName}`);

    // Fetch funnel data
    const { data: funnelData, error: funnelError } = await supabase
      .from('ab_funnel_comparison')
      .select('*');
    
    if (funnelError) {
      console.error('[ab-probability-compute] Funnel fetch error:', funnelError);
      throw funnelError;
    }

    const variantA = funnelData?.find((d: any) => d.ab_variant === 'A');
    const variantB = funnelData?.find((d: any) => d.ab_variant === 'B');

    const sessionsA = variantA?.page_views || 0;
    const sessionsB = variantB?.page_views || 0;
    const atcA = variantA?.add_to_carts || 0;
    const atcB = variantB?.add_to_carts || 0;
    const purchasesA = variantA?.purchases || 0;
    const purchasesB = variantB?.purchases || 0;

    // Fetch quality data
    const { data: qualityData, error: qualityError } = await supabase
      .from('ab_quality_metrics')
      .select('*');
    
    if (qualityError) {
      console.error('[ab-probability-compute] Quality fetch error:', qualityError);
    }

    const qualityA = qualityData?.find((d: any) => d.ab_variant === 'A');
    const qualityB = qualityData?.find((d: any) => d.ab_variant === 'B');
    const refundsA = (qualityA?.refund_count || 0) + (qualityA?.chargeback_count || 0);
    const refundsB = (qualityB?.refund_count || 0) + (qualityB?.chargeback_count || 0);

    // Create data-seeded RNG
    const seed = createDataSeed(testName, sessionsA, sessionsB, atcA, atcB, purchasesA, purchasesB, refundsA, refundsB);
    const rng = new SeededRandom(seed);

    console.log(`[ab-probability-compute] Data: sessionsA=${sessionsA}, sessionsB=${sessionsB}, atcA=${atcA}, atcB=${atcB}, purchasesA=${purchasesA}, purchasesB=${purchasesB}, refundsA=${refundsA}, refundsB=${refundsB}`);

    // Calculate probabilities
    const p_atc_b_beats_a = calculateProbabilityBBetterThanA(
      atcA, sessionsA, atcB, sessionsB, rng, MIN_ATC_FOR_PROBABILITY
    );
    
    // Reset RNG for purchase calculation (ensures independence)
    const rng2 = new SeededRandom(seed + 1);
    const p_purchase_b_beats_a = calculateProbabilityBBetterThanA(
      purchasesA, sessionsA, purchasesB, sessionsB, rng2, MIN_PURCHASES_FOR_PROBABILITY
    );

    // Quality probability (P that B has WORSE quality than A)
    const rng3 = new SeededRandom(seed + 2);
    const p_quality_b_worse_than_a = calculateQualityProbability(
      refundsA, purchasesA, refundsB, purchasesB, rng3
    );

    // Calculate quality lift (refund rate difference)
    const refundRateA = purchasesA > 0 ? refundsA / purchasesA : 0;
    const refundRateB = purchasesB > 0 ? refundsB / purchasesB : 0;
    const qualityLift = refundRateA > 0 
      ? ((refundRateB - refundRateA) / refundRateA) * 100 
      : (refundRateB > 0 ? 100 : 0);

    // Calculate revenue/session lift
    const revenueA = variantA?.total_revenue || 0;
    const revenueB = variantB?.total_revenue || 0;
    const rpsA = sessionsA > 0 ? revenueA / sessionsA : 0;
    const rpsB = sessionsB > 0 ? revenueB / sessionsB : 0;
    const rpsLift = rpsA > 0 ? ((rpsB - rpsA) / rpsA) * 100 : null;

    // Generate inputs hash for cache identity
    const inputsHash = cyrb53(`${sessionsA}|${sessionsB}|${atcA}|${atcB}|${purchasesA}|${purchasesB}|${refundsA}|${refundsB}`).toString(16);

    const result = {
      p_atc_b_beats_a,
      p_purchase_b_beats_a,
      p_quality_b_worse_than_a,
      quality_lift_percent: qualityLift,
      rps_lift_percent: rpsLift,
      refund_rate_a: refundRateA * 100,
      refund_rate_b: refundRateB * 100,
      computed_at: new Date().toISOString(),
      method_version: METHOD_VERSION,
      inputs_hash: inputsHash,
      cache_ttl_seconds: CACHE_TTL_SECONDS,
      metrics: {
        sessions_a: sessionsA,
        sessions_b: sessionsB,
        atc_a: atcA,
        atc_b: atcB,
        purchases_a: purchasesA,
        purchases_b: purchasesB,
        refunds_a: refundsA,
        refunds_b: refundsB,
        revenue_a: revenueA,
        revenue_b: revenueB,
      },
      thresholds: {
        min_samples: MIN_SAMPLES_FOR_PROBABILITY,
        min_purchases: MIN_PURCHASES_FOR_PROBABILITY,
        min_atc: MIN_ATC_FOR_PROBABILITY,
        min_quality_events: MIN_QUALITY_EVENTS,
      },
    };

    console.log(`[ab-probability-compute] Result:`, JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ab-probability-compute] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, fallback_to_client: true }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

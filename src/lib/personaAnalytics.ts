/**
 * Persona Analytics & Revenue Attribution
 * 
 * Centralized analytics layer for persona-based tracking, experiment views,
 * and revenue attribution across the purchase funnel.
 * 
 * DESIGN PRINCIPLES:
 * - Deterministic tracking (no randomness)
 * - No PIIs in analytics payloads
 * - Fail silently (analytics should never break UX)
 * - Supports PostHog OR Supabase fallback
 * 
 * IMPORTANT: Uses unified session ID from abTesting.ts to ensure funnel integrity
 */

import type { PersonaCluster, CoreNeed, SleepAssessment } from "@/components/sleep-quiz/QuizTypes";
import { CORE_NEED_MAP } from "@/components/sleep-quiz/QuizTypes";
import { getSessionId as getUnifiedSessionId } from "@/lib/abTesting";

// ============ TYPES ============

export interface ExperimentViewPayload {
  event_type: "experiment_view";  // Changed from 'type' to 'event_type' to match edge function
  experimentKey: string;
  variant: string;
  persona_cluster: PersonaCluster | null;
  persona_confidence: number | null;
  coach_readiness_score: number | null;
  core_need: CoreNeed | null;
  source: "quiz_results_hero" | "coach_hero" | "persona_lp" | "custom";
  timestamp: string;
  session_id: string;
}

export interface RevenueAttributionPayload {
  event_type: "revenue_attribution";  // Changed from 'type' to 'event_type' to match edge function
  event: "add_to_cart" | "begin_checkout" | "purchase";
  persona_cluster: PersonaCluster | null;
  persona_confidence: number | null;
  core_need: CoreNeed | null;
  coach_readiness_score: number | null;
  persona_experiment_variants: Record<string, string>;
  product_recommendation_used: boolean;
  product_id: string;
  product_title: string;
  value: number;
  currency: string;
  quantity: number;
  timestamp: string;
  session_id: string;
}

// ============ SESSION ID HELPER ============
// Use unified session ID for cross-funnel tracking consistency

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  return getUnifiedSessionId();
}

// ============ CACHED ASSESSMENT HELPER ============

function getCachedPersonaContext(): {
  persona_cluster: PersonaCluster | null;
  persona_confidence: number | null;
  core_need: CoreNeed | null;
  coach_readiness_score: number | null;
  persona_experiment_variants: Record<string, string>;
} {
  const defaultResult = {
    persona_cluster: null,
    persona_confidence: null,
    core_need: null,
    coach_readiness_score: null,
    persona_experiment_variants: {},
  };

  if (typeof window === "undefined") return defaultResult;

  try {
    const cached = sessionStorage.getItem("rbn_sleep_quiz_v7_results");
    if (!cached) return defaultResult;

    const parsed = JSON.parse(cached);
    const assessment = parsed.assessment as SleepAssessment | null;
    
    if (!assessment?.persona?.cluster) return defaultResult;

    return {
      persona_cluster: assessment.persona.cluster,
      persona_confidence: assessment.persona.confidence ?? null,
      core_need: CORE_NEED_MAP[assessment.persona.cluster] ?? null,
      coach_readiness_score: assessment.coach_readiness_score ?? null,
      persona_experiment_variants: parsed.experiment_variants ?? {},
    };
  } catch {
    return defaultResult;
  }
}

// ============ PRODUCT RECOMMENDATION CHECK ============

/**
 * Check if a product was recommended by the quiz assessment
 */
export function getProductRecommendationUsed(productId: string, productTitle: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const cached = sessionStorage.getItem("rbn_sleep_quiz_v7_results");
    if (!cached) return false;

    const parsed = JSON.parse(cached);
    const assessment = parsed.assessment as SleepAssessment | null;
    
    if (!assessment?.productRecommendations) return false;

    const titleLower = productTitle.toLowerCase();
    const { primary_product, secondary_product, recommended_bundle } = assessment.productRecommendations;

    // Check if product matches recommendation
    if (primary_product === "ergonomic_pillow" && titleLower.includes("ergonomic") && titleLower.includes("pillow")) {
      return true;
    }
    if (secondary_product === "knee_pillow" && titleLower.includes("knee")) {
      return true;
    }
    if (secondary_product === "silk_mask" && titleLower.includes("mask")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ============ EXPERIMENT VIEW TRACKING ============

/**
 * Track experiment view with full persona context
 * 
 * Sends to Supabase persona-analytics edge function.
 * Designed for future PostHog integration.
 */
export async function trackExperimentView(
  experimentKey: string,
  variant: string,
  source: ExperimentViewPayload["source"]
): Promise<void> {
  const context = getCachedPersonaContext();
  
  const payload: ExperimentViewPayload = {
    event_type: "experiment_view",  // Use event_type to match edge function schema
    experimentKey,
    variant,
    persona_cluster: context.persona_cluster,
    persona_confidence: context.persona_confidence,
    core_need: context.core_need,
    coach_readiness_score: context.coach_readiness_score,
    source,
    timestamp: new Date().toISOString(),
    session_id: getOrCreateSessionId(),
  };

  // Debug logging when enabled
  if (typeof window !== "undefined" && localStorage.getItem("DEBUG_ANALYTICS") === "1") {
    console.log("[PersonaAnalytics] Experiment view payload:", JSON.stringify(payload, null, 2));
  }

  // Send to Supabase - never block UX
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/persona-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({ events: [payload] }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[PersonaAnalytics] Experiment view failed (${response.status}):`, errorText);
    }
  } catch (e) {
    // Silent fail - never break UX
    console.warn("[PersonaAnalytics] Experiment view network error:", e);
  }
}

// ============ REVENUE ATTRIBUTION ============

/**
 * Track revenue attribution events (add to cart, checkout, purchase)
 * 
 * Sends to Supabase for analytics aggregation.
 */
export async function trackRevenueAttribution(
  event: RevenueAttributionPayload["event"],
  product: {
    id: string;
    title: string;
    price: number;
    currency: string;
    quantity: number;
  }
): Promise<void> {
  const context = getCachedPersonaContext();
  
  const payload: RevenueAttributionPayload = {
    event_type: "revenue_attribution",  // Use event_type to match edge function schema
    event,
    persona_cluster: context.persona_cluster,
    persona_confidence: context.persona_confidence,
    core_need: context.core_need,
    coach_readiness_score: context.coach_readiness_score,
    persona_experiment_variants: context.persona_experiment_variants,
    product_recommendation_used: getProductRecommendationUsed(product.id, product.title),
    product_id: product.id,
    product_title: product.title,
    value: product.price * product.quantity,
    currency: product.currency,
    quantity: product.quantity,
    timestamp: new Date().toISOString(),
    session_id: getOrCreateSessionId(),
  };

  // Debug logging when enabled
  if (typeof window !== "undefined" && localStorage.getItem("DEBUG_ANALYTICS") === "1") {
    console.log("[PersonaAnalytics] Revenue attribution payload:", JSON.stringify(payload, null, 2));
  }

  // Send to Supabase - never block UX
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/persona-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({ events: [payload] }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[PersonaAnalytics] Revenue attribution failed (${response.status}):`, errorText);
    }
  } catch (e) {
    // Silent fail - never break UX
    console.warn("[PersonaAnalytics] Revenue attribution network error:", e);
  }
}

// ============ KLAVIYO INTEGRATION HELPER ============

/**
 * Build persona context for Klaviyo tracking calls
 * Use with existing Klaviyo trackAddedToCart, trackCheckout, etc.
 */
export function getPersonaContextForKlaviyo(): {
  persona_cluster?: string;
  persona_confidence?: number;
  core_need?: string;
  coach_readiness_score?: number;
} {
  const context = getCachedPersonaContext();
  
  const result: Record<string, string | number> = {};
  
  if (context.persona_cluster) result.persona_cluster = context.persona_cluster;
  if (context.persona_confidence !== null) result.persona_confidence = context.persona_confidence;
  if (context.core_need) result.core_need = context.core_need;
  if (context.coach_readiness_score !== null) result.coach_readiness_score = context.coach_readiness_score;
  
  return result;
}

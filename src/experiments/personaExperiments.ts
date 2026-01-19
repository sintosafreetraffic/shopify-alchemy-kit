/**
 * Persona-Based A/B Testing Infrastructure
 * 
 * Centralized, deterministic experiment helper for persona-based copy variants.
 * Provides stable variant assignment across sessions using hash-based allocation.
 * 
 * DESIGN PRINCIPLES:
 * - Deterministic: same cluster + experimentKey always yields same variant
 * - No external dependencies (no PostHog/Supabase API calls in core logic)
 * - No flicker or reassignment - variants are stable
 * - Supports up to 3 variants (A/B/C)
 * - Analytics-ready event structure for future integration
 * 
 * USAGE:
 * ```ts
 * import { assignVariant, shouldShowVariant, trackPersonaExperiment } from '@/experiments/personaExperiments';
 * 
 * const variant = assignVariant(userCluster, "coach_hero_v1");
 * if (shouldShowVariant(userCluster, "coach_hero_v1", "A")) {
 *   // Show variant A copy
 * }
 * trackPersonaExperiment("coach_hero_v1", variant, userCluster);
 * ```
 */

import type { PersonaCluster, CoreNeed } from "@/components/sleep-quiz/QuizTypes";
import { CORE_NEED_MAP } from "@/components/sleep-quiz/QuizTypes";
import { getSessionId } from "@/lib/abTesting";

// ============ TYPES ============

export type ExperimentVariant = "A" | "B" | "C";

export interface PersonaExperimentEvent {
  type: "persona_experiment_view";
  experimentKey: string;
  variant: ExperimentVariant;
  persona_cluster: PersonaCluster;
  core_need: CoreNeed;
  timestamp: string;
}

/**
 * Experiment configuration registry
 * Add new experiments here with their variant distribution
 */
export interface ExperimentConfig {
  key: string;
  variants: ExperimentVariant[];
  description: string;
  active: boolean;
}

export const EXPERIMENT_REGISTRY: Record<string, ExperimentConfig> = {
  coach_hero_v1: {
    key: "coach_hero_v1",
    variants: ["A", "B"],
    description: "Sleep Coach Dashboard hero copy variants",
    active: true,
  },
  quiz_results_hero_v1: {
    key: "quiz_results_hero_v1",
    variants: ["A", "B"],
    description: "Quiz Results hero copy variants",
    active: true,
  },
  // v9: Persona Landing Page experiments
  lp_hero_v1: {
    key: "lp_hero_v1",
    variants: ["A", "B"],
    description: "Persona Landing Page hero copy variants",
    active: true,
  },
  lp_setup_v1: {
    key: "lp_setup_v1",
    variants: ["A", "B"],
    description: "Persona Landing Page setup section variants",
    active: true,
  },
  // v10: Persona LP hero A/B test
  persona_lp_hero_v1: {
    key: "persona_lp_hero_v1",
    variants: ["A", "B"],
    description: "Persona Landing Page hero A/B test for conversion optimization",
    active: true,
  },
};

// ============ INTERNAL EVENT BUS ============

/**
 * Simple internal event bus for tracking experiment views
 * Listeners can subscribe to receive experiment events
 */
type ExperimentEventListener = (event: PersonaExperimentEvent) => void;
const eventListeners: ExperimentEventListener[] = [];

export function subscribeToExperimentEvents(listener: ExperimentEventListener): () => void {
  eventListeners.push(listener);
  return () => {
    const index = eventListeners.indexOf(listener);
    if (index > -1) eventListeners.splice(index, 1);
  };
}

function emitExperimentEvent(event: PersonaExperimentEvent): void {
  eventListeners.forEach(listener => {
    try {
      listener(event);
    } catch (e) {
      console.error("[PersonaExperiments] Event listener error:", e);
    }
  });
}

// ============ DETERMINISTIC HASH ============

/**
 * Simple deterministic hash function
 * Produces consistent numeric output for string input
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ============ CORE FUNCTIONS ============

/**
 * Check if a user matches one or more target personas
 * 
 * @param userCluster - The user's persona cluster
 * @param targetClusters - Array of clusters to match against
 * @returns true if userCluster is in targetClusters
 */
export function isPersona(
  userCluster: PersonaCluster | null | undefined,
  targetClusters: PersonaCluster[]
): boolean {
  if (!userCluster) return false;
  return targetClusters.includes(userCluster);
}

/**
 * Get the core need for a persona cluster
 * 
 * @param cluster - The persona cluster
 * @returns The core need (alignment, environment, optimization, recovery)
 */
export function getPersonaCoreNeed(cluster: PersonaCluster | null | undefined): CoreNeed | null {
  if (!cluster) return null;
  return CORE_NEED_MAP[cluster] || null;
}

/**
 * Deterministically assign a variant based on persona cluster and experiment key
 * 
 * Uses hash-based allocation to ensure:
 * - Same cluster + experimentKey always returns same variant
 * - No flicker or reassignment between sessions
 * - Even distribution across variants
 * 
 * @param cluster - The user's persona cluster
 * @param experimentKey - Unique identifier for the experiment
 * @returns The assigned variant (A, B, or C)
 */
export function assignVariant(
  cluster: PersonaCluster | null | undefined,
  experimentKey: string
): ExperimentVariant {
  // Default to "A" for null/undefined cluster
  if (!cluster) return "A";
  
  const experiment = EXPERIMENT_REGISTRY[experimentKey];
  const variants = experiment?.variants || ["A", "B"];
  
  // Create deterministic hash from cluster + experimentKey
  const hashInput = `${cluster}:${experimentKey}`;
  const hash = simpleHash(hashInput);
  
  // Map hash to variant index
  const variantIndex = hash % variants.length;
  return variants[variantIndex];
}

/**
 * Check if a specific variant should be shown for this persona + experiment
 * 
 * @param cluster - The user's persona cluster
 * @param experimentKey - Unique identifier for the experiment
 * @param targetVariant - The variant to check for
 * @returns true if the assigned variant matches targetVariant
 */
export function shouldShowVariant(
  cluster: PersonaCluster | null | undefined,
  experimentKey: string,
  targetVariant: ExperimentVariant
): boolean {
  const assigned = assignVariant(cluster, experimentKey);
  return assigned === targetVariant;
}

/**
 * Get all assigned variants for a persona cluster
 * Useful for bulk Klaviyo payload generation
 * 
 * @param cluster - The user's persona cluster
 * @returns Object mapping experiment keys to assigned variants
 */
export function getAllAssignedVariants(
  cluster: PersonaCluster | null | undefined
): Record<string, ExperimentVariant> {
  const result: Record<string, ExperimentVariant> = {};
  
  for (const key of Object.keys(EXPERIMENT_REGISTRY)) {
    const config = EXPERIMENT_REGISTRY[key];
    if (config.active) {
      result[key] = assignVariant(cluster, key);
    }
  }
  
  return result;
}

/**
 * Track an experiment view
 * Emits event to internal bus and prepares payload for future analytics integration
 * 
 * @param experimentKey - Unique identifier for the experiment
 * @param variant - The variant being shown
 * @param cluster - The user's persona cluster
 */
export function trackPersonaExperiment(
  experimentKey: string,
  variant: ExperimentVariant,
  cluster: PersonaCluster | null | undefined
): void {
  if (!cluster) {
    console.warn("[PersonaExperiments] Cannot track experiment without cluster");
    return;
  }
  
  const coreNeed = getPersonaCoreNeed(cluster);
  if (!coreNeed) {
    console.warn("[PersonaExperiments] Cannot determine core_need for cluster:", cluster);
    return;
  }
  
  const event: PersonaExperimentEvent = {
    type: "persona_experiment_view",
    experimentKey,
    variant,
    persona_cluster: cluster,
    core_need: coreNeed,
    timestamp: new Date().toISOString(),
  };
  
  // Emit to internal event bus
  emitExperimentEvent(event);
  
  // Log for debugging (dev only)
  if (import.meta.env.DEV) {
    console.log("[PersonaExperiments] Tracked:", event);
  }
  
  // Future: PostHog/Supabase integration point
  // The event structure is ready for sending to analytics platforms:
  // - posthog?.capture('persona_experiment_view', event)
  // - supabase.from('experiment_events').insert(event)
}

// ============ COPY VARIANT DEFINITIONS ============

/**
 * Hero copy variants for Sleep Coach Dashboard
 * 
 * NOTE: Only use persona_label and core_need for personalization.
 * NEVER use internal human names (Jason, Mila, Leo, Riley) in customer-facing copy.
 */
export const COACH_HERO_COPY_VARIANTS: Record<ExperimentVariant, {
  headline: string;
  subheadline: string;
  personaSpecific: Record<PersonaCluster, { microcopy: string }>;
}> = {
  A: {
    // Control/baseline - neutral, works for all personas
    headline: "Your Personalized Sleep Coach",
    subheadline: "Science-backed recommendations tailored to your unique sleep patterns",
    personaSpecific: {
      pain_sleeper: { microcopy: "Focused on alignment and comfort for better mornings." },
      stress_insomnia: { microcopy: "Calming routines to support deeper, uninterrupted rest." },
      optimizer: { microcopy: "Data-driven insights to maximize your sleep performance." },
      recovery_sleeper: { microcopy: "Optimized recovery protocols for peak physical readiness." },
    },
  },
  B: {
    // Benefit-led variant
    headline: "Wake Up Feeling Better",
    subheadline: "Your personalized path to restorative sleep starts here",
    personaSpecific: {
      pain_sleeper: { microcopy: "Reduce morning stiffness with targeted alignment support." },
      stress_insomnia: { microcopy: "Create the calm environment your body needs for rest." },
      optimizer: { microcopy: "Unlock your full energy potential with optimized sleep cycles." },
      recovery_sleeper: { microcopy: "Accelerate physical restoration for next-day performance." },
    },
  },
  C: {
    // Action-oriented variant
    headline: "Start Your Sleep Transformation",
    subheadline: "Personalized guidance backed by sleep science",
    personaSpecific: {
      pain_sleeper: { microcopy: "Begin with alignment fundamentals for lasting comfort." },
      stress_insomnia: { microcopy: "Build calming rituals that prepare your mind for sleep." },
      optimizer: { microcopy: "Track, measure, and optimize every night's rest." },
      recovery_sleeper: { microcopy: "Train your sleep for maximum athletic recovery." },
    },
  },
};

/**
 * Hero copy variants for Quiz Results page
 * 
 * NOTE: Only use persona_label for display.
 * NEVER use internal human names in customer-facing copy.
 */
export const QUIZ_RESULTS_HERO_COPY_VARIANTS: Record<ExperimentVariant, {
  headline: string;
  subheadline: string;
  personaSpecific: Record<PersonaCluster, { intro: string }>;
}> = {
  A: {
    // Control - assessment-focused
    headline: "Your Sleep Assessment",
    subheadline: "Personalized analysis based on your responses",
    personaSpecific: {
      pain_sleeper: { intro: "Your results indicate alignment and support are key focus areas." },
      stress_insomnia: { intro: "Your results suggest environmental factors influence your rest quality." },
      optimizer: { intro: "Your results show you're ready to fine-tune your sleep performance." },
      recovery_sleeper: { intro: "Your results highlight recovery-focused optimization opportunities." },
    },
  },
  B: {
    // Discovery-focused variant
    headline: "Your Sleep Profile",
    subheadline: "We've analyzed your unique sleep patterns",
    personaSpecific: {
      pain_sleeper: { intro: "We've identified comfort and alignment as your primary areas for improvement." },
      stress_insomnia: { intro: "We've found that your sleep environment plays a significant role in your rest." },
      optimizer: { intro: "We've discovered opportunities to enhance your already solid sleep foundation." },
      recovery_sleeper: { intro: "We've mapped your path to optimized physical restoration and recovery." },
    },
  },
  C: {
    // Future variant placeholder
    headline: "Your Sleep Assessment",
    subheadline: "Personalized analysis based on your responses",
    personaSpecific: {
      pain_sleeper: { intro: "Your results indicate alignment and support are key focus areas." },
      stress_insomnia: { intro: "Your results suggest environmental factors influence your rest quality." },
      optimizer: { intro: "Your results show you're ready to fine-tune your sleep performance." },
      recovery_sleeper: { intro: "Your results highlight recovery-focused optimization opportunities." },
    },
  },
};

/**
 * Helper to get personalized copy for Coach Hero
 */
export function getCoachHeroCopy(
  cluster: PersonaCluster | null | undefined,
  experimentKey: string = "coach_hero_v1"
): { headline: string; subheadline: string; microcopy: string } {
  const variant = assignVariant(cluster, experimentKey);
  const variantCopy = COACH_HERO_COPY_VARIANTS[variant];
  
  const microcopy = cluster 
    ? variantCopy.personaSpecific[cluster]?.microcopy || ""
    : "";
  
  return {
    headline: variantCopy.headline,
    subheadline: variantCopy.subheadline,
    microcopy,
  };
}

/**
 * Helper to get personalized copy for Quiz Results Hero
 */
export function getQuizResultsHeroCopy(
  cluster: PersonaCluster | null | undefined,
  experimentKey: string = "quiz_results_hero_v1"
): { headline: string; subheadline: string; intro: string } {
  const variant = assignVariant(cluster, experimentKey);
  const variantCopy = QUIZ_RESULTS_HERO_COPY_VARIANTS[variant];
  
  const intro = cluster 
    ? variantCopy.personaSpecific[cluster]?.intro || ""
    : "";
  
  return {
    headline: variantCopy.headline,
    subheadline: variantCopy.subheadline,
    intro,
  };
}

// ============ v9: LANDING PAGE COPY VARIANTS ============

/**
 * Hero copy variants for Persona Landing Pages
 * 
 * NOTE: Only use persona_label for display.
 * NEVER use internal human names in customer-facing copy.
 */
export const LP_HERO_COPY_VARIANTS: Record<ExperimentVariant, {
  headlineTemplate: string; // Use {label} as placeholder
  subheadline: string;
  personaSpecific: Record<PersonaCluster, { tagline: string }>;
}> = {
  A: {
    // Control - label-focused
    headlineTemplate: "Your {label} Plan",
    subheadline: "Personalized strategies backed by sleep science",
    personaSpecific: {
      pain_sleeper: { tagline: "Alignment strategies for better mornings" },
      stress_insomnia: { tagline: "Environment optimization for deeper rest" },
      optimizer: { tagline: "Data-driven improvements for peak performance" },
      recovery_sleeper: { tagline: "Recovery protocols for physical restoration" },
    },
  },
  B: {
    // Benefit-led variant
    headlineTemplate: "Your Path to Better Sleep",
    subheadline: "Built for your unique sleep profile",
    personaSpecific: {
      pain_sleeper: { tagline: "Reduce morning stiffness and tension" },
      stress_insomnia: { tagline: "Create calm conditions for uninterrupted rest" },
      optimizer: { tagline: "Unlock measurable improvements in sleep quality" },
      recovery_sleeper: { tagline: "Accelerate physical restoration and readiness" },
    },
  },
  C: {
    // Future placeholder
    headlineTemplate: "Your {label} Plan",
    subheadline: "Personalized strategies backed by sleep science",
    personaSpecific: {
      pain_sleeper: { tagline: "Alignment strategies for better mornings" },
      stress_insomnia: { tagline: "Environment optimization for deeper rest" },
      optimizer: { tagline: "Data-driven improvements for peak performance" },
      recovery_sleeper: { tagline: "Recovery protocols for physical restoration" },
    },
  },
};

/**
 * Setup section copy variants for Persona Landing Pages
 */
export const LP_SETUP_COPY_VARIANTS: Record<ExperimentVariant, {
  sectionTitle: string;
  personaSpecific: Record<PersonaCluster, { emphasis: string }>;
}> = {
  A: {
    sectionTitle: "Recommended Setup",
    personaSpecific: {
      pain_sleeper: { emphasis: "Complete alignment support" },
      stress_insomnia: { emphasis: "Optimal environment control" },
      optimizer: { emphasis: "Performance-focused setup" },
      recovery_sleeper: { emphasis: "Recovery-optimized configuration" },
    },
  },
  B: {
    sectionTitle: "Your Personalized Setup",
    personaSpecific: {
      pain_sleeper: { emphasis: "Targeted comfort for pain relief" },
      stress_insomnia: { emphasis: "Calming environment essentials" },
      optimizer: { emphasis: "Tools for measurable improvement" },
      recovery_sleeper: { emphasis: "Gear for maximum restoration" },
    },
  },
  C: {
    sectionTitle: "Recommended Setup",
    personaSpecific: {
      pain_sleeper: { emphasis: "Complete alignment support" },
      stress_insomnia: { emphasis: "Optimal environment control" },
      optimizer: { emphasis: "Performance-focused setup" },
      recovery_sleeper: { emphasis: "Recovery-optimized configuration" },
    },
  },
};

/**
 * Helper to get personalized copy for Landing Page Hero
 */
export function getLpHeroCopy(
  cluster: PersonaCluster | null | undefined,
  personaLabel: string,
  experimentKey: string = "lp_hero_v1"
): { headline: string; subheadline: string; tagline: string } {
  const variant = assignVariant(cluster, experimentKey);
  const variantCopy = LP_HERO_COPY_VARIANTS[variant];
  
  const headline = variantCopy.headlineTemplate.replace("{label}", personaLabel);
  const tagline = cluster 
    ? variantCopy.personaSpecific[cluster]?.tagline || ""
    : "";
  
  return {
    headline,
    subheadline: variantCopy.subheadline,
    tagline,
  };
}

/**
 * Helper to get personalized copy for Landing Page Setup section
 */
export function getLpSetupCopy(
  cluster: PersonaCluster | null | undefined,
  experimentKey: string = "lp_setup_v1"
): { sectionTitle: string; emphasis: string } {
  const variant = assignVariant(cluster, experimentKey);
  const variantCopy = LP_SETUP_COPY_VARIANTS[variant];
  
  const emphasis = cluster 
    ? variantCopy.personaSpecific[cluster]?.emphasis || ""
    : "";
  
  return {
    sectionTitle: variantCopy.sectionTitle,
    emphasis,
  };
}

// ============ v9: SERVER-SIDE ANALYTICS LOGGING ============

/**
 * Log persona experiment exposure to server
 * 
 * Sends event to persona-analytics edge function for server-side logging.
 * No PIIs are logged - only anonymized persona + experiment data.
 */
export async function logPersonaExperimentExposure(
  experimentKey: string,
  variant: ExperimentVariant,
  cluster: PersonaCluster,
  personaConfidence?: number
): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const coreNeed = getPersonaCoreNeed(cluster);
    
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/persona-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({
        events: [{
          event_type: "persona_experiment_exposure",
          experiment_key: experimentKey,
          variant,
          persona_cluster: cluster,
          core_need: coreNeed || "unknown",
          persona_confidence: personaConfidence,
        }],
        session_id: sessionId,
      }),
    });
  } catch (e) {
    // Silent fail - analytics should never break UX
    if (import.meta.env.DEV) {
      console.warn("[PersonaExperiments] Failed to log experiment exposure:", e);
    }
  }
}

/**
 * Log persona landing page exposure to server
 */
export async function logPersonaLpExposure(
  cluster: PersonaCluster,
  isCachedAssessment: boolean,
  personaConfidence?: number
): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const coreNeed = getPersonaCoreNeed(cluster);
    
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/persona-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({
        events: [{
          event_type: "persona_lp_exposure",
          persona_cluster: cluster,
          core_need: coreNeed || "unknown",
          is_cached_assessment: isCachedAssessment,
          referrer: typeof document !== "undefined" ? document.referrer?.substring(0, 500) : undefined,
          persona_confidence: personaConfidence,
        }],
        session_id: sessionId,
      }),
    });
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[PersonaExperiments] Failed to log LP exposure:", e);
    }
  }
}

/**
 * Log coach module interaction to server
 */
export async function logModuleInteraction(
  moduleId: number,
  interactionType: "view" | "start" | "complete" | "skip",
  cluster: PersonaCluster,
  relevanceScore?: number
): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/persona-analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({
        events: [{
          event_type: "coach_module_interaction",
          module_id: moduleId,
          interaction_type: interactionType,
          persona_cluster: cluster,
          relevance_score: relevanceScore,
        }],
        session_id: sessionId,
      }),
    });
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[PersonaExperiments] Failed to log module interaction:", e);
    }
  }
}

// Session ID helper - uses unified session ID for cross-funnel tracking
// Import is at top of file for proper module resolution

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  return getSessionId();
}

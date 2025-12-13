/**
 * Mock/Fallback data for Persona Landing Pages
 * 
 * Used when no cached assessment is available.
 * Provides static examples per persona for demonstration purposes.
 * 
 * NOTE: Human persona names (Jason, Mila, Leo, Riley) are INTERNAL ONLY.
 * These mocks use customer-facing labels only.
 */

import { 
  type PersonaCluster,
  type SleepAssessment,
  PERSONA_DEFINITIONS,
  CORE_NEED_MAP,
} from "@/components/sleep-quiz";

// ============ FALLBACK ASSESSMENTS BY PERSONA ============

export const PERSONA_FALLBACK_ASSESSMENTS: Record<PersonaCluster, SleepAssessment> = {
  pain_sleeper: {
    sleepIdentity: {
      position: "side",
      label: "Side Sleeper",
      description: "You naturally favor side sleeping—a position that benefits spinal alignment when properly supported.",
    },
    scores: {
      alignment_risk_score: 65,
      neck_support_score: 45,
      sleep_stability_score: 55,
      environment_score: 70,
      light_sensitivity_score: 30,
      temperature_disruption_score: 25,
    },
    persona: {
      guess: "jason",
      rationale: "Your responses indicate that neck tension and alignment challenges are your primary areas for improvement. Addressing cervical support can meaningfully reduce morning discomfort.",
      cluster: "pain_sleeper",
      label: PERSONA_DEFINITIONS.pain_sleeper.label,
      description: PERSONA_DEFINITIONS.pain_sleeper.description,
      recommended_modules: PERSONA_DEFINITIONS.pain_sleeper.recommended_modules,
      legacyType: "jason",
    },
    environmentFindings: {
      keyIssues: ["Current pillow may not provide adequate cervical support"],
      summary: "Your sleep environment is generally supportive, but alignment improvements could enhance comfort.",
    },
    productRecommendations: {
      primary_product: "ergonomic_pillow",
      secondary_product: "knee_pillow",
      recommended_bundle: "alignment_set",
      reasoning: "A cervical-contoured pillow combined with hip alignment support addresses common pain points.",
      recommendation_confidence: 85,
      fit_explanation: "This setup supports neutral spine alignment throughout the night.",
      persona_reasoning: "As a Pain Sleeper, your physical comfort and alignment are the primary focus. This setup directly addresses tension points and supports healthier spinal positioning.",
    },
    coachPreview: {
      day_1_3: "We'll establish your baseline and introduce proper pillow positioning techniques for cervical support.",
      day_4_7: "Focus on sleep posture awareness and gentle morning mobility routines to reduce stiffness.",
      day_7_14: "Consolidate alignment habits and track improvements in morning comfort levels.",
    },
    alignment_priority: true,
    environment_priority: false,
    top_risk_drivers: ["neck_tension", "pillow_support", "sleep_posture"],
  },

  stress_insomnia: {
    sleepIdentity: {
      position: "mixed",
      label: "Variable Position Sleeper",
      description: "You shift between positions during the night, often influenced by environmental factors and mental state.",
    },
    scores: {
      alignment_risk_score: 35,
      neck_support_score: 65,
      sleep_stability_score: 50,
      environment_score: 45,
      light_sensitivity_score: 70,
      temperature_disruption_score: 55,
    },
    persona: {
      guess: "mila",
      rationale: "Your sleep patterns suggest that light exposure and temperature regulation are influencing your rest quality. Optimizing your sleep environment can strengthen natural sleep cycles.",
      cluster: "stress_insomnia",
      label: PERSONA_DEFINITIONS.stress_insomnia.label,
      description: PERSONA_DEFINITIONS.stress_insomnia.description,
      recommended_modules: PERSONA_DEFINITIONS.stress_insomnia.recommended_modules,
      legacyType: "mila",
    },
    environmentFindings: {
      keyIssues: [
        "Light exposure may be disrupting melatonin production",
        "Temperature fluctuations affecting sleep continuity",
      ],
      summary: "Environmental optimization can significantly improve your sleep onset and continuity.",
    },
    productRecommendations: {
      primary_product: "ergonomic_pillow",
      secondary_product: "silk_mask",
      recommended_bundle: "deep_sleep_set",
      reasoning: "Complete darkness combined with comfortable support creates optimal conditions for uninterrupted rest.",
      recommendation_confidence: 88,
      fit_explanation: "This setup addresses the environmental factors most affecting your sleep quality.",
      persona_reasoning: "As a Stress & Environment Sleeper, controlling environmental factors is key to your sleep quality. This recommendation creates optimal conditions for uninterrupted rest.",
    },
    coachPreview: {
      day_1_3: "We'll audit your sleep environment and introduce evening wind-down protocols.",
      day_4_7: "Implement light management strategies and temperature optimization techniques.",
      day_7_14: "Build sustainable evening routines that support natural melatonin production.",
    },
    alignment_priority: false,
    environment_priority: true,
    top_risk_drivers: ["light_exposure", "temperature", "sleep_onset"],
  },

  optimizer: {
    sleepIdentity: {
      position: "back",
      label: "Back Sleeper",
      description: "You favor back sleeping—a position that can maximize recovery when properly supported.",
    },
    scores: {
      alignment_risk_score: 25,
      neck_support_score: 75,
      sleep_stability_score: 80,
      environment_score: 75,
      light_sensitivity_score: 25,
      temperature_disruption_score: 20,
    },
    persona: {
      guess: "leo",
      rationale: "You're focused on enhancing morning energy and deeper sleep. With a solid sleep foundation, targeted improvements can maximize your body's natural recovery processes.",
      cluster: "optimizer",
      label: PERSONA_DEFINITIONS.optimizer.label,
      description: PERSONA_DEFINITIONS.optimizer.description,
      recommended_modules: PERSONA_DEFINITIONS.optimizer.recommended_modules,
      legacyType: "leo",
    },
    environmentFindings: {
      keyIssues: [],
      summary: "Your sleep environment is well-optimized. Focus areas include maximizing deep sleep phases.",
    },
    productRecommendations: {
      primary_product: "ergonomic_pillow",
      secondary_product: "knee_pillow",
      recommended_bundle: "performance_set",
      reasoning: "Full-body alignment support maximizes recovery potential and morning readiness.",
      recommendation_confidence: 82,
      fit_explanation: "This setup provides the foundation for measurable improvements in sleep quality.",
      persona_reasoning: "As a Sleep Optimizer, you're looking to maximize recovery and performance. This setup provides the foundation for measurable improvements in your sleep quality.",
    },
    coachPreview: {
      day_1_3: "We'll establish baseline metrics and introduce deep sleep enhancement techniques.",
      day_4_7: "Focus on consistency and timing optimization to maximize recovery windows.",
      day_7_14: "Fine-tune your routine and track performance improvements.",
    },
    alignment_priority: false,
    environment_priority: false,
    top_risk_drivers: ["sleep_efficiency", "recovery_optimization", "consistency"],
  },

  recovery_sleeper: {
    sleepIdentity: {
      position: "side",
      label: "Active Recovery Sleeper",
      description: "Your sleep patterns reflect an active lifestyle focused on physical restoration and training recovery.",
    },
    scores: {
      alignment_risk_score: 30,
      neck_support_score: 70,
      sleep_stability_score: 75,
      environment_score: 70,
      light_sensitivity_score: 30,
      temperature_disruption_score: 35,
    },
    persona: {
      guess: "leo",
      rationale: "Your focus on physical recovery and performance indicates a recovery-oriented approach to sleep. Optimizing deep sleep phases and temperature regulation can enhance your body's natural restoration processes.",
      cluster: "recovery_sleeper",
      label: PERSONA_DEFINITIONS.recovery_sleeper.label,
      description: PERSONA_DEFINITIONS.recovery_sleeper.description,
      recommended_modules: PERSONA_DEFINITIONS.recovery_sleeper.recommended_modules,
      legacyType: "leo",
    },
    environmentFindings: {
      keyIssues: ["Temperature regulation may affect recovery quality"],
      summary: "Your environment supports recovery, with room for optimization in temperature management.",
    },
    productRecommendations: {
      primary_product: "ergonomic_pillow",
      secondary_product: "knee_pillow",
      recommended_bundle: "performance_set",
      reasoning: "Alignment support combined with temperature-friendly materials optimizes physical recovery.",
      recommendation_confidence: 85,
      fit_explanation: "This setup supports consistent recovery and morning readiness for active lifestyles.",
      persona_reasoning: "As a Recovery Sleeper, optimizing deep sleep and temperature regulation are essential for physical restoration. This setup supports consistent recovery and morning readiness.",
    },
    coachPreview: {
      day_1_3: "We'll establish your recovery baseline and introduce temperature regulation strategies.",
      day_4_7: "Focus on deep sleep optimization and post-training sleep protocols.",
      day_7_14: "Build sustainable recovery habits and track morning readiness improvements.",
    },
    alignment_priority: false,
    environment_priority: false,
    top_risk_drivers: ["recovery_optimization", "temperature_regulation", "deep_sleep"],
  },
};

// ============ HERO COPY BY PERSONA ============

export interface PersonaHeroCopy {
  headline: string;
  subtext: string;
}

export const PERSONA_HERO_COPY: Record<PersonaCluster, PersonaHeroCopy> = {
  pain_sleeper: {
    headline: "Your Pain Sleeper Plan",
    subtext: "Targeted alignment strategies to help reduce morning tension and support restful, restorative sleep.",
  },
  stress_insomnia: {
    headline: "Your Stress & Environment Plan",
    subtext: "Environment optimization and calming routines to strengthen your natural sleep cycles.",
  },
  optimizer: {
    headline: "Your Sleep Optimizer Plan",
    subtext: "Measurable improvements to maximize recovery, energy, and long-term sleep performance.",
  },
  recovery_sleeper: {
    headline: "Your Recovery Sleeper Plan",
    subtext: "Deep sleep optimization and temperature strategies to enhance physical restoration.",
  },
};

// ============ URL SLUG MAPPING ============

export const URL_SLUG_TO_CLUSTER: Record<string, PersonaCluster> = {
  "pain-sleeper": "pain_sleeper",
  "stress-sleeper": "stress_insomnia",
  "optimizer": "optimizer",
  "recovery-sleeper": "recovery_sleeper",
};

export const CLUSTER_TO_URL_SLUG: Record<PersonaCluster, string> = {
  pain_sleeper: "pain-sleeper",
  stress_insomnia: "stress-sleeper",
  optimizer: "optimizer",
  recovery_sleeper: "recovery-sleeper",
};

// ============ CORE NEED SENTENCES ============

export const CORE_NEED_SENTENCES: Record<PersonaCluster, string> = {
  pain_sleeper: "Your core need is alignment—supporting your spine and reducing physical tension throughout the night.",
  stress_insomnia: "Your core need is environment—creating optimal conditions for uninterrupted, restorative sleep.",
  optimizer: "Your core need is optimization—building consistent habits that maximize recovery and performance.",
  recovery_sleeper: "Your core need is recovery—enhancing deep sleep phases to support physical restoration.",
};

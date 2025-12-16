/**
 * PersonaBlockMinimal - Refined persona card with Scandinavian aesthetics
 * 
 * Warm neutrals, premium scientific feel, subtle dusty blue accents
 */

import { type PersonaCluster, PERSONA_DEFINITIONS } from "@/components/sleep-quiz/QuizTypes";

interface PersonaBlockMinimalProps {
  cluster?: PersonaCluster;
  label?: string;
  description?: string;
  rationale?: string;
  topRiskDrivers?: string[];
}

// Risk driver labels for "what's affecting your sleep"
const RISK_DRIVER_DISPLAY: Record<string, string> = {
  neck_tension: "Neck tension",
  shoulder_pain: "Shoulder discomfort", 
  back_pain: "Back alignment",
  hip_pain: "Hip positioning",
  inadequate_pillow_support: "Pillow support needs",
  poor_sleep_environment: "Environmental factors",
  temperature_disruption: "Temperature sensitivity",
  light_sensitivity: "Light sensitivity",
  stress_activation: "Stress activation",
  sleep_inconsistency: "Timing inconsistency",
  frequent_waking: "Sleep fragmentation",
  poor_recovery: "Recovery challenges",
};

// Monoline SVG icons for each persona - stroke #8E98A3, opacity 0.8, strokeWidth 1.25
const PersonaIcons: Record<PersonaCluster, React.ReactNode> = {
  pain_sleeper: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 24C19.5228 24 24 19.5228 24 14C24 8.47715 19.5228 4 14 4C8.47715 4 4 8.47715 4 14C4 19.5228 8.47715 24 14 24Z" stroke="#8E98A3" strokeWidth="1.25" fill="none" opacity="0.8"/>
      <path d="M10 14C10 14 11.5 11 14 11C16.5 11 18 14 18 14" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <path d="M9 18C9 18 11 20 14 20C17 20 19 18 19 18" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
    </svg>
  ),
  stress_insomnia: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10C20 10 18 4 12 4C6 4 4 10 4 14C4 18 6 24 14 24C22 24 24 18 24 14" stroke="#8E98A3" strokeWidth="1.25" fill="none" strokeLinecap="round" opacity="0.8"/>
      <path d="M20 10L24 6" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <circle cx="10" cy="14" r="1" fill="#8E98A3" opacity="0.7"/>
      <circle cx="18" cy="14" r="1" fill="#8E98A3" opacity="0.7"/>
    </svg>
  ),
  optimizer: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 4V8" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <path d="M14 20V24" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <path d="M4 14H8" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <path d="M20 14H24" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <circle cx="14" cy="14" r="6" stroke="#8E98A3" strokeWidth="1.25" fill="none" opacity="0.8"/>
      <circle cx="14" cy="14" r="2" fill="#8E98A3" opacity="0.7"/>
    </svg>
  ),
  recovery_sleeper: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 14L10 10L14 14L18 8L22 12" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <path d="M6 20H22" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <circle cx="22" cy="12" r="2" fill="#8E98A3" opacity="0.7"/>
    </svg>
  ),
};

export function PersonaBlockMinimal({
  cluster,
  label,
  description,
  rationale,
  topRiskDrivers = [],
}: PersonaBlockMinimalProps) {
  const definition = cluster ? PERSONA_DEFINITIONS[cluster] : null;
  const displayLabel = label || definition?.label || "Your Sleep Persona";
  const displayDescription = description || definition?.description || "";
  const Icon = cluster ? PersonaIcons[cluster] : PersonaIcons.pain_sleeper;

  if (!cluster && !label) return null;

  // Format key insights from risk drivers
  const keyInsights = topRiskDrivers
    .slice(0, 3)
    .map(d => RISK_DRIVER_DISPLAY[d] || d.replace(/_/g, ' '));

  return (
    <section 
      className="rounded-2xl p-7 md:p-8"
      style={{ 
        backgroundColor: '#FAFAF8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header with icon */}
      <div className="flex items-start gap-4 mb-6">
        <div 
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#F4F3F1' }}
        >
          {Icon}
        </div>
        <div className="flex-1 min-w-0">
          <p 
            className="text-xs font-medium tracking-wider uppercase mb-1.5"
            style={{ color: '#A7B4C2', letterSpacing: '0.08em' }}
          >
            Your Sleep Persona
          </p>
          <h3 
            className="text-xl font-medium"
            style={{ color: '#2D2B29' }}
          >
            {displayLabel}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p 
        className="text-base leading-relaxed mb-7"
        style={{ color: '#6F6A66', lineHeight: 1.6 }}
      >
        {displayDescription}
      </p>

      {/* Why this matches you */}
      {rationale && (
        <div 
          className="rounded-xl p-5 mb-6"
          style={{ backgroundColor: '#F4F3F1' }}
        >
          <p 
            className="text-xs font-medium uppercase tracking-wider mb-2.5"
            style={{ color: '#A7B4C2', letterSpacing: '0.08em' }}
          >
            Why this matches you
          </p>
          <p 
            className="text-sm leading-relaxed"
            style={{ color: '#2D2B29', lineHeight: 1.55 }}
          >
            {rationale}
          </p>
        </div>
      )}

      {/* Key insight block */}
      {keyInsights.length > 0 && (
        <div 
          className="rounded-xl p-5"
          style={{ backgroundColor: '#F4F3F1' }}
        >
          <p 
            className="text-xs font-medium uppercase tracking-wider mb-3.5"
            style={{ color: '#A7B4C2', letterSpacing: '0.08em' }}
          >
            What's most affecting your sleep
          </p>
          <div className="flex flex-wrap gap-2.5">
            {keyInsights.map((insight, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3.5 py-2 rounded-full text-sm"
                style={{ 
                  backgroundColor: '#FAFAF8',
                  color: '#4A4844',
                }}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full mr-2.5"
                  style={{ backgroundColor: 'rgba(60, 131, 246, 0.85)' }}
                />
                {insight}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

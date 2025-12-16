/**
 * PersonaBlockMinimal - Refined persona card with Scandinavian aesthetics
 * 
 * Warm neutrals, premium scientific feel, subtle dusty blue accents
 * Stronger typography hierarchy, left-border insights
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
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 28C22.627 28 28 22.627 28 16C28 9.373 22.627 4 16 4C9.373 4 4 9.373 4 16C4 22.627 9.373 28 16 28Z" stroke="#8E98A3" strokeWidth="1.25" fill="none" opacity="0.8"/>
      <path d="M11 16C11 16 13 12 16 12C19 12 21 16 21 16" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <path d="M10 21C10 21 12.5 23.5 16 23.5C19.5 23.5 22 21 22 21" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
    </svg>
  ),
  stress_insomnia: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 11C23 11 21 4 14 4C7 4 4 11 4 16C4 21 7 28 16 28C25 28 28 21 28 16" stroke="#8E98A3" strokeWidth="1.25" fill="none" strokeLinecap="round" opacity="0.8"/>
      <path d="M23 11L28 6" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <circle cx="11" cy="16" r="1.5" fill="#8E98A3" opacity="0.7"/>
      <circle cx="21" cy="16" r="1.5" fill="#8E98A3" opacity="0.7"/>
    </svg>
  ),
  optimizer: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4V9" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <path d="M16 23V28" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <path d="M4 16H9" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <path d="M23 16H28" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <circle cx="16" cy="16" r="7" stroke="#8E98A3" strokeWidth="1.25" fill="none" opacity="0.8"/>
      <circle cx="16" cy="16" r="2.5" fill="#8E98A3" opacity="0.7"/>
    </svg>
  ),
  recovery_sleeper: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 16L11 11L16 16L21 9L26 13" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <path d="M6 24H26" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      <circle cx="26" cy="13" r="2.5" fill="#8E98A3" opacity="0.7"/>
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
      className="rounded-3xl p-8 md:p-10"
      style={{ 
        backgroundColor: '#FAFAF8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header with icon */}
      <div className="flex items-start gap-5 mb-7">
        <div 
          className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: '#F4F3F1' }}
        >
          {Icon}
        </div>
        <div className="flex-1 min-w-0">
          <p 
            className="text-[11px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
          >
            Your Sleep Persona
          </p>
          <h3 
            className="text-2xl font-semibold tracking-tight"
            style={{ color: '#2D2B29' }}
          >
            {displayLabel}
          </h3>
        </div>
      </div>

      {/* Description - warm secondary */}
      <p 
        className="text-base leading-relaxed mb-8"
        style={{ color: '#6F6A66', lineHeight: 1.65 }}
      >
        {displayDescription}
      </p>

      {/* Why this matches you - with left border accent */}
      {rationale && (
        <div 
          className="rounded-2xl p-6 mb-7"
          style={{ 
            backgroundColor: '#F4F3F1',
            borderLeft: '3px solid rgba(167, 180, 194, 0.35)',
          }}
        >
          <p 
            className="text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
          >
            Why this matches you
          </p>
          <p 
            className="text-sm leading-relaxed"
            style={{ color: '#2D2B29', lineHeight: 1.6 }}
          >
            {rationale}
          </p>
        </div>
      )}

      {/* Key insight block with dusty blue pills */}
      {keyInsights.length > 0 && (
        <div>
          <p 
            className="text-[11px] font-semibold uppercase tracking-widest mb-4 px-1"
            style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
          >
            Key Influences
          </p>
          <div className="flex flex-wrap gap-3">
            {keyInsights.map((insight, i) => (
              <span
                key={i}
                className="inline-flex items-center px-4 py-2.5 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: '#FAFAF8',
                  color: '#3D3B38',
                  border: '1px solid rgba(167, 180, 194, 0.25)',
                }}
              >
                <span 
                  className="w-2 h-2 rounded-full mr-3"
                  style={{ backgroundColor: 'rgba(60, 131, 246, 0.75)' }}
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

/**
 * PersonaBlockMinimal - Refined persona card with Scandinavian aesthetics
 * 
 * Soft neutrals, no harsh colors, subtle accent (#A7B4C2)
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

// Monoline SVG icons for each persona
const PersonaIcons: Record<PersonaCluster, React.ReactNode> = {
  pain_sleeper: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 24C19.5228 24 24 19.5228 24 14C24 8.47715 19.5228 4 14 4C8.47715 4 4 8.47715 4 14C4 19.5228 8.47715 24 14 24Z" stroke="#A7B4C2" strokeWidth="1.5" fill="none"/>
      <path d="M10 14C10 14 11.5 11 14 11C16.5 11 18 14 18 14" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 18C9 18 11 20 14 20C17 20 19 18 19 18" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  stress_insomnia: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10C20 10 18 4 12 4C6 4 4 10 4 14C4 18 6 24 14 24C22 24 24 18 24 14" stroke="#A7B4C2" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M20 10L24 6" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="14" r="1" fill="#A7B4C2"/>
      <circle cx="18" cy="14" r="1" fill="#A7B4C2"/>
    </svg>
  ),
  optimizer: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 4V8" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 20V24" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 14H8" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 14H24" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="14" cy="14" r="6" stroke="#A7B4C2" strokeWidth="1.5" fill="none"/>
      <circle cx="14" cy="14" r="2" fill="#A7B4C2"/>
    </svg>
  ),
  recovery_sleeper: (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 14L10 10L14 14L18 8L22 12" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 20H22" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="22" cy="12" r="2" fill="#A7B4C2"/>
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
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header with icon */}
      <div className="flex items-start gap-4 mb-5">
        <div 
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#F7F7F6' }}
        >
          {Icon}
        </div>
        <div className="flex-1 min-w-0">
          <p 
            className="text-xs font-medium tracking-wide uppercase mb-1"
            style={{ color: '#A7B4C2' }}
          >
            Your Sleep Persona
          </p>
          <h3 
            className="text-xl font-medium"
            style={{ color: '#2D3436' }}
          >
            {displayLabel}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p 
        className="text-base leading-relaxed mb-6"
        style={{ color: '#636E72' }}
      >
        {displayDescription}
      </p>

      {/* Why this matches you */}
      {rationale && (
        <div 
          className="rounded-xl p-5 mb-6"
          style={{ backgroundColor: '#F7F7F6' }}
        >
          <p 
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: '#A7B4C2' }}
          >
            Why this matches you
          </p>
          <p 
            className="text-sm leading-relaxed"
            style={{ color: '#2D3436' }}
          >
            {rationale}
          </p>
        </div>
      )}

      {/* Key insight block */}
      {keyInsights.length > 0 && (
        <div 
          className="rounded-xl p-5"
          style={{ 
            backgroundColor: '#FAFAF9',
            border: '1px solid #E6E6E4',
          }}
        >
          <p 
            className="text-xs font-medium uppercase tracking-wide mb-3"
            style={{ color: '#A7B4C2' }}
          >
            What's most affecting your sleep
          </p>
          <div className="flex flex-wrap gap-2">
            {keyInsights.map((insight, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm"
                style={{ 
                  backgroundColor: '#F0F4F8',
                  color: '#4A5568',
                }}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full mr-2"
                  style={{ backgroundColor: '#A7B4C2' }}
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

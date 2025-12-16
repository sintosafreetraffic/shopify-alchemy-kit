/**
 * PlanInsights - Detected patterns and research timelines panel
 * 
 * Two-column layout showing note pattern education
 * and science-grounded improvement timelines
 */

interface PatternInfo {
  pattern: string;
  label: string;
  education: string;
  weekFocus: string;
}

interface TimelineInfo {
  category: string;
  typicalOnset: string;
  fullEffect: string;
  weeklyFocus: string;
}

interface PlanInsightsProps {
  detectedPatterns?: string[];
  patternEducation?: PatternInfo[];
  relevantTimelines?: TimelineInfo[];
  adaptiveSummary?: string;
}

// Pattern display config - brand neutral/blue colors only, no traffic-light colors
const PATTERN_LABELS: Record<string, { label: string; color: string }> = {
  alcohol: { label: "Alcohol timing", color: "rgba(60, 131, 246, 0.7)" },
  late_meal: { label: "Late meals", color: "rgba(167, 180, 194, 0.8)" },
  stress_anxiety: { label: "Stress activation", color: "rgba(60, 131, 246, 0.6)" },
  temperature_discomfort: { label: "Temperature", color: "rgba(167, 180, 194, 0.7)" },
  screen_time: { label: "Screen time", color: "rgba(60, 131, 246, 0.65)" },
  caffeine_late: { label: "Caffeine timing", color: "rgba(167, 180, 194, 0.75)" },
  travel: { label: "Travel disruption", color: "rgba(60, 131, 246, 0.55)" },
  irregular_schedule: { label: "Timing inconsistency", color: "rgba(167, 180, 194, 0.85)" },
  social_jetlag: { label: "Social jet lag", color: "rgba(60, 131, 246, 0.6)" },
  exercise_late: { label: "Late exercise", color: "rgba(167, 180, 194, 0.7)" },
  medication: { label: "Medication effects", color: "rgba(142, 152, 163, 0.8)" },
  partner_disruption: { label: "Partner disruption", color: "rgba(167, 180, 194, 0.75)" },
};

// Default education text for patterns - calm, scientific tone
const PATTERN_EDUCATION_DEFAULT: Record<string, string> = {
  alcohol: "Research suggests alcohol may fragment sleep architecture and reduce restorative deep sleep phases. This week, your plan gently supports better timing and hydration habits.",
  late_meal: "Eating close to bedtime can affect sleep onset and quality. Your plan includes light evening nutrition guidance to support more restful nights.",
  stress_anxiety: "Elevated stress activates the nervous system, making it harder to transition into rest. This week focuses on calming wind-down rituals that may help ease the transition.",
  temperature_discomfort: "Temperature regulation is key to quality sleep. Your plan includes targeted cooling or warming strategies to support comfort.",
  screen_time: "Blue light exposure can delay melatonin production. Your plan incorporates screen-free wind-down periods that may support natural sleep onset.",
  caffeine_late: "Caffeine has a half-life of 5-6 hours. Your plan suggests timing adjustments that may support better sleep onset.",
  travel: "Circadian disruption from travel takes time to stabilize. Your plan includes anchoring strategies to support your adjustment.",
  irregular_schedule: "Inconsistent sleep timing can affect your internal clock. This week focuses on building consistent anchors that may support better rhythm.",
  social_jetlag: "Weekend schedule shifts can create mini jet lag effects. Your plan supports gradual consistency that may help maintain your rhythm.",
  exercise_late: "Late intense exercise can elevate cortisol levels. Your plan suggests optimal timing for movement to support restful nights.",
  medication: "Some medications can affect sleep architecture. Your plan works around these factors to support better rest.",
  partner_disruption: "Shared sleep spaces can create disruptions. Your plan includes strategies that may help both partners rest more comfortably.",
};

// Timeline categories
const TIMELINE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  alignment_posture: { 
    label: "Alignment and Posture",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 3v18M3 12h18" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      </svg>
    ),
  },
  stress_regulation: { 
    label: "Stress Regulation",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 12h4l3-9 4 18 3-9h4" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      </svg>
    ),
  },
  temperature: { 
    label: "Temperature",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" stroke="#8E98A3" strokeWidth="1.25" opacity="0.8"/>
      </svg>
    ),
  },
  circadian: { 
    label: "Circadian Rhythm",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#8E98A3" strokeWidth="1.25" opacity="0.8"/>
        <path d="M12 6v6l4 2" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      </svg>
    ),
  },
  wind_down: { 
    label: "Wind-Down Routines",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#8E98A3" strokeWidth="1.25" opacity="0.8"/>
      </svg>
    ),
  },
  pain_management: { 
    label: "Comfort Support",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#8E98A3" strokeWidth="1.25" opacity="0.8"/>
        <path d="M12 8v4M12 16h.01" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
      </svg>
    ),
  },
};

export function PlanInsights({
  detectedPatterns = [],
  patternEducation = [],
  relevantTimelines = [],
  adaptiveSummary,
}: PlanInsightsProps) {
  // Get pattern info with defaults
  const patternsToShow = detectedPatterns.slice(0, 3).map(p => {
    const existing = patternEducation.find(pe => pe.pattern === p);
    const config = PATTERN_LABELS[p] || { label: p.replace(/_/g, ' '), color: '#A7B4C2' };
    return {
      pattern: p,
      label: existing?.label || config.label,
      education: existing?.education || PATTERN_EDUCATION_DEFAULT[p] || "Your plan adapts to support better rest.",
      color: config.color,
    };
  });

  // Get timeline info
  const timelinesToShow = relevantTimelines.slice(0, 3).map(t => {
    const config = TIMELINE_LABELS[t.category] || { label: t.category, icon: null };
    return { ...t, label: config.label, icon: config.icon };
  });

  const hasPatterns = patternsToShow.length > 0;
  const hasTimelines = timelinesToShow.length > 0;

  if (!hasPatterns && !hasTimelines) return null;

  return (
    <section 
      className="rounded-3xl p-6 md:p-8"
      style={{ 
        backgroundColor: '#FAFAF8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header */}
      <p 
        className="text-[11px] font-semibold tracking-widest uppercase mb-6"
        style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
      >
        Insights and Research
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Detected patterns */}
        {hasPatterns && (
          <div>
            <h4 
              className="text-sm font-medium mb-4"
              style={{ color: '#2D2B29' }}
            >
              Patterns from your logs
            </h4>

            {/* Pattern chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {patternsToShow.map(({ pattern, label, color }) => (
                <span
                  key={pattern}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(167, 180, 194, 0.2)',
                    color: '#3D3B38',
                  }}
                >
                  <span 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>

            {/* Education for first pattern */}
            {patternsToShow[0] && (
              <div 
                className="p-4 rounded-2xl"
                style={{ 
                  backgroundColor: '#F4F3F1',
                  borderLeft: '3px solid rgba(167, 180, 194, 0.35)',
                }}
              >
                <p 
                  className="text-sm leading-relaxed"
                  style={{ color: '#2D2B29', lineHeight: 1.6 }}
                >
                  {patternsToShow[0].education}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Right: Research timelines */}
        {hasTimelines && (
          <div>
            <h4 
              className="text-sm font-medium mb-4"
              style={{ color: '#2D2B29' }}
            >
              Research-grounded timelines
            </h4>

            <div className="space-y-3">
              {timelinesToShow.map((timeline, i) => (
                <div 
                  key={i}
                  className="p-4 rounded-2xl"
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(167, 180, 194, 0.15)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {timeline.icon}
                    <span 
                      className="text-sm font-medium"
                      style={{ color: '#2D2B29' }}
                    >
                      {timeline.label}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 text-xs mb-2" style={{ color: '#6F6A66' }}>
                    <span>Typical onset: {timeline.typicalOnset}</span>
                    <span>Full effect: {timeline.fullEffect}</span>
                  </div>
                  
                  <p 
                    className="text-xs"
                    style={{ color: '#A7A29C', lineHeight: 1.5 }}
                  >
                    {timeline.weeklyFocus}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Adaptive summary at bottom */}
      {adaptiveSummary && (
        <div 
          className="mt-6 pt-5 border-t"
          style={{ borderColor: 'rgba(167, 180, 194, 0.15)' }}
        >
          <p 
            className="text-xs"
            style={{ color: '#A7A29C', lineHeight: 1.55 }}
          >
            {adaptiveSummary}
          </p>
        </div>
      )}
    </section>
  );
}

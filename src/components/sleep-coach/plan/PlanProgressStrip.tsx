/**
 * PlanProgressStrip - Progress and adherence display
 * 
 * Shows week number, adherence rate, streak days
 * Premium Scandinavian aesthetic with soft progress bar
 */

interface PlanProgressStripProps {
  weekNumber?: number;
  adherenceRate?: number;
  streakDays?: number;
  phase?: "foundation" | "stabilization" | "optimization" | "resilience";
  totalWeeks?: number;
}

// Flame icon for streak
const FlameIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 7 8 7 13C7 16.5 9.5 19 12 20C14.5 19 17 16.5 17 13C17 8 12 2 12 2Z" stroke="#8E98A3" strokeWidth="1.5" fill="none" opacity="0.8"/>
    <path d="M12 10C12 10 10 12 10 14C10 15.5 11 16.5 12 17C13 16.5 14 15.5 14 14C14 12 12 10 12 10Z" stroke="#8E98A3" strokeWidth="1.25" fill="none" opacity="0.7"/>
  </svg>
);

// Checkmark icon for adherence
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#8E98A3" strokeWidth="1.5" opacity="0.8"/>
    <path d="M8 12l2.5 2.5L16 9" stroke="#8E98A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
  </svg>
);

// Phase progress indicator
const PHASE_ORDER = ["foundation", "stabilization", "optimization", "resilience"];
const PHASE_LABELS: Record<string, string> = {
  foundation: "Foundation",
  stabilization: "Stabilization",
  optimization: "Optimization",
  resilience: "Resilience",
};

export function PlanProgressStrip({
  weekNumber = 1,
  adherenceRate,
  streakDays = 0,
  phase = "foundation",
  totalWeeks = 12,
}: PlanProgressStripProps) {
  // Calculate overall progress
  const progressPercent = Math.min((weekNumber / totalWeeks) * 100, 100);
  
  // Get phase index
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const phaseProgress = ((phaseIndex + 1) / PHASE_ORDER.length) * 100;

  // Adherence color
  const getAdherenceColor = (rate?: number) => {
    if (rate === undefined) return '#A7B4C2';
    if (rate >= 80) return 'rgba(34, 197, 94, 0.85)';
    if (rate >= 60) return 'rgba(234, 179, 8, 0.85)';
    return 'rgba(239, 68, 68, 0.75)';
  };

  // Encouragement text
  const getEncouragementText = () => {
    if (adherenceRate !== undefined && adherenceRate < 50) {
      return "This week we'll keep actions small enough to stay consistent.";
    }
    if (streakDays >= 7) {
      return "Your consistency is building strong sleep foundations.";
    }
    if (weekNumber <= 2) {
      return "Early weeks are about building awareness and small wins.";
    }
    return "Steady progress leads to lasting improvements.";
  };

  return (
    <section 
      className="rounded-2xl px-6 py-5"
      style={{ 
        backgroundColor: 'rgba(247, 247, 246, 0.6)',
        border: '1px solid rgba(167, 180, 194, 0.12)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Week progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span 
              className="text-sm font-medium"
              style={{ color: '#2D2B29' }}
            >
              Week {weekNumber}
            </span>
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: 'rgba(60, 131, 246, 0.08)',
                color: 'rgba(60, 131, 246, 0.85)',
              }}
            >
              {PHASE_LABELS[phase]}
            </span>
          </div>
          
          {/* Progress bar */}
          <div 
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(167, 180, 194, 0.15)' }}
          >
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${progressPercent}%`,
                backgroundColor: 'rgba(60, 131, 246, 0.85)',
              }}
            />
          </div>
          
          {/* Encouragement */}
          <p 
            className="text-xs mt-2"
            style={{ color: '#A7A29C' }}
          >
            {getEncouragementText()}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5">
          {/* Streak */}
          {streakDays > 0 && (
            <div className="flex items-center gap-2">
              <FlameIcon />
              <div className="text-right">
                <span 
                  className="text-lg font-semibold block leading-none"
                  style={{ color: '#2D2B29' }}
                >
                  {streakDays}
                </span>
                <span 
                  className="text-[10px]"
                  style={{ color: '#A7A29C' }}
                >
                  day streak
                </span>
              </div>
            </div>
          )}

          {/* Adherence */}
          {adherenceRate !== undefined && (
            <div className="flex items-center gap-2">
              <CheckIcon />
              <div className="text-right">
                <span 
                  className="text-lg font-semibold block leading-none"
                  style={{ color: getAdherenceColor(adherenceRate) }}
                >
                  {adherenceRate}%
                </span>
                <span 
                  className="text-[10px]"
                  style={{ color: '#A7A29C' }}
                >
                  adherence
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase progress dots */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(167, 180, 194, 0.15)' }}>
        {PHASE_ORDER.map((p, i) => {
          const isActive = i === phaseIndex;
          const isComplete = i < phaseIndex;
          
          return (
            <div key={p} className="flex items-center gap-2 flex-1">
              <div 
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{ 
                  backgroundColor: isComplete 
                    ? 'rgba(34, 197, 94, 0.7)' 
                    : isActive 
                      ? 'rgba(60, 131, 246, 0.85)' 
                      : 'rgba(167, 180, 194, 0.3)',
                }}
              />
              <span 
                className="text-[10px] hidden sm:inline"
                style={{ 
                  color: isActive ? '#2D2B29' : '#A7A29C',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {PHASE_LABELS[p]}
              </span>
              {i < PHASE_ORDER.length - 1 && (
                <div 
                  className="flex-1 h-px"
                  style={{ 
                    backgroundColor: isComplete 
                      ? 'rgba(34, 197, 94, 0.4)' 
                      : 'rgba(167, 180, 194, 0.2)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

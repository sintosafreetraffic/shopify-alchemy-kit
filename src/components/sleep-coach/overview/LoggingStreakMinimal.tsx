/**
 * LoggingStreakMinimal - Simplified streak display
 * 
 * Encouraging but not gamified, warm Scandinavian neutrals
 * Brand blue (#3C83F6) at 85% opacity for progress bar
 */

interface LoggingStreakMinimalProps {
  streak: number;
  totalLogs?: number;
}

// Achievement thresholds with calm messaging
const ACHIEVEMENTS = [
  { days: 3, label: "First Step", message: "Building the habit" },
  { days: 7, label: "One Week", message: "Consistency forming" },
  { days: 14, label: "Two Weeks", message: "Pattern established" },
  { days: 30, label: "One Month", message: "Dedicated sleeper" },
  { days: 60, label: "Two Months", message: "Sleep champion" },
];

export function LoggingStreakMinimal({ streak, totalLogs = 0 }: LoggingStreakMinimalProps) {
  // Find current achievement
  const currentAchievement = ACHIEVEMENTS
    .filter(a => streak >= a.days)
    .pop();
  
  // Find next achievement
  const nextAchievement = ACHIEVEMENTS
    .find(a => a.days > streak);

  // Calculate progress to next achievement
  const progressPercent = nextAchievement
    ? ((streak / nextAchievement.days) * 100)
    : 100;

  return (
    <section className="space-y-5">
      {/* Section header */}
      <div className="px-1">
        <p 
          className="text-xs font-medium tracking-wider uppercase"
          style={{ color: '#A7B4C2', letterSpacing: '0.08em' }}
        >
          Logging Progress
        </p>
      </div>

      <div
        className="rounded-2xl p-7 md:p-8"
        style={{
          backgroundColor: '#FAFAF8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div className="flex items-center gap-6">
          {/* Streak counter */}
          <div 
            className="flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center"
            style={{ backgroundColor: '#F4F3F1' }}
          >
            <span 
              className="text-2xl font-medium"
              style={{ color: '#2D2B29' }}
            >
              {streak}
            </span>
            <span 
              className="text-xs"
              style={{ color: '#A7A29C' }}
            >
              {streak === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Progress info */}
          <div className="flex-1 min-w-0">
            {currentAchievement ? (
              <p 
                className="text-base font-medium mb-1.5"
                style={{ color: '#2D2B29' }}
              >
                {currentAchievement.label}
              </p>
            ) : streak > 0 ? (
              <p 
                className="text-base font-medium mb-1.5"
                style={{ color: '#2D2B29' }}
              >
                Getting Started
              </p>
            ) : (
              <p 
                className="text-base font-medium mb-1.5"
                style={{ color: '#2D2B29' }}
              >
                Start Your Journey
              </p>
            )}

            {/* Progress bar - brand blue at 85% opacity */}
            {nextAchievement && (
              <div className="mt-2.5">
                <div 
                  className="h-1.5 rounded-full overflow-hidden mb-2"
                  style={{ backgroundColor: '#E6E4DE' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(progressPercent, 100)}%`,
                      backgroundColor: 'rgba(60, 131, 246, 0.85)',
                    }}
                  />
                </div>
                <p 
                  className="text-xs"
                  style={{ color: '#6F6A66' }}
                >
                  {nextAchievement.days - streak} {nextAchievement.days - streak === 1 ? 'day' : 'days'} to {nextAchievement.label.toLowerCase()}
                </p>
              </div>
            )}

            {/* Completed all */}
            {!nextAchievement && streak >= 60 && (
              <p 
                className="text-sm mt-1.5"
                style={{ color: '#7CB99D' }}
              >
                You've built a lasting habit
              </p>
            )}
          </div>
        </div>

        {/* Achievement badges row */}
        <div 
          className="flex gap-2.5 mt-6 pt-6 overflow-x-auto pb-1"
          style={{ borderTop: '1px solid rgba(230, 228, 222, 0.6)' }}
        >
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = streak >= achievement.days;
            return (
              <div
                key={achievement.days}
                className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                style={{
                  backgroundColor: isUnlocked ? '#F4F3F1' : '#FAFAF8',
                  opacity: isUnlocked ? 1 : 0.5,
                }}
              >
                {/* Monoline checkmark or circle */}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {isUnlocked ? (
                    <path d="M3 7L6 10L11 4" stroke="#7CB99D" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"/>
                  ) : (
                    <circle cx="7" cy="7" r="5" stroke="#8E98A3" strokeWidth="1.25" fill="none" opacity="0.75"/>
                  )}
                </svg>
                <span 
                  className="text-xs whitespace-nowrap"
                  style={{ color: isUnlocked ? '#4A4844' : '#A7A29C' }}
                >
                  {achievement.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

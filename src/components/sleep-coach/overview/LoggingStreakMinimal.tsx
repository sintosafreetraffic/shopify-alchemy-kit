/**
 * LoggingStreakMinimal - Simplified streak display
 * 
 * Encouraging but not gamified, warm Scandinavian neutrals
 * Streak number = brand blue (#3C83F6)
 * Progress bar = brand blue at 85% opacity
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
    <section className="space-y-6">
      {/* Section header */}
      <div className="px-1">
        <p 
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
        >
          Logging Progress
        </p>
      </div>

      <div
        className="rounded-3xl p-8 md:p-10"
        style={{
          backgroundColor: '#FAFAF8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-7">
          {/* Streak counter - brand blue number */}
          <div 
            className="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center"
            style={{ backgroundColor: '#F4F3F1' }}
          >
            <span 
              className="text-3xl font-semibold"
              style={{ color: 'rgba(60, 131, 246, 0.9)' }}
            >
              {streak}
            </span>
            <span 
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: '#A7A29C', letterSpacing: '0.08em' }}
            >
              {streak === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Progress info */}
          <div className="flex-1 min-w-0">
            {currentAchievement ? (
              <p 
                className="text-lg font-semibold mb-2"
                style={{ color: '#2D2B29' }}
              >
                {currentAchievement.label}
              </p>
            ) : streak > 0 ? (
              <p 
                className="text-lg font-semibold mb-2"
                style={{ color: '#2D2B29' }}
              >
                Getting Started
              </p>
            ) : (
              <p 
                className="text-lg font-semibold mb-2"
                style={{ color: '#2D2B29' }}
              >
                Start Your Journey
              </p>
            )}

            {/* Progress bar - brand blue at 85% opacity */}
            {nextAchievement && (
              <div className="mt-3">
                <div 
                  className="h-2 rounded-full overflow-hidden mb-2.5"
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
                  className="text-sm"
                  style={{ color: '#6F6A66' }}
                >
                  {nextAchievement.days - streak} {nextAchievement.days - streak === 1 ? 'day' : 'days'} to {nextAchievement.label.toLowerCase()}
                </p>
              </div>
            )}

            {/* Completed all */}
            {!nextAchievement && streak >= 60 && (
              <p 
                className="text-sm mt-2"
                style={{ color: '#7CB99D' }}
              >
                You've built a lasting habit
              </p>
            )}
          </div>
        </div>

        {/* Achievement badges row - monoline style */}
        <div 
          className="flex gap-3 mt-8 pt-7 overflow-x-auto pb-1"
          style={{ borderTop: '1px solid rgba(230, 230, 228, 0.7)' }}
        >
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = streak >= achievement.days;
            return (
              <div
                key={achievement.days}
                className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{
                  backgroundColor: isUnlocked ? '#F4F3F1' : 'transparent',
                  opacity: isUnlocked ? 1 : 0.45,
                  border: isUnlocked ? 'none' : '1px solid rgba(230, 230, 228, 0.5)',
                }}
              >
                {/* Monoline checkmark or circle */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {isUnlocked ? (
                    <path d="M3.5 8L6.5 11L12.5 5" stroke="#7CB99D" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
                  ) : (
                    <circle cx="8" cy="8" r="5.5" stroke="#8E98A3" strokeWidth="1.25" fill="none" opacity="0.7"/>
                  )}
                </svg>
                <span 
                  className="text-sm font-medium whitespace-nowrap"
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

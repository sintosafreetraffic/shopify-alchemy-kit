/**
 * SleepTrendsMinimal - Softened trends display
 * 
 * Observational, supportive language with warm neutral typography
 * Natural highlight colors (muted) for trend states
 * Warm primary for numbers
 */

interface TrendData {
  avgSleepQuality: number;
  avgPain: number;
  goodNights: number;
  poorNights: number;
  hotNights: number;
  stressedNights: number;
  trend: 'improving' | 'worsening' | 'stable';
}

interface SleepTrendsMinimalProps {
  trends: TrendData;
  logsCount: number;
}

// Monoline trend icons - stroke colors per trend, strokeWidth 1.25
const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'improving') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 13L8 8L10.5 10.5L15 5" stroke="#7CB99D" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
        <path d="M11 5H15V9" stroke="#7CB99D" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
      </svg>
    );
  }
  if (trend === 'worsening') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 5L8 10L10.5 7.5L15 13" stroke="#D4A5A5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
        <path d="M11 13H15V9" stroke="#D4A5A5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9H15" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.85"/>
    </svg>
  );
};

export function SleepTrendsMinimal({ trends, logsCount }: SleepTrendsMinimalProps) {
  const getTrendLabel = (trend: string) => {
    if (trend === 'improving') return 'Improving';
    if (trend === 'worsening') return 'Needs attention';
    return 'Stable';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return '#7CB99D';
    if (trend === 'worsening') return '#D4A5A5';
    return '#8E98A3';
  };

  // Don't show if no logs
  if (logsCount === 0) {
    return (
      <section className="space-y-6">
        <div className="px-1">
          <p 
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
          >
            Sleep Trends
          </p>
        </div>
        <div
          className="rounded-3xl p-8 text-center"
          style={{
            backgroundColor: '#FAFAF8',
          }}
        >
          <p 
            className="text-sm"
            style={{ color: '#6F6A66' }}
          >
            Start logging your sleep to see trends over time.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Section header with trend indicator */}
      <div className="flex items-center justify-between px-1">
        <p 
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
        >
          Sleep Trends
        </p>
        <div className="flex items-center gap-2.5">
          <TrendIcon trend={trends.trend} />
          <span 
            className="text-sm font-semibold"
            style={{ color: getTrendColor(trends.trend) }}
          >
            {getTrendLabel(trends.trend)}
          </span>
        </div>
      </div>

      <div
        className="rounded-3xl p-8 md:p-10"
        style={{
          backgroundColor: '#FAFAF8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Main metrics - warm primary numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p 
              className="text-4xl font-light mb-2"
              style={{ color: '#2D2B29' }}
            >
              {trends.avgSleepQuality > 0 ? trends.avgSleepQuality.toFixed(1) : '—'}
            </p>
            <p 
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Avg Sleep Quality
            </p>
          </div>
          
          <div className="text-center">
            <p 
              className="text-4xl font-light mb-2"
              style={{ color: '#2D2B29' }}
            >
              {trends.avgPain > 0 ? trends.avgPain.toFixed(1) : '—'}
            </p>
            <p 
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Avg Morning Comfort
            </p>
          </div>
          
          <div className="text-center">
            <p 
              className="text-4xl font-light mb-2"
              style={{ color: '#7CB99D' }}
            >
              {trends.goodNights}
            </p>
            <p 
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Nights Improving
            </p>
          </div>
          
          <div className="text-center">
            <p 
              className="text-4xl font-light mb-2"
              style={{ color: '#B8A5C2' }}
            >
              {trends.poorNights}
            </p>
            <p 
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Nights Disrupted
            </p>
          </div>
        </div>

        {/* Additional notes */}
        {(trends.hotNights > 0 || trends.stressedNights > 0) && (
          <div 
            className="flex flex-wrap gap-6 mt-8 pt-7"
            style={{ borderTop: '1px solid rgba(230, 230, 228, 0.7)' }}
          >
            {trends.hotNights > 0 && (
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 2C9 2 6.5 6 6.5 8.5C6.5 10.15 7.85 11.5 9 11.5C10.15 11.5 11.5 10.15 11.5 8.5C11.5 6 9 2 9 2Z" stroke="#E8B86D" strokeWidth="1.25" fill="none" opacity="0.85"/>
                  <path d="M6.5 14H11.5" stroke="#E8B86D" strokeWidth="1.25" strokeLinecap="round" opacity="0.85"/>
                  <path d="M7.5 16H10.5" stroke="#E8B86D" strokeWidth="1.25" strokeLinecap="round" opacity="0.85"/>
                </svg>
                <span 
                  className="text-sm"
                  style={{ color: '#6F6A66' }}
                >
                  {trends.hotNights} warm {trends.hotNights === 1 ? 'night' : 'nights'}
                </span>
              </div>
            )}
            {trends.stressedNights > 0 && (
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="9" r="7" stroke="#B8A5C2" strokeWidth="1.25" fill="none" opacity="0.85"/>
                  <path d="M9 5.5V9" stroke="#B8A5C2" strokeWidth="1.25" strokeLinecap="round" opacity="0.85"/>
                  <circle cx="9" cy="12" r="0.75" fill="#B8A5C2" opacity="0.85"/>
                </svg>
                <span 
                  className="text-sm"
                  style={{ color: '#6F6A66' }}
                >
                  {trends.stressedNights} restless {trends.stressedNights === 1 ? 'night' : 'nights'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

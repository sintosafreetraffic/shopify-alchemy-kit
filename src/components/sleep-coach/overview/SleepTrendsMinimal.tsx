/**
 * SleepTrendsMinimal - Softened trends display
 * 
 * Observational, supportive language with warm neutral typography
 * Muted natural status colors
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

// Monoline trend icons with muted strokes
const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'improving') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12L8 7L10 9L13 4" stroke="#7CB99D" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
        <path d="M10 4H13V7" stroke="#7CB99D" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      </svg>
    );
  }
  if (trend === 'worsening') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4L8 9L10 7L13 12" stroke="#D4A5A5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
        <path d="M10 12H13V9" stroke="#D4A5A5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8H13" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
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
      <section className="space-y-4">
        <div className="px-1">
          <p 
            className="text-xs font-medium tracking-wide uppercase"
            style={{ color: '#8E98A3' }}
          >
            Sleep Trends
          </p>
        </div>
        <div
          className="rounded-2xl p-6 text-center"
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
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <p 
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: '#8E98A3' }}
        >
          Sleep Trends
        </p>
        <div className="flex items-center gap-1.5">
          <TrendIcon trend={trends.trend} />
          <span 
            className="text-xs font-medium"
            style={{ color: getTrendColor(trends.trend) }}
          >
            {getTrendLabel(trends.trend)}
          </span>
        </div>
      </div>

      <div
        className="rounded-2xl p-7 md:p-8"
        style={{
          backgroundColor: '#FAFAF8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Main metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="text-center">
            <p 
              className="text-3xl font-light mb-1"
              style={{ color: '#2D2B29' }}
            >
              {trends.avgSleepQuality > 0 ? trends.avgSleepQuality.toFixed(1) : '—'}
            </p>
            <p 
              className="text-xs"
              style={{ color: '#A7A29C' }}
            >
              Avg Sleep Quality
            </p>
          </div>
          
          <div className="text-center">
            <p 
              className="text-3xl font-light mb-1"
              style={{ color: '#2D2B29' }}
            >
              {trends.avgPain > 0 ? trends.avgPain.toFixed(1) : '—'}
            </p>
            <p 
              className="text-xs"
              style={{ color: '#A7A29C' }}
            >
              Avg Morning Comfort
            </p>
          </div>
          
          <div className="text-center">
            <p 
              className="text-3xl font-light mb-1"
              style={{ color: '#7CB99D' }}
            >
              {trends.goodNights}
            </p>
            <p 
              className="text-xs"
              style={{ color: '#A7A29C' }}
            >
              Nights Improving
            </p>
          </div>
          
          <div className="text-center">
            <p 
              className="text-3xl font-light mb-1"
              style={{ color: '#B8A5C2' }}
            >
              {trends.poorNights}
            </p>
            <p 
              className="text-xs"
              style={{ color: '#A7A29C' }}
            >
              Nights Disrupted
            </p>
          </div>
        </div>

        {/* Additional notes */}
        {(trends.hotNights > 0 || trends.stressedNights > 0) && (
          <div 
            className="flex flex-wrap gap-4 mt-5 pt-5"
            style={{ borderTop: '1px solid #E6E4DE' }}
          >
            {trends.hotNights > 0 && (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2C8 2 6 5 6 7C6 8.1 6.9 9 8 9C9.1 9 10 8.1 10 7C10 5 8 2 8 2Z" stroke="#E8B86D" strokeWidth="1.25" fill="none" opacity="0.8"/>
                  <path d="M6 12H10" stroke="#E8B86D" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
                  <path d="M7 14H9" stroke="#E8B86D" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
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
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="6" stroke="#B8A5C2" strokeWidth="1.25" fill="none" opacity="0.8"/>
                  <path d="M8 5V8" stroke="#B8A5C2" strokeWidth="1.25" strokeLinecap="round" opacity="0.8"/>
                  <circle cx="8" cy="10.5" r="0.5" fill="#B8A5C2" opacity="0.8"/>
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

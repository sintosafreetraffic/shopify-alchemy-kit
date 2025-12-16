/**
 * SleepProfileMinimal - Clean, minimal profile summary
 * 
 * Warm neutral typography with premium Scandinavian aesthetic
 * Labels smaller + tertiary, values larger + primary
 * Dusty blue outline pills for pain points
 */

interface SleepProfileMinimalProps {
  position?: string;
  temperature?: string;
  stress?: string;
  wakeCondition?: string;
  painPoints?: string[];
  onUpdateAssessment?: () => void;
}

// Capitalize and format values
const formatValue = (value?: string) => {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
};

export function SleepProfileMinimal({
  position,
  temperature,
  stress,
  wakeCondition,
  painPoints = [],
  onUpdateAssessment,
}: SleepProfileMinimalProps) {
  return (
    <section className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <p 
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
        >
          Your Sleep Profile
        </p>
        {onUpdateAssessment && (
          <button
            onClick={onUpdateAssessment}
            className="text-xs font-semibold transition-all hover:opacity-80"
            style={{ color: 'rgba(60, 131, 246, 0.85)' }}
          >
            Update Assessment
          </button>
        )}
      </div>

      {/* Profile grid */}
      <div
        className="rounded-3xl p-8 md:p-10"
        style={{
          backgroundColor: '#FAFAF8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-8">
          <div>
            <p 
              className="text-[11px] font-medium uppercase tracking-wider mb-2"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Position
            </p>
            <p 
              className="text-lg font-semibold"
              style={{ color: '#2D2B29' }}
            >
              {formatValue(position)}
            </p>
          </div>
          
          <div>
            <p 
              className="text-[11px] font-medium uppercase tracking-wider mb-2"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Temperature
            </p>
            <p 
              className="text-lg font-semibold"
              style={{ color: '#2D2B29' }}
            >
              {formatValue(temperature)}
            </p>
          </div>
          
          <div>
            <p 
              className="text-[11px] font-medium uppercase tracking-wider mb-2"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Stress Level
            </p>
            <p 
              className="text-lg font-semibold"
              style={{ color: '#2D2B29' }}
            >
              {formatValue(stress)}
            </p>
          </div>
          
          <div>
            <p 
              className="text-[11px] font-medium uppercase tracking-wider mb-2"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Wake Pattern
            </p>
            <p 
              className="text-lg font-semibold"
              style={{ color: '#2D2B29' }}
            >
              {formatValue(wakeCondition)}
            </p>
          </div>
        </div>

        {/* Pain points as pills with dusty blue outline */}
        {painPoints.length > 0 && (
          <div 
            className="pt-7"
            style={{ borderTop: '1px solid rgba(230, 230, 228, 0.7)' }}
          >
            <p 
              className="text-[11px] font-medium uppercase tracking-wider mb-4"
              style={{ color: '#A7A29C', letterSpacing: '0.1em' }}
            >
              Areas of Focus
            </p>
            <div className="flex flex-wrap gap-3">
              {painPoints.map((point, i) => (
                <span
                  key={i}
                  className="inline-flex px-4 py-2.5 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: '#4A4844',
                    border: '1.5px solid rgba(167, 180, 194, 0.3)',
                  }}
                >
                  {formatValue(point)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

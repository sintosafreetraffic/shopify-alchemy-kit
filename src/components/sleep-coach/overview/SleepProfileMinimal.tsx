/**
 * SleepProfileMinimal - Clean, minimal profile summary
 * 
 * Warm neutral typography with premium Scandinavian aesthetic
 * Brand blue (#3C83F6) at 85% opacity for CTA hover
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
    <section className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <p 
          className="text-xs font-medium tracking-wider uppercase"
          style={{ color: '#A7B4C2', letterSpacing: '0.08em' }}
        >
          Your Sleep Profile
        </p>
        {onUpdateAssessment && (
          <button
            onClick={onUpdateAssessment}
            className="text-xs font-medium transition-opacity hover:opacity-75"
            style={{ color: 'rgba(60, 131, 246, 0.9)' }}
          >
            Update Assessment
          </button>
        )}
      </div>

      {/* Profile grid */}
      <div
        className="rounded-2xl p-7 md:p-8"
        style={{
          backgroundColor: '#FAFAF8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-7 md:gap-9 mb-7">
          <div>
            <p 
              className="text-xs mb-1.5"
              style={{ color: '#A7A29C' }}
            >
              Position
            </p>
            <p 
              className="text-base font-medium"
              style={{ color: '#2D2B29' }}
            >
              {formatValue(position)}
            </p>
          </div>
          
          <div>
            <p 
              className="text-xs mb-1.5"
              style={{ color: '#A7A29C' }}
            >
              Temperature
            </p>
            <p 
              className="text-base font-medium"
              style={{ color: '#2D2B29' }}
            >
              {formatValue(temperature)}
            </p>
          </div>
          
          <div>
            <p 
              className="text-xs mb-1.5"
              style={{ color: '#A7A29C' }}
            >
              Stress Level
            </p>
            <p 
              className="text-base font-medium"
              style={{ color: '#2D2B29' }}
            >
              {formatValue(stress)}
            </p>
          </div>
          
          <div>
            <p 
              className="text-xs mb-1.5"
              style={{ color: '#A7A29C' }}
            >
              Wake Pattern
            </p>
            <p 
              className="text-base font-medium"
              style={{ color: '#2D2B29' }}
            >
              {formatValue(wakeCondition)}
            </p>
          </div>
        </div>

        {/* Pain points as pills */}
        {painPoints.length > 0 && (
          <div 
            className="pt-6"
            style={{ borderTop: '1px solid rgba(230, 228, 222, 0.6)' }}
          >
            <p 
              className="text-xs mb-3.5"
              style={{ color: '#A7A29C' }}
            >
              Areas of Focus
            </p>
            <div className="flex flex-wrap gap-2.5">
              {painPoints.map((point, i) => (
                <span
                  key={i}
                  className="inline-flex px-3.5 py-2 rounded-full text-sm"
                  style={{ 
                    backgroundColor: '#F4F3F1',
                    color: '#4A4844',
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

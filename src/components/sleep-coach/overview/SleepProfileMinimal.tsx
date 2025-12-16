/**
 * SleepProfileMinimal - Clean, minimal profile summary
 * 
 * Warm neutral typography with brand blue accent for CTA
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
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <p 
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: '#8E98A3' }}
        >
          Your Sleep Profile
        </p>
        {onUpdateAssessment && (
          <button
            onClick={onUpdateAssessment}
            className="text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: '#3C83F6' }}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6">
          <div>
            <p 
              className="text-xs mb-1"
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
              className="text-xs mb-1"
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
              className="text-xs mb-1"
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
              className="text-xs mb-1"
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
            className="pt-5"
            style={{ borderTop: '1px solid #E6E4DE' }}
          >
            <p 
              className="text-xs mb-3"
              style={{ color: '#A7A29C' }}
            >
              Areas of Focus
            </p>
            <div className="flex flex-wrap gap-2">
              {painPoints.map((point, i) => (
                <span
                  key={i}
                  className="inline-flex px-3 py-1.5 rounded-full text-sm"
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

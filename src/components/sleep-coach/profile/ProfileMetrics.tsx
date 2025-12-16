// Design tokens: brand blue at ≤0.85 opacity, no traffic-light colors
import { Card, CardContent } from "@/components/ui/card";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";
import { Activity, Moon, Clock } from "lucide-react";

interface ProfileMetricsProps {
  profile: SleepProfile;
}

interface MetricTile {
  icon: typeof Activity;
  title: string;
  label: string;
  description: string;
  value: number;
}

export function ProfileMetrics({ profile }: ProfileMetricsProps) {
  const assessment = profile.sleep_assessment as SleepAssessment | undefined;
  const scores = assessment?.scores;

  const getAlignmentData = (): MetricTile => {
    const score = scores?.alignmentScore ?? 50;
    let label = 'Developing';
    if (score >= 70) label = 'Well-supported';
    else if (score >= 50) label = 'Emerging strength';
    
    return {
      icon: Activity,
      title: 'Alignment Profile',
      label,
      description: score >= 70 
        ? 'Your positioning suggests good spinal support during rest.'
        : 'Your current setup may benefit from additional alignment support.',
      value: score,
    };
  };

  const getEnvironmentData = (): MetricTile => {
    const score = scores?.environmentScore ?? 50;
    let label = 'Developing';
    if (score >= 70) label = 'Well-optimized';
    else if (score >= 50) label = 'Emerging strength';
    
    return {
      icon: Moon,
      title: 'Environment Profile',
      label,
      description: score >= 70
        ? 'Your sleep environment appears supportive of quality rest.'
        : 'Small environmental adjustments could enhance your sleep quality.',
      value: score,
    };
  };

  const getConsistencyData = (): MetricTile => {
    const score = scores?.consistencyScore ?? 50;
    let label = 'Developing';
    if (score >= 70) label = 'Steady rhythm';
    else if (score >= 50) label = 'Building consistency';
    
    return {
      icon: Clock,
      title: 'Consistency Profile',
      label,
      description: score >= 70
        ? 'Your sleep patterns show regular timing, supporting your circadian rhythm.'
        : 'Establishing more consistent sleep timing may improve your rest quality.',
      value: score,
    };
  };

  const metrics = [getAlignmentData(), getEnvironmentData(), getConsistencyData()];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric, i) => (
        <Card 
          key={i}
          className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
          style={{ backgroundColor: '#FAFAF8' }}
        >
          <CardContent className="pt-5 pb-5 px-5">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <metric.icon className="h-4 w-4" style={{ color: '#A7B4C2' }} strokeWidth={1.5} />
                <span className="text-xs font-medium" style={{ color: '#A7A29C' }}>
                  {metric.title}
                </span>
              </div>

              {/* Label with score */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium" style={{ color: '#2D2B29' }}>
                    {metric.label}
                  </span>
                  <span className="text-xs" style={{ color: '#A7A29C' }}>
                    {metric.value}/100
                  </span>
                </div>
                
                {/* Soft gauge bar */}
                <div 
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgba(167, 180, 194, 0.2)' }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${metric.value}%`,
                      backgroundColor: 'rgba(60, 131, 246, 0.7)',
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed" style={{ color: '#6F6A66' }}>
                {metric.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Design tokens: brand blue at ≤0.85 opacity, no traffic-light colors
import { Card, CardContent } from "@/components/ui/card";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";

interface ProfileMetricsProps {
  profile: SleepProfile;
}

interface MetricTile {
  icon: 'alignment' | 'environment' | 'consistency';
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
    let description = 'Your current positioning may benefit from additional alignment support to reduce tension accumulation.';
    
    if (score >= 75) {
      label = 'Well-supported';
      description = 'Your positioning suggests strong spinal alignment during rest, supporting quality recovery.';
    } else if (score >= 60) {
      label = 'Emerging strength';
      description = 'Your alignment foundation is building. Small adjustments may further enhance support.';
    } else if (score >= 40) {
      label = 'Developing';
      description = 'Your current setup suggests opportunities for improved postural support during sleep.';
    }
    
    return { icon: 'alignment', title: 'Alignment Profile', label, description, value: score };
  };

  const getEnvironmentData = (): MetricTile => {
    const score = scores?.environmentScore ?? 50;
    let label = 'Developing';
    let description = 'Environmental adjustments could enhance your sleep quality and consistency.';
    
    if (score >= 75) {
      label = 'Well-optimized';
      description = 'Your sleep environment appears well-suited to support quality rest and recovery.';
    } else if (score >= 60) {
      label = 'Emerging strength';
      description = 'Your environment is largely supportive, with room for fine-tuning.';
    } else if (score >= 40) {
      label = 'Developing';
      description = 'Strategic environmental changes could meaningfully improve your sleep conditions.';
    }
    
    return { icon: 'environment', title: 'Environment Profile', label, description, value: score };
  };

  const getConsistencyData = (): MetricTile => {
    const score = scores?.consistencyScore ?? 50;
    let label = 'Developing';
    let description = 'Establishing more consistent sleep timing may help regulate your circadian rhythm.';
    
    if (score >= 75) {
      label = 'Stable rhythm';
      description = 'Your consistent patterns support a well-regulated circadian rhythm and quality rest.';
    } else if (score >= 60) {
      label = 'Building consistency';
      description = 'Your timing patterns are stabilizing, supporting improved sleep quality over time.';
    } else if (score >= 40) {
      label = 'Developing';
      description = 'More consistent sleep timing could help strengthen your natural sleep-wake cycles.';
    }
    
    return { icon: 'consistency', title: 'Consistency Profile', label, description, value: score };
  };

  const renderIcon = (type: string) => {
    const style = { stroke: '#A7B4C2', strokeWidth: 1.5, fill: 'none' };
    
    switch (type) {
      case 'alignment':
        return (
          <svg viewBox="0 0 24 24" className="w-4 h-4" style={style}>
            <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" />
          </svg>
        );
      case 'environment':
        return (
          <svg viewBox="0 0 24 24" className="w-4 h-4" style={style}>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        );
      case 'consistency':
        return (
          <svg viewBox="0 0 24 24" className="w-4 h-4" style={style}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  const metrics = [getAlignmentData(), getEnvironmentData(), getConsistencyData()];

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {metrics.map((metric, i) => (
        <Card 
          key={i}
          className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
          style={{ backgroundColor: '#FAFAF8' }}
        >
          <CardContent className="pt-6 pb-6 px-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                {renderIcon(metric.icon)}
                <span className="text-xs font-medium" style={{ color: '#A7A29C' }}>
                  {metric.title}
                </span>
              </div>

              {/* Label with score */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium" style={{ color: '#2D2B29' }}>
                    {metric.label}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: '#A7A29C' }}>
                    {metric.value}/100
                  </span>
                </div>
                
                {/* Soft gauge bar */}
                <div 
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgba(167, 180, 194, 0.15)' }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out"
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

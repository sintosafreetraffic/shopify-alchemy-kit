// Design tokens: brand blue at ≤0.85 opacity, no traffic-light colors
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";
import { MetricImprovementDrawer } from "./MetricImprovementDrawer";

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
  const [selectedMetric, setSelectedMetric] = useState<'alignment' | 'environment' | 'consistency' | null>(null);
  
  const assessment = profile.sleep_assessment as SleepAssessment | undefined;
  const scores = assessment?.scores;

  const getAlignmentData = (): MetricTile => {
    const score = scores?.alignmentScore ?? 50;
    let label = 'Developing';
    let description = 'Your current positioning may benefit from additional alignment support to reduce tension accumulation.';
    
    if (score >= 95) {
      label = 'Strong foundation';
      description = 'Your alignment setup is well-optimized. Maintain your current approach for continued support.';
    } else if (score >= 75) {
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
    
    if (score >= 95) {
      label = 'Strong foundation';
      description = 'Your environment is well-tuned for restorative sleep. Continue maintaining these conditions.';
    } else if (score >= 75) {
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
    
    if (score >= 95) {
      label = 'Strong foundation';
      description = 'Your timing consistency is excellent. This stable rhythm supports optimal recovery.';
    } else if (score >= 75) {
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
    <>
      <div className="grid gap-5 md:grid-cols-3">
        {metrics.map((metric, i) => (
          <Card 
            key={i}
            className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ backgroundColor: '#FAFAF8' }}
            onClick={() => setSelectedMetric(metric.icon)}
          >
            <CardContent className="pt-6 pb-6 px-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {renderIcon(metric.icon)}
                    <span className="text-xs font-medium" style={{ color: '#A7A29C' }}>
                      {metric.title}
                    </span>
                  </div>
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-4 h-4 opacity-40"
                    style={{ stroke: '#A7B4C2', strokeWidth: 1.5, fill: 'none' }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
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

                {/* Tap hint */}
                <p className="text-[11px]" style={{ color: '#A7A29C' }}>
                  Tap for improvement suggestions
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <MetricImprovementDrawer
        open={selectedMetric !== null}
        onOpenChange={(open) => !open && setSelectedMetric(null)}
        metric={selectedMetric ?? 'alignment'}
        score={
          selectedMetric === 'alignment' ? (scores?.alignmentScore ?? 50) :
          selectedMetric === 'environment' ? (scores?.environmentScore ?? 50) :
          (scores?.consistencyScore ?? 50)
        }
        assessment={assessment}
        profile={profile}
      />
    </>
  );
}

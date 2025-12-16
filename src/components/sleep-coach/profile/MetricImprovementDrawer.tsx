// Design tokens: brand blue at ≤0.85 opacity, no traffic-light colors
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";

interface MetricImprovementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: 'alignment' | 'environment' | 'consistency';
  score: number;
  assessment?: SleepAssessment;
  profile: SleepProfile;
}

interface Improvement {
  title: string;
  description: string;
  impact: string;
}

export function MetricImprovementDrawer({
  open,
  onOpenChange,
  metric,
  score,
  assessment,
  profile
}: MetricImprovementDrawerProps) {
  const isPerfect = score >= 95;
  const potentialGain = Math.min(100 - score, Math.floor(Math.random() * 8) + 6);

  const getMetricTitle = () => {
    switch (metric) {
      case 'alignment': return 'Alignment Profile';
      case 'environment': return 'Environment Profile';
      case 'consistency': return 'Consistency Profile';
    }
  };

  const getWhyItMatters = () => {
    switch (metric) {
      case 'alignment':
        return 'Proper spinal alignment during sleep allows muscles to fully relax and recover. When your body is well-supported, pressure points are minimized and circulation can flow naturally, supporting deeper restorative phases.';
      case 'environment':
        return 'Your sleep environment directly influences how quickly you fall asleep and how deeply you rest. Temperature, light, and sound conditions work together to support your body\'s natural sleep-wake rhythm.';
      case 'consistency':
        return 'Regular sleep timing helps regulate your circadian rhythm — your internal clock. A stable rhythm supports hormone balance, energy levels, and the quality of each sleep cycle throughout the night.';
    }
  };

  const getImprovements = (): Improvement[] => {
    const painPoints = profile.pain_points || [];
    const sleepPosition = profile.sleep_position;
    const tempPref = profile.temperature_preference;

    if (metric === 'alignment') {
      const improvements: Improvement[] = [];
      
      if (painPoints.includes('neck') || painPoints.includes('upper_back')) {
        improvements.push({
          title: 'Optimize pillow height',
          description: 'Side sleepers often benefit from a pillow that fills the neck-shoulder gap. Consider adjusting loft to maintain neutral spine alignment.',
          impact: '+3–5 points'
        });
      }
      
      if (sleepPosition === 'side') {
        improvements.push({
          title: 'Support hip alignment',
          description: 'A knee pillow can help maintain pelvic neutrality and reduce lower back strain during side sleeping.',
          impact: '+2–4 points'
        });
      }
      
      if (painPoints.includes('lower_back')) {
        improvements.push({
          title: 'Evaluate mattress support',
          description: 'Your lower back signals may indicate your mattress could use additional lumbar support or firmness adjustment.',
          impact: '+2–4 points'
        });
      }
      
      improvements.push({
        title: 'Morning mobility routine',
        description: 'Gentle stretching upon waking can help release overnight tension and maintain flexibility over time.',
        impact: '+1–3 points'
      });
      
      return improvements.slice(0, 4);
    }

    if (metric === 'environment') {
      const improvements: Improvement[] = [];
      
      const quizData = profile.quiz_data as Record<string, string> | undefined;
      const brightness = quizData?.roomBrightness;
      
      if (brightness === 'bright' || brightness === 'some_light') {
        improvements.push({
          title: 'Reduce light exposure',
          description: 'Even small amounts of light can interfere with melatonin production. A sleep mask or blackout solutions may support deeper rest.',
          impact: '+3–5 points'
        });
      }
      
      if (tempPref === 'warm') {
        improvements.push({
          title: 'Cool your sleep space',
          description: 'Research suggests slightly cooler environments (around 65–68°F) may support better sleep quality. Consider breathable bedding.',
          impact: '+2–4 points'
        });
      }
      
      improvements.push({
        title: 'Minimize sound disruptions',
        description: 'White noise or consistent ambient sound can mask disruptions and support uninterrupted sleep cycles.',
        impact: '+1–3 points'
      });
      
      improvements.push({
        title: 'Create a wind-down zone',
        description: 'Reserving your bedroom primarily for sleep helps your brain associate the space with rest.',
        impact: '+1–2 points'
      });
      
      return improvements.slice(0, 4);
    }

    if (metric === 'consistency') {
      return [
        {
          title: 'Anchor your wake time',
          description: 'Waking at the same time daily — even weekends — is often more impactful than a fixed bedtime for circadian stability.',
          impact: '+3–5 points'
        },
        {
          title: 'Build a pre-sleep ritual',
          description: 'A consistent 20–30 minute wind-down routine signals to your body that sleep is approaching.',
          impact: '+2–4 points'
        },
        {
          title: 'Limit late caffeine',
          description: 'Caffeine can linger in your system for 6+ hours. Consider setting a personal cutoff time.',
          impact: '+1–3 points'
        },
        {
          title: 'Track your patterns',
          description: 'Logging sleep times helps identify drift and reinforces accountability to your rhythm.',
          impact: '+1–2 points'
        }
      ];
    }

    return [];
  };

  const renderIcon = () => {
    const style = { stroke: '#A7B4C2', strokeWidth: 1.5, fill: 'none' };
    
    switch (metric) {
      case 'alignment':
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6" style={style}>
            <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" />
          </svg>
        );
      case 'environment':
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6" style={style}>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        );
      case 'consistency':
        return (
          <svg viewBox="0 0 24 24" className="w-6 h-6" style={style}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
    }
  };

  const improvements = getImprovements();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className="border-0 rounded-t-2xl"
        style={{ backgroundColor: '#FAFAF8' }}
      >
        <div className="mx-auto w-full max-w-lg px-6 pb-8">
          <DrawerHeader className="px-0 pt-6 pb-4">
            <div className="flex items-center gap-3">
              {renderIcon()}
              <div>
                <DrawerTitle 
                  className="text-base font-medium"
                  style={{ color: '#2D2B29' }}
                >
                  {getMetricTitle()}
                </DrawerTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    className="text-sm tabular-nums"
                    style={{ color: '#6F6A66' }}
                  >
                    Current: {score}/100
                  </span>
                  {!isPerfect && (
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: 'rgba(60, 131, 246, 0.1)',
                        color: 'rgba(60, 131, 246, 0.85)'
                      }}
                    >
                      +{potentialGain}–{potentialGain + 6} potential
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DrawerHeader>

          {/* Micro-illustration background */}
          <div 
            className="absolute top-4 right-4 w-24 h-24 opacity-[0.05]"
            style={{ pointerEvents: 'none' }}
          >
            <svg viewBox="0 0 100 100" fill="none" stroke="#A7B4C2" strokeWidth="0.5">
              <path d="M50 10 Q70 30 50 50 Q30 70 50 90" />
              <circle cx="50" cy="50" r="30" />
              <path d="M30 50 Q50 30 70 50" />
            </svg>
          </div>

          {isPerfect ? (
            <div 
              className="rounded-xl p-6 text-center"
              style={{ backgroundColor: 'rgba(167, 180, 194, 0.1)' }}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(60, 131, 246, 0.1)' }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ stroke: 'rgba(60, 131, 246, 0.85)', strokeWidth: 1.5, fill: 'none' }}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 
                className="text-sm font-medium mb-2"
                style={{ color: '#2D2B29' }}
              >
                Strong foundation
              </h3>
              <p 
                className="text-xs leading-relaxed"
                style={{ color: '#6F6A66' }}
              >
                This area is well-supported. Maintain your current rhythm and continue prioritizing the habits that brought you here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Improvements list */}
              <div className="space-y-3">
                {improvements.map((improvement, i) => (
                  <div 
                    key={i}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 
                          className="text-sm font-medium mb-1"
                          style={{ color: '#2D2B29' }}
                        >
                          {improvement.title}
                        </h4>
                        <p 
                          className="text-xs leading-relaxed"
                          style={{ color: '#6F6A66' }}
                        >
                          {improvement.description}
                        </p>
                      </div>
                      <span 
                        className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                        style={{ 
                          backgroundColor: 'rgba(167, 180, 194, 0.15)',
                          color: '#6F6A66'
                        }}
                      >
                        {improvement.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Why it matters */}
              <div 
                className="rounded-xl p-4"
                style={{ 
                  backgroundColor: 'rgba(167, 180, 194, 0.08)',
                  borderLeft: '2px solid rgba(167, 180, 194, 0.3)'
                }}
              >
                <h4 
                  className="text-xs font-medium mb-2"
                  style={{ color: '#A7A29C' }}
                >
                  Why this matters
                </h4>
                <p 
                  className="text-xs leading-relaxed"
                  style={{ color: '#6F6A66' }}
                >
                  {getWhyItMatters()}
                </p>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Design tokens: #F7F7F6 bg, #FAFAF8 cards, #A7B4C2 accent, #E8D59F achievement
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";

interface ProfileHeroProps {
  profile: SleepProfile;
  adherenceRate?: number;
  streakDays?: number;
}

export function ProfileHero({ profile, adherenceRate, streakDays }: ProfileHeroProps) {
  const assessment = profile.sleep_assessment as SleepAssessment | undefined;
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const getSleeperType = () => {
    const pos = profile.sleep_position;
    const hasPain = profile.pain_points?.length > 0;
    const highStress = profile.stress_level === 'high';
    const tempSensitive = profile.temperature_preference !== 'neutral';
    
    if (hasPain && pos === 'side') return 'Alignment-Sensitive Side Sleeper';
    if (hasPain && pos === 'back') return 'Posture-Conscious Back Sleeper';
    if (hasPain && pos === 'stomach') return 'Support-Seeking Stomach Sleeper';
    if (hasPain && pos === 'mixed') return 'Dynamic Pain Sleeper';
    if (highStress && pos === 'side') return 'Stress-Responsive Side Sleeper';
    if (highStress) return 'Recovery-Focused Sleeper';
    if (tempSensitive && pos === 'side') return 'Temperature-Reactive Side Sleeper';
    if (tempSensitive) return 'Temperature-Reactive Sleeper';
    if (pos === 'mixed') return 'Dynamic Position Sleeper';
    
    const positionLabels: Record<string, string> = {
      side: 'Side Sleeper',
      back: 'Back Sleeper',
      stomach: 'Stomach Sleeper',
      mixed: 'Dynamic Sleeper',
    };
    return positionLabels[pos] || 'Sleep Profile';
  };

  const generateSummary = () => {
    const parts: string[] = [];
    const pos = profile.sleep_position;
    const posLabel = pos === 'side' ? 'side' : pos === 'back' ? 'back' : pos === 'stomach' ? 'stomach' : 'dynamic';
    
    if (profile.pain_points?.length) {
      const painArea = profile.pain_points[0]?.replace(/_/g, ' ');
      parts.push(`As a ${posLabel} sleeper with ${painArea} sensitivity, your body may benefit from targeted positioning support.`);
    } else if (profile.stress_level === 'high') {
      parts.push(`As a ${posLabel} sleeper with elevated stress patterns, optimizing your wind-down routine may support deeper rest.`);
    } else {
      parts.push(`As a ${posLabel} sleeper, your foundation supports quality rest with opportunities for refinement.`);
    }
    
    if (assessment?.scores?.consistencyScore && assessment.scores.consistencyScore >= 70) {
      parts.push(`Your consistent sleep patterns suggest a stable circadian rhythm.`);
    } else if (assessment?.scores?.alignmentScore && assessment.scores.alignmentScore >= 70) {
      parts.push(`Your alignment profile indicates good postural support during sleep.`);
    }
    
    return parts.join(' ');
  };

  const getAchievementBadge = () => {
    if (streakDays && streakDays >= 14) return '14-day streak';
    if (streakDays && streakDays >= 7) return '7-day streak';
    if (adherenceRate && adherenceRate >= 70) return 'Consistent logger';
    if (adherenceRate && adherenceRate >= 40) return 'Building routine';
    if (profile.products_owned?.length && profile.products_owned.length >= 2) return 'Supported sleeper';
    if (profile.products_owned?.length) return 'Product owner';
    return null;
  };

  const achievement = getAchievementBadge();

  return (
    <Card className="relative overflow-hidden border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      {/* Micro-illustration background */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
        <svg viewBox="0 0 500 250" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          {/* Abstract spine wave */}
          <path
            d="M0,125 Q80,80 160,125 T320,125 T480,125"
            fill="none"
            stroke="#A7B4C2"
            strokeWidth="1.5"
          />
          <path
            d="M0,140 Q80,95 160,140 T320,140 T480,140"
            fill="none"
            stroke="#A7B4C2"
            strokeWidth="1"
          />
          {/* Abstract pillow shape */}
          <ellipse cx="400" cy="180" rx="60" ry="25" fill="none" stroke="#A7B4C2" strokeWidth="0.75" />
          <ellipse cx="400" cy="180" rx="45" ry="18" fill="none" stroke="#A7B4C2" strokeWidth="0.5" />
          {/* Sleep rhythm waves */}
          <path
            d="M20,200 Q60,180 100,200 Q140,220 180,200 Q220,180 260,200"
            fill="none"
            stroke="#A7B4C2"
            strokeWidth="0.75"
          />
        </svg>
      </div>
      
      <CardContent className="relative pt-10 pb-10 px-8">
        <div className="space-y-5">
          {/* Member info */}
          <div className="space-y-1">
            <p className="text-xs tracking-wide" style={{ color: '#A7A29C' }}>
              Member since {memberSince}
            </p>
            <h1 className="text-2xl font-medium tracking-tight" style={{ color: '#2D2B29' }}>
              {getSleeperType()}
            </h1>
          </div>

          {/* Summary */}
          <p className="text-sm leading-relaxed max-w-xl" style={{ color: '#6F6A66' }}>
            {generateSummary()}
          </p>

          {/* Achievement badge */}
          {achievement && (
            <Badge 
              variant="outline" 
              className="border-0 font-normal text-xs px-3 py-1"
              style={{ 
                backgroundColor: 'rgba(232, 213, 159, 0.2)',
                color: '#8B7B4D',
              }}
            >
              {achievement}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

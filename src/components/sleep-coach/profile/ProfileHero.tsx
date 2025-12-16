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

  const formatPosition = (pos: string) => {
    const labels: Record<string, string> = {
      side: 'side sleeper',
      back: 'back sleeper',
      stomach: 'stomach sleeper',
      mixed: 'dynamic sleeper',
    };
    return labels[pos] || pos;
  };

  const generateSummary = () => {
    const parts: string[] = [];
    const pos = formatPosition(profile.sleep_position);
    
    if (profile.pain_points?.length) {
      const painArea = profile.pain_points[0]?.replace(/_/g, ' ');
      parts.push(`As a ${pos} with ${painArea} awareness, your body may benefit from targeted alignment support.`);
    } else {
      parts.push(`As a ${pos}, your sleep posture can be supported with intentional positioning.`);
    }
    
    if (assessment?.scores?.consistencyScore && assessment.scores.consistencyScore > 70) {
      parts.push(`Your logging consistency suggests a strong foundation for improvement.`);
    }
    
    return parts.join(' ');
  };

  const getAchievementBadge = () => {
    if (streakDays && streakDays >= 7) return '7-day streak';
    if (adherenceRate && adherenceRate >= 50) return 'Building a new routine';
    if (profile.products_owned?.length) return 'Supported sleeper';
    return null;
  };

  const achievement = getAchievementBadge();

  return (
    <Card className="relative overflow-hidden border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      {/* Subtle background illustration */}
      <div className="absolute inset-0 opacity-[0.05]">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <path
            d="M0,100 Q100,50 200,100 T400,100"
            fill="none"
            stroke="#A7B4C2"
            strokeWidth="1"
          />
          <ellipse cx="200" cy="140" rx="80" ry="20" fill="none" stroke="#A7B4C2" strokeWidth="0.5" />
        </svg>
      </div>
      
      <CardContent className="relative pt-8 pb-8 px-6">
        <div className="space-y-4">
          {/* User identifier */}
          <div className="space-y-1">
            <p className="text-sm" style={{ color: '#A7A29C' }}>
              Member since {memberSince}
            </p>
            <h2 className="text-xl font-medium tracking-tight" style={{ color: '#2D2B29' }}>
              Your Sleep Identity
            </h2>
          </div>

          {/* Summary */}
          <p className="text-sm leading-relaxed max-w-lg" style={{ color: '#6F6A66' }}>
            {generateSummary()}
          </p>

          {/* Achievement badge */}
          {achievement && (
            <Badge 
              variant="outline" 
              className="mt-2 border-0 font-normal"
              style={{ 
                backgroundColor: 'rgba(232, 213, 159, 0.25)',
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

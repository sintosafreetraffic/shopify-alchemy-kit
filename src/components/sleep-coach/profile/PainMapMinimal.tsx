// Design tokens: monoline body outline, dusty blue highlights, no bright colors
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SleepProfile } from "@/hooks/useSleepApi";

interface PainMapMinimalProps {
  profile: SleepProfile;
}

const PAIN_LABEL_MAP: Record<string, string> = {
  neck: 'Neck',
  upper_back: 'Upper back',
  lower_back: 'Lower back',
  shoulders: 'Shoulders',
  hips: 'Hips',
  knees: 'Knees',
  legs: 'Legs',
};

const COMFORT_GOALS: Record<string, string> = {
  neck: 'Support neck alignment',
  upper_back: 'Ease upper back tension',
  lower_back: 'Stabilize lower back',
  shoulders: 'Reduce shoulder pressure',
  hips: 'Improve hip positioning',
  knees: 'Support knee comfort',
  legs: 'Enhance leg circulation',
};

export function PainMapMinimal({ profile }: PainMapMinimalProps) {
  const painPoints = profile.pain_points || [];
  
  if (painPoints.length === 0) {
    return null;
  }

  const activeParts = new Set(painPoints);

  const getPartStyle = (part: string, isActive: boolean) => {
    if (isActive || activeParts.has(part)) {
      return {
        stroke: '#8E98A3',
        fill: 'rgba(167, 180, 194, 0.15)',
        strokeWidth: 1.75,
      };
    }
    return {
      stroke: '#E6E6E4',
      fill: 'none',
      strokeWidth: 1,
    };
  };

  const comfortGoals = painPoints
    .map(p => COMFORT_GOALS[p])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4 pt-7 px-7">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Tension & Comfort Map
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          Areas where you typically experience morning tension
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6 px-7 pb-7">
        {/* Enhanced body diagram */}
        <div className="flex justify-center py-2">
          <svg 
            viewBox="0 0 120 200" 
            className="w-32 h-52"
            style={{ opacity: 0.95 }}
          >
            {/* Head */}
            <ellipse cx="60" cy="22" rx="16" ry="18" {...getPartStyle('head', false)} />
            
            {/* Neck */}
            <path 
              d="M52 38 L52 48 Q60 52 68 48 L68 38"
              {...getPartStyle('neck', activeParts.has('neck'))}
            />
            
            {/* Shoulders */}
            <path 
              d="M32 55 Q42 48 60 48 Q78 48 88 55"
              {...getPartStyle('shoulders', activeParts.has('shoulders'))}
            />
            
            {/* Torso - Upper back */}
            <path 
              d="M38 55 L38 82 Q60 88 82 82 L82 55 Q60 52 38 55"
              {...getPartStyle('upper_back', activeParts.has('upper_back'))}
            />
            
            {/* Torso - Lower back */}
            <path 
              d="M42 82 L42 115 Q60 120 78 115 L78 82 Q60 88 42 82"
              {...getPartStyle('lower_back', activeParts.has('lower_back'))}
            />
            
            {/* Hips */}
            <ellipse 
              cx="60" 
              cy="125" 
              rx="22" 
              ry="14" 
              {...getPartStyle('hips', activeParts.has('hips'))}
            />
            
            {/* Left leg upper */}
            <path 
              d="M42 132 L38 165 Q42 170 48 165 L52 132"
              {...getPartStyle('legs', activeParts.has('legs'))}
            />
            
            {/* Right leg upper */}
            <path 
              d="M68 132 L72 165 Q78 170 82 165 L78 132"
              {...getPartStyle('legs', activeParts.has('legs'))}
            />
            
            {/* Knees */}
            <ellipse cx="43" cy="168" rx="7" ry="6" {...getPartStyle('knees', activeParts.has('knees'))} />
            <ellipse cx="77" cy="168" rx="7" ry="6" {...getPartStyle('knees', activeParts.has('knees'))} />
            
            {/* Lower legs */}
            <path d="M38 174 L36 195 Q43 198 50 195 L48 174" {...getPartStyle('legs', false)} />
            <path d="M70 174 L72 195 Q77 198 84 195 L82 174" {...getPartStyle('legs', false)} />
          </svg>
        </div>

        {/* Primary areas */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
            Primary tension areas
          </p>
          <div className="flex flex-wrap gap-2">
            {painPoints.map(point => (
              <Badge 
                key={point}
                variant="outline"
                className="font-normal border-0 text-xs"
                style={{ 
                  backgroundColor: 'rgba(167, 180, 194, 0.12)',
                  color: '#6F6A66',
                }}
              >
                {PAIN_LABEL_MAP[point] || point.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: '#E6E6E4' }} />

        {/* Comfort goals */}
        {comfortGoals.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Comfort goals
            </p>
            <div className="flex flex-wrap gap-2">
              {comfortGoals.map((goal, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className="font-normal border-0 text-xs"
                  style={{ 
                    backgroundColor: 'rgba(60, 131, 246, 0.08)',
                    color: 'rgba(60, 131, 246, 0.85)',
                  }}
                >
                  {goal}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
  neck: 'Ease neck tension',
  upper_back: 'Reduce upper back stiffness',
  lower_back: 'Support lower back alignment',
  shoulders: 'Relieve shoulder pressure',
  hips: 'Improve hip alignment',
  knees: 'Reduce knee discomfort',
  legs: 'Improve leg circulation',
};

export function PainMapMinimal({ profile }: PainMapMinimalProps) {
  const painPoints = profile.pain_points || [];
  
  if (painPoints.length === 0) {
    return null;
  }

  const activeParts = new Set(painPoints);

  const getPartStyle = (part: string) => {
    if (activeParts.has(part)) {
      return {
        stroke: '#A7B4C2',
        fill: 'rgba(167, 180, 194, 0.15)',
        strokeWidth: 1.5,
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
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Pain & Comfort Map
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          Areas where you typically feel morning tension
        </p>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Minimal body diagram */}
        <div className="flex justify-center">
          <svg 
            viewBox="0 0 100 180" 
            className="w-28 h-44"
            style={{ opacity: 0.9 }}
          >
            {/* Head */}
            <ellipse cx="50" cy="18" rx="14" ry="16" {...getPartStyle('head')} />
            
            {/* Neck */}
            <rect x="44" y="32" width="12" height="10" rx="2" {...getPartStyle('neck')} />
            
            {/* Shoulders */}
            <path d="M30 45 Q38 42 50 42 Q62 42 70 45" {...getPartStyle('shoulders')} />
            
            {/* Upper back/chest */}
            <rect x="35" y="45" width="30" height="25" rx="4" {...getPartStyle('upper_back')} />
            
            {/* Lower back/torso */}
            <rect x="38" y="70" width="24" height="30" rx="3" {...getPartStyle('lower_back')} />
            
            {/* Hips */}
            <ellipse cx="50" cy="105" rx="18" ry="10" {...getPartStyle('hips')} />
            
            {/* Upper legs */}
            <rect x="35" y="112" width="10" height="28" rx="3" {...getPartStyle('legs')} />
            <rect x="55" y="112" width="10" height="28" rx="3" {...getPartStyle('legs')} />
            
            {/* Knees */}
            <ellipse cx="40" cy="145" rx="6" ry="5" {...getPartStyle('knees')} />
            <ellipse cx="60" cy="145" rx="6" ry="5" {...getPartStyle('knees')} />
            
            {/* Lower legs */}
            <rect x="36" y="150" width="8" height="22" rx="2" {...getPartStyle('legs')} />
            <rect x="56" y="150" width="8" height="22" rx="2" {...getPartStyle('legs')} />
          </svg>
        </div>

        {/* Primary areas */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
            Primary areas
          </p>
          <div className="flex flex-wrap gap-2">
            {painPoints.map(point => (
              <Badge 
                key={point}
                variant="outline"
                className="font-normal border-0"
                style={{ 
                  backgroundColor: 'rgba(167, 180, 194, 0.15)',
                  color: '#6F6A66',
                }}
              >
                {PAIN_LABEL_MAP[point] || point.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Comfort goals */}
        {comfortGoals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Comfort goals
            </p>
            <div className="flex flex-wrap gap-2">
              {comfortGoals.map((goal, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className="font-normal border-0"
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

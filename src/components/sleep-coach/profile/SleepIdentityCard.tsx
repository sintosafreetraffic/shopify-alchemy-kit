// Design tokens: #F7F7F6 bg, #FAFAF8 cards, #A7B4C2 accent, monoline icons
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";
import { 
  User, 
  Thermometer, 
  Moon, 
  Activity,
  Zap
} from "lucide-react";

interface SleepIdentityCardProps {
  profile: SleepProfile;
}

export function SleepIdentityCard({ profile }: SleepIdentityCardProps) {
  const assessment = profile.sleep_assessment as SleepAssessment | undefined;

  const getPersonaTitle = () => {
    const pos = profile.sleep_position;
    const hasPain = profile.pain_points?.length > 0;
    const highStress = profile.stress_level === 'high';
    
    if (hasPain && pos === 'side') return 'Alignment-Sensitive Side Sleeper';
    if (hasPain && pos === 'back') return 'Posture-Conscious Back Sleeper';
    if (hasPain && pos === 'stomach') return 'Support-Seeking Stomach Sleeper';
    if (highStress) return 'Recovery-Focused Sleeper';
    if (pos === 'mixed') return 'Dynamic Position Sleeper';
    
    const positionLabels: Record<string, string> = {
      side: 'Side Sleeper',
      back: 'Back Sleeper', 
      stomach: 'Stomach Sleeper',
      mixed: 'Dynamic Sleeper',
    };
    return positionLabels[pos] || 'Sleep Profile';
  };

  const getDescription = () => {
    const pos = profile.sleep_position;
    const hasPain = profile.pain_points?.length > 0;
    
    if (hasPain) {
      return 'Your sleep pattern suggests attention to physical comfort. Targeted support may help reduce morning tension and improve restorative rest.';
    }
    if (profile.stress_level === 'high') {
      return 'Your profile indicates stress may influence your sleep quality. Calming routines and environment optimization could support deeper rest.';
    }
    return 'Your sleep foundation provides a solid base. Small adjustments to positioning and environment may further enhance your rest quality.';
  };

  const getRiskDrivers = () => {
    const drivers: { icon: typeof Activity; label: string }[] = [];
    
    if (profile.pain_points?.includes('neck') || profile.pain_points?.includes('upper_back')) {
      drivers.push({ icon: Activity, label: 'Neck alignment strain' });
    }
    if (profile.pain_points?.includes('lower_back')) {
      drivers.push({ icon: Activity, label: 'Lower back pressure' });
    }
    if (profile.temperature_preference !== 'neutral') {
      drivers.push({ icon: Thermometer, label: 'Temperature sensitivity' });
    }
    if (profile.stress_level === 'high') {
      drivers.push({ icon: Zap, label: 'Elevated stress' });
    }
    if (assessment?.detectedIssues?.some(i => i.toLowerCase().includes('light'))) {
      drivers.push({ icon: Moon, label: 'Light sensitivity' });
    }
    
    return drivers.slice(0, 3);
  };

  const getOpportunities = () => {
    const opps: string[] = [];
    
    if (profile.sleep_position === 'side') {
      opps.push('Optimize pillow height');
    }
    if (profile.pain_points?.length) {
      opps.push('Targeted support placement');
    }
    if (profile.stress_level !== 'low') {
      opps.push('Stabilize wind-down timing');
    }
    if (profile.temperature_preference === 'warm' || profile.temperature_preference === 'cold') {
      opps.push('Temperature optimization');
    }
    if (!opps.length) {
      opps.push('Maintain current routine');
    }
    
    return opps.slice(0, 3);
  };

  const riskDrivers = getRiskDrivers();
  const opportunities = getOpportunities();

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div 
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(167, 180, 194, 0.15)' }}
          >
            <User className="h-5 w-5" style={{ color: '#8E98A3' }} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-medium" style={{ color: '#2D2B29' }}>
              {getPersonaTitle()}
            </CardTitle>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: '#6F6A66' }}>
              {getDescription()}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Risk Drivers */}
        {riskDrivers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Areas of attention
            </p>
            <div className="flex flex-wrap gap-2">
              {riskDrivers.map((driver, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                  style={{ 
                    backgroundColor: 'rgba(167, 180, 194, 0.12)',
                    color: '#6F6A66',
                  }}
                >
                  <driver.icon className="h-3 w-3" style={{ color: '#A7B4C2' }} strokeWidth={1.5} />
                  {driver.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: '#E6E6E4' }} />

        {/* Opportunities */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
            Opportunity areas
          </p>
          <div className="flex flex-wrap gap-2">
            {opportunities.map((opp, i) => (
              <Badge 
                key={i}
                variant="outline"
                className="font-normal border-0"
                style={{ 
                  backgroundColor: 'rgba(60, 131, 246, 0.08)',
                  color: 'rgba(60, 131, 246, 0.85)',
                }}
              >
                {opp}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

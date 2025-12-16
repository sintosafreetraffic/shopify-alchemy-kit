// Design tokens: #F7F7F6 bg, #FAFAF8 cards, #A7B4C2 accent, monoline icons
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";

interface SleepIdentityCardProps {
  profile: SleepProfile;
}

export function SleepIdentityCard({ profile }: SleepIdentityCardProps) {
  const assessment = profile.sleep_assessment as SleepAssessment | undefined;

  const getSleeperType = () => {
    const pos = profile.sleep_position;
    const hasPain = profile.pain_points?.length > 0;
    const hasNeckPain = profile.pain_points?.includes('neck') || profile.pain_points?.includes('upper_back');
    const hasLowerPain = profile.pain_points?.includes('lower_back') || profile.pain_points?.includes('hips');
    const highStress = profile.stress_level === 'high';
    const medStress = profile.stress_level === 'medium';
    const tempSensitive = profile.temperature_preference !== 'neutral';
    
    if (hasNeckPain && pos === 'side') return { name: 'Alignment-Sensitive Side Sleeper', category: 'alignment' };
    if (hasLowerPain && pos === 'side') return { name: 'Hip-Conscious Side Sleeper', category: 'alignment' };
    if (hasPain && pos === 'back') return { name: 'Posture-Conscious Back Sleeper', category: 'alignment' };
    if (hasPain && pos === 'stomach') return { name: 'Support-Seeking Stomach Sleeper', category: 'alignment' };
    if (hasPain) return { name: 'Pain Sleeper', category: 'pain' };
    if (highStress) return { name: 'Stress-Responsive Sleeper', category: 'stress' };
    if (medStress && tempSensitive) return { name: 'Environment-Sensitive Sleeper', category: 'environment' };
    if (tempSensitive) return { name: 'Temperature-Reactive Sleeper', category: 'temperature' };
    if (pos === 'mixed') return { name: 'Dynamic Sleeper', category: 'dynamic' };
    
    const labels: Record<string, { name: string; category: string }> = {
      side: { name: 'Classic Side Sleeper', category: 'alignment' },
      back: { name: 'Back Sleeper', category: 'alignment' },
      stomach: { name: 'Stomach Sleeper', category: 'alignment' },
      mixed: { name: 'Dynamic Sleeper', category: 'dynamic' },
    };
    return labels[pos] || { name: 'Sleep Profile', category: 'general' };
  };

  const getDescription = () => {
    const sleeperType = getSleeperType();
    
    const descriptions: Record<string, string> = {
      alignment: 'Your sleep pattern suggests attention to spinal alignment and positioning. Targeted support during rest may help reduce tension accumulation and promote more restorative sleep cycles.',
      pain: 'Physical discomfort appears to influence your rest quality. A systematic approach to positioning and support may help address tension patterns over time.',
      stress: 'Your profile indicates that mental state may influence your sleep transitions. Calming routines and environmental optimization could support deeper, more consistent rest.',
      temperature: 'Temperature sensitivity can affect sleep quality and cycle depth. Environmental adjustments may help optimize your sleep conditions.',
      environment: 'Multiple environmental factors appear to influence your sleep. A holistic approach to your sleep space may yield meaningful improvements.',
      dynamic: 'Your varied sleep positions suggest adaptability, though this can sometimes affect consistency. Position-neutral support may help maintain alignment.',
      general: 'Your sleep foundation provides a solid base for rest. Small refinements to positioning and environment may further enhance your sleep quality.',
    };
    
    return descriptions[sleeperType.category] || descriptions.general;
  };

  const getAreasOfAttention = () => {
    const areas: Array<{ icon: 'alignment' | 'tension' | 'temperature' | 'light' | 'circadian' | 'mobility'; label: string }> = [];
    
    if (profile.pain_points?.includes('neck') || profile.pain_points?.includes('upper_back')) {
      areas.push({ icon: 'alignment', label: 'Neck-shoulder alignment' });
    }
    if (profile.pain_points?.includes('lower_back')) {
      areas.push({ icon: 'alignment', label: 'Lower back support' });
    }
    if (profile.pain_points?.includes('hips') || profile.pain_points?.includes('knees')) {
      areas.push({ icon: 'mobility', label: 'Hip-leg alignment' });
    }
    if (profile.stress_level === 'high') {
      areas.push({ icon: 'tension', label: 'Stress-related tension' });
    }
    if (profile.temperature_preference === 'warm' || profile.temperature_preference === 'cold') {
      areas.push({ icon: 'temperature', label: 'Temperature regulation' });
    }
    if (assessment?.detectedIssues?.some(i => i.toLowerCase().includes('light'))) {
      areas.push({ icon: 'light', label: 'Light sensitivity' });
    }
    if (assessment?.detectedIssues?.some(i => i.toLowerCase().includes('inconsistent') || i.toLowerCase().includes('irregular'))) {
      areas.push({ icon: 'circadian', label: 'Circadian consistency' });
    }
    
    return areas.slice(0, 3);
  };

  const getOpportunityAreas = () => {
    const opps: Array<{ label: string; description: string }> = [];
    
    if (profile.sleep_position === 'side') {
      opps.push({ label: 'Pillow height optimization', description: 'Side sleeping benefits from loft that fills the neck-shoulder gap' });
    }
    if (profile.pain_points?.includes('lower_back') || profile.pain_points?.includes('hips')) {
      opps.push({ label: 'Knee positioning support', description: 'Hip alignment can be supported with strategic leg positioning' });
    }
    if (profile.stress_level !== 'low') {
      opps.push({ label: 'Wind-down routine', description: 'Consistent pre-sleep routines may ease the sleep transition' });
    }
    if (profile.temperature_preference !== 'neutral') {
      opps.push({ label: 'Temperature optimization', description: 'Adjusting room or bedding temperature to your preference' });
    }
    if (!opps.length) {
      opps.push({ label: 'Routine maintenance', description: 'Your current patterns support quality rest' });
    }
    
    return opps.slice(0, 3);
  };

  const renderIcon = (type: string) => {
    const iconStyle = { stroke: '#A7B4C2', strokeWidth: 1.5, fill: 'none' };
    
    switch (type) {
      case 'alignment':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={iconStyle}>
            <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" />
          </svg>
        );
      case 'tension':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={iconStyle}>
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 12l4-4" />
          </svg>
        );
      case 'temperature':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={iconStyle}>
            <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
          </svg>
        );
      case 'light':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={iconStyle}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        );
      case 'circadian':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={iconStyle}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      case 'mobility':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={iconStyle}>
            <path d="M18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 10l-2 6 6-2-4-4ZM22 12l-3 9-7-3" />
          </svg>
        );
      default:
        return null;
    }
  };

  const sleeperType = getSleeperType();
  const areasOfAttention = getAreasOfAttention();
  const opportunities = getOpportunityAreas();

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4 pt-7 px-7">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div 
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(167, 180, 194, 0.12)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" style={{ stroke: '#8E98A3', strokeWidth: 1.5, fill: 'none' }}>
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg font-medium" style={{ color: '#2D2B29' }}>
                {sleeperType.name}
              </CardTitle>
              <p className="text-xs" style={{ color: '#A7A29C' }}>Your sleep identity</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#6F6A66' }}>
            {getDescription()}
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 px-7 pb-7">
        {/* Areas of Attention */}
        {areasOfAttention.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Areas of attention
            </p>
            <div className="flex flex-wrap gap-2">
              {areasOfAttention.map((area, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs"
                  style={{ 
                    backgroundColor: 'rgba(167, 180, 194, 0.1)',
                    color: '#6F6A66',
                  }}
                >
                  {renderIcon(area.icon)}
                  <span>{area.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: '#E6E6E4' }} />

        {/* Opportunity Areas */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
            Opportunity areas
          </p>
          <div className="space-y-2">
            {opportunities.map((opp, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge 
                  variant="outline"
                  className="font-normal border-0 text-xs shrink-0"
                  style={{ 
                    backgroundColor: 'rgba(60, 131, 246, 0.08)',
                    color: 'rgba(60, 131, 246, 0.85)',
                  }}
                >
                  {opp.label}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Design tokens: 2-column grid, monoline icons, brand blue CTA
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SleepProfile, QuizData } from "@/hooks/useSleepApi";

interface SleepSetupCardProps {
  profile: SleepProfile;
  onEditSetup: () => void;
}

const formatValue = (value: string | undefined | null): string => {
  if (!value) return 'Not specified';
  return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

interface SetupField {
  icon: 'bed' | 'mattress' | 'height' | 'users' | 'moon' | 'volume' | 'thermometer' | 'fabric';
  label: string;
  value: string;
  note?: string;
}

export function SleepSetupCard({ profile, onEditSetup }: SleepSetupCardProps) {
  const quizData = profile.quiz_data as QuizData | undefined;

  const renderIcon = (type: string) => {
    const style = { stroke: '#A7B4C2', strokeWidth: 1.5, fill: 'none' };
    
    switch (type) {
      case 'bed':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <path d="M2 9V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5" />
            <path d="M2 11v9h20v-9H2Z" />
            <path d="M2 16h20" />
          </svg>
        );
      case 'mattress':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <rect x="2" y="8" width="20" height="8" rx="2" />
            <path d="M2 12h20" />
          </svg>
        );
      case 'height':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" />
          </svg>
        );
      case 'users':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            <circle cx="19" cy="7" r="3" />
            <path d="M21 21v-1a3 3 0 0 0-3-3h-1" />
          </svg>
        );
      case 'moon':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        );
      case 'volume':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <path d="M11 5 6 9H2v6h4l5 4V5ZM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        );
      case 'thermometer':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
          </svg>
        );
      case 'fabric':
        return (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={style}>
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        );
      default:
        return null;
    }
  };

  const bedMattressFields: SetupField[] = [
    {
      icon: 'mattress',
      label: 'Mattress firmness',
      value: formatValue(profile.mattress_firmness),
    },
    {
      icon: 'bed',
      label: 'Mattress thickness',
      value: formatValue(profile.mattress_thickness),
    },
    {
      icon: 'height',
      label: 'Bed height',
      value: formatValue(profile.bed_height),
    },
    {
      icon: 'users',
      label: 'Sleeping arrangement',
      value: formatValue(profile.co_sleeping),
    },
  ];

  const roomSensoryFields: SetupField[] = [
    {
      icon: 'moon',
      label: 'Room brightness',
      value: formatValue(quizData?.roomBrightness),
    },
    {
      icon: 'volume',
      label: 'Room noise level',
      value: formatValue(quizData?.roomNoise),
    },
    {
      icon: 'thermometer',
      label: 'Temperature preference',
      value: formatValue(profile.temperature_preference),
      note: profile.temperature_preference === 'neutral' 
        ? 'Neutral preference supports easier optimization.'
        : undefined,
    },
    {
      icon: 'fabric',
      label: 'Bedding material',
      value: formatValue(profile.bedding_material),
    },
  ];

  const FieldItem = ({ field }: { field: SetupField }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {renderIcon(field.icon)}
        <span className="text-xs" style={{ color: '#A7A29C' }}>{field.label}</span>
      </div>
      <p className="text-sm font-medium pl-5.5" style={{ color: '#2D2B29' }}>{field.value}</p>
      {field.note && (
        <p className="text-xs pl-5.5" style={{ color: '#A7A29C' }}>{field.note}</p>
      )}
    </div>
  );

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-5 pt-7 px-7">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Sleep Environment
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          Your current sleep setup configuration
        </p>
      </CardHeader>
      
      <CardContent className="space-y-7 px-7 pb-7">
        {/* Two column grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Column 1: Bed & Mattress */}
          <div className="space-y-5">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Bed & Mattress
            </p>
            <div className="space-y-4">
              {bedMattressFields.map((field, i) => (
                <FieldItem key={i} field={field} />
              ))}
            </div>
          </div>

          {/* Column 2: Room & Sensory */}
          <div className="space-y-5">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Room & Sensory
            </p>
            <div className="space-y-4">
              {roomSensoryFields.map((field, i) => (
                <FieldItem key={i} field={field} />
              ))}
            </div>
          </div>
        </div>

        {/* Edit button */}
        <Button 
          onClick={onEditSetup}
          className="w-full font-normal h-11"
          style={{ 
            backgroundColor: 'rgba(60, 131, 246, 0.85)',
            color: 'white',
          }}
        >
          Update sleep setup
        </Button>
      </CardContent>
    </Card>
  );
}

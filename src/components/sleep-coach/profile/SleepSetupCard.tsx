// Design tokens: 2-column grid, monoline icons, brand blue CTA
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SleepProfile, QuizData } from "@/hooks/useSleepApi";
import { Bed, Moon, Thermometer, Volume2, Users, Shirt } from "lucide-react";

interface SleepSetupCardProps {
  profile: SleepProfile;
  onEditSetup: () => void;
}

const formatValue = (value: string | undefined | null): string => {
  if (!value) return 'Not specified';
  return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

interface SetupField {
  icon: typeof Bed;
  label: string;
  value: string;
  note?: string;
}

export function SleepSetupCard({ profile, onEditSetup }: SleepSetupCardProps) {
  const quizData = profile.quiz_data as QuizData | undefined;

  const bedMattressFields: SetupField[] = [
    {
      icon: Bed,
      label: 'Mattress Firmness',
      value: formatValue(profile.mattress_firmness),
    },
    {
      icon: Bed,
      label: 'Mattress Thickness',
      value: formatValue(profile.mattress_thickness),
    },
    {
      icon: Bed,
      label: 'Bed Height',
      value: formatValue(profile.bed_height),
    },
    {
      icon: Users,
      label: 'Sleeping Arrangement',
      value: formatValue(profile.co_sleeping),
    },
  ];

  const roomSensoryFields: SetupField[] = [
    {
      icon: Moon,
      label: 'Room Brightness',
      value: formatValue(quizData?.roomBrightness),
    },
    {
      icon: Volume2,
      label: 'Room Noise',
      value: formatValue(quizData?.roomNoise),
    },
    {
      icon: Thermometer,
      label: 'Temperature Preference',
      value: formatValue(profile.temperature_preference),
      note: profile.temperature_preference === 'neutral' 
        ? 'Neutral preference is often easier to optimize.'
        : undefined,
    },
    {
      icon: Shirt,
      label: 'Bedding Material',
      value: formatValue(profile.bedding_material),
    },
  ];

  const FieldItem = ({ field }: { field: SetupField }) => (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <field.icon className="h-3 w-3" style={{ color: '#A7B4C2' }} strokeWidth={1.5} />
        <span className="text-xs" style={{ color: '#A7A29C' }}>{field.label}</span>
      </div>
      <p className="text-sm font-medium" style={{ color: '#2D2B29' }}>{field.value}</p>
      {field.note && (
        <p className="text-xs" style={{ color: '#A7A29C' }}>{field.note}</p>
      )}
    </div>
  );

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Sleep Setup
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          Your sleep environment snapshot
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Two column grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Column 1: Bed & Mattress */}
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Bed & Mattress
            </p>
            <div className="space-y-3">
              {bedMattressFields.map((field, i) => (
                <FieldItem key={i} field={field} />
              ))}
            </div>
          </div>

          {/* Column 2: Room & Sensory */}
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Room & Sensory
            </p>
            <div className="space-y-3">
              {roomSensoryFields.map((field, i) => (
                <FieldItem key={i} field={field} />
              ))}
            </div>
          </div>
        </div>

        {/* Edit button */}
        <Button 
          onClick={onEditSetup}
          className="w-full font-normal"
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

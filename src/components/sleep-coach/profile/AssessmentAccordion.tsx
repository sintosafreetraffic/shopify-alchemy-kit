// Design tokens: 28-32px padding, calm accordion groups
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { QuizData } from "@/hooks/useSleepApi";
import { Bed, Moon, Activity, Heart, Target } from "lucide-react";

interface AssessmentAccordionProps {
  quizData?: QuizData;
}

const formatLabel = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return 'Not specified';
  if (typeof value === 'number') return String(value);
  return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

interface AccordionGroup {
  id: string;
  icon: typeof Bed;
  title: string;
  summary: string;
  fields: Array<{ label: string; value: string | string[] | number | undefined }>;
}

export function AssessmentAccordion({ quizData }: AssessmentAccordionProps) {
  if (!quizData || Object.keys(quizData).length === 0) {
    return null;
  }

  const getSleepPreferencesSummary = () => {
    const pos = formatLabel(quizData.sleepPosition);
    const hours = formatLabel(quizData.sleepHours);
    const awakenings = formatLabel(quizData.nightAwakenings);
    return `You sleep mostly on your ${pos.toLowerCase()} with ${hours.toLowerCase()} of sleep and ${awakenings.toLowerCase()} awakenings.`;
  };

  const groups: AccordionGroup[] = [
    {
      id: 'preferences',
      icon: Bed,
      title: 'Sleep Preferences',
      summary: getSleepPreferencesSummary(),
      fields: [
        { label: 'Sleep Position', value: quizData.sleepPosition },
        { label: 'Movement Frequency', value: quizData.movesOften },
        { label: 'Hours of Sleep', value: quizData.sleepHours },
        { label: 'Night Awakenings', value: quizData.nightAwakenings },
        { label: 'Snoring', value: quizData.snoring },
      ],
    },
    {
      id: 'environment',
      icon: Moon,
      title: 'Environment',
      summary: `Room is ${formatLabel(quizData.roomBrightness).toLowerCase()} brightness with ${formatLabel(quizData.roomNoise).toLowerCase()} noise.`,
      fields: [
        { label: 'Room Brightness', value: quizData.roomBrightness },
        { label: 'Room Noise', value: quizData.roomNoise },
        { label: 'Temperature Preference', value: quizData.sleepTemperature },
        { label: 'Sleep Clothing', value: quizData.sleepClothing },
      ],
    },
    {
      id: 'behavior',
      icon: Activity,
      title: 'Behavior',
      summary: `${formatLabel(quizData.sleepLatency)} time to fall asleep with ${formatLabel(quizData.eveningScreenUse).toLowerCase()} evening screen use.`,
      fields: [
        { label: 'Time to Fall Asleep', value: quizData.sleepLatency },
        { label: 'Evening Screen Use', value: quizData.eveningScreenUse },
        { label: 'Previously Tried', value: quizData.triedMethods },
      ],
    },
    {
      id: 'pain',
      icon: Heart,
      title: 'Pain & Recovery',
      summary: quizData.painAreas?.length 
        ? `Areas of focus: ${quizData.painAreas.slice(0, 2).map(formatLabel).join(', ').toLowerCase()}.`
        : 'No specific pain areas reported.',
      fields: [
        { label: 'Pain Areas', value: quizData.painAreas },
        { label: 'Pain Severity', value: quizData.painSeverity ? `${quizData.painSeverity}/10` : undefined },
        { label: 'Pillow Satisfaction', value: quizData.pillowSatisfaction ? `${quizData.pillowSatisfaction}/10` : undefined },
        { label: 'Pillow Issues', value: quizData.pillowIssues },
      ],
    },
    {
      id: 'goals',
      icon: Target,
      title: 'Goals & Equipment',
      summary: quizData.sleepGoals?.length 
        ? `Goals include: ${quizData.sleepGoals.slice(0, 2).map(formatLabel).join(', ').toLowerCase()}.`
        : 'No specific goals set.',
      fields: [
        { label: 'Sleep Goals', value: quizData.sleepGoals },
        { label: 'Current Equipment', value: quizData.sleepEquipment },
        { label: 'Number of Pillows', value: quizData.pillowCount },
        { label: 'Mattress Firmness', value: quizData.mattressFirmness },
      ],
    },
  ];

  const renderFieldValue = (value: string | string[] | number | undefined) => {
    if (!value) return <span style={{ color: '#A7A29C' }}>Not specified</span>;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span style={{ color: '#A7A29C' }}>None selected</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <Badge 
              key={i}
              variant="outline"
              className="font-normal border-0 text-xs"
              style={{ 
                backgroundColor: 'rgba(167, 180, 194, 0.12)',
                color: '#6F6A66',
              }}
            >
              {formatLabel(v)}
            </Badge>
          ))}
        </div>
      );
    }
    
    return <span style={{ color: '#2D2B29' }}>{formatLabel(value)}</span>;
  };

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Assessment Summary
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          Your complete sleep assessment responses
        </p>
      </CardHeader>
      
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {groups.map(group => {
            const hasData = group.fields.some(f => {
              if (Array.isArray(f.value)) return f.value.length > 0;
              return f.value !== undefined && f.value !== null;
            });
            
            if (!hasData) return null;
            
            return (
              <AccordionItem 
                key={group.id} 
                value={group.id}
                className="border rounded-lg px-4"
                style={{ borderColor: '#E6E6E4' }}
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-2">
                    <group.icon className="h-4 w-4" style={{ color: '#A7B4C2' }} strokeWidth={1.5} />
                    <span className="text-sm font-medium" style={{ color: '#2D2B29' }}>
                      {group.title}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    {/* Summary line */}
                    <p className="text-xs leading-relaxed" style={{ color: '#6F6A66' }}>
                      {group.summary}
                    </p>
                    
                    {/* Field details */}
                    <div className="grid gap-3">
                      {group.fields.map((field, i) => {
                        if (!field.value && !Array.isArray(field.value)) return null;
                        if (Array.isArray(field.value) && field.value.length === 0) return null;
                        
                        return (
                          <div key={i} className="space-y-0.5">
                            <span className="text-xs" style={{ color: '#A7A29C' }}>
                              {field.label}
                            </span>
                            <div className="text-sm">
                              {renderFieldValue(field.value)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

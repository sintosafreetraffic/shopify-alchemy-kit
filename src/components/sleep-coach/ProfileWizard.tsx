import { useState } from "react";
import { SleepProfile } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Moon, Bed, Thermometer, Brain, Sun, Heart } from "lucide-react";

interface ProfileWizardProps {
  email: string;
  onComplete: (profile: Partial<SleepProfile> & { email: string }) => Promise<SleepProfile | null>;
  loading?: boolean;
}

const STEPS = [
  { id: 'welcome', title: 'Your Personal Sleep Coach', icon: Heart, description: 'A few questions to personalize your experience' },
  { id: 'position', title: 'Sleep Position', icon: Bed, description: 'How do you typically sleep?' },
  { id: 'pain', title: 'Pain Points', icon: Moon, description: 'Where do you experience discomfort?' },
  { id: 'temperature', title: 'Temperature', icon: Thermometer, description: 'What\'s your ideal sleep temperature?' },
  { id: 'stress', title: 'Stress Level', icon: Brain, description: 'How would you rate your daily stress?' },
  { id: 'wakeup', title: 'Morning Feel', icon: Sun, description: 'How do you typically wake up?' },
];

const SLEEP_POSITIONS = [
  { value: 'side', label: 'Side Sleeper', emoji: '🛏️', description: 'You sleep on your side most of the night' },
  { value: 'back', label: 'Back Sleeper', emoji: '🔙', description: 'You sleep flat on your back' },
  { value: 'stomach', label: 'Stomach Sleeper', emoji: '⬇️', description: 'You sleep face-down on your stomach' },
  { value: 'mixed', label: 'Mixed Position', emoji: '🔄', description: 'You change positions throughout the night' },
];

const PAIN_POINTS = [
  { value: 'Neck pain', label: 'Neck Pain', emoji: '🦒' },
  { value: 'Shoulder pain', label: 'Shoulder Pain', emoji: '💪' },
  { value: 'Lower back pain', label: 'Lower Back Pain', emoji: '🔙' },
  { value: 'Hip pain', label: 'Hip Pain', emoji: '🦵' },
  { value: 'Headaches', label: 'Headaches', emoji: '🤕' },
  { value: 'Stiffness', label: 'General Stiffness', emoji: '🦴' },
  { value: 'Numbness/tingling', label: 'Numbness/Tingling', emoji: '✋' },
];

const TEMPERATURE_OPTIONS = [
  { value: 'cold', label: 'Cool', emoji: '❄️', description: 'I prefer a cooler sleeping environment' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', description: 'I\'m comfortable at room temperature' },
  { value: 'warm', label: 'Warm', emoji: '🔥', description: 'I prefer a warmer, cozy environment' },
];

const STRESS_LEVELS = [
  { value: 'low', label: 'Low', emoji: '😌', description: 'Generally relaxed, minimal daily stress' },
  { value: 'medium', label: 'Medium', emoji: '😐', description: 'Moderate stress, manageable most days' },
  { value: 'high', label: 'High', emoji: '😰', description: 'Frequently stressed, affects my sleep' },
];

const WAKEUP_CONDITIONS = [
  { value: 'energized', label: 'Energized', emoji: '⚡', description: 'I wake up ready to take on the day' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', description: 'It takes me a bit to fully wake up' },
  { value: 'tired', label: 'Tired', emoji: '😴', description: 'I often feel groggy in the morning' },
  { value: 'stiff', label: 'Stiff & Sore', emoji: '🦴', description: 'I wake up with aches and pains' },
];

export const ProfileWizard = ({ email, onComplete, loading }: ProfileWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sleepPosition, setSleepPosition] = useState<string>('');
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [temperature, setTemperature] = useState<string>('');
  const [stressLevel, setStressLevel] = useState<string>('');
  const [wakeupCondition, setWakeupCondition] = useState<string>('');

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const currentStepData = STEPS[currentStep];

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Welcome step - always can proceed
      case 1: return !!sleepPosition;
      case 2: return true; // Pain points optional
      case 3: return !!temperature;
      case 4: return !!stressLevel;
      case 5: return !!wakeupCondition;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    await onComplete({
      email,
      sleep_position: sleepPosition as any,
      pain_points: painPoints,
      temperature_preference: temperature as any,
      stress_level: stressLevel as any,
      wake_up_condition: wakeupCondition as any,
    });
  };

  const togglePainPoint = (point: string) => {
    setPainPoints(prev => 
      prev.includes(point) 
        ? prev.filter(p => p !== point)
        : [...prev, point]
    );
  };

  const OptionCard = ({ 
    selected, 
    onClick, 
    emoji, 
    label, 
    description 
  }: { 
    selected: boolean; 
    onClick: () => void; 
    emoji: string; 
    label: string; 
    description?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5",
        selected 
          ? "border-primary bg-primary/10 shadow-md" 
          : "border-border/50 bg-card/50"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <div className="font-medium">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          )}
        </div>
      </div>
    </button>
  );

  const CheckboxOption = ({
    checked,
    onChange,
    emoji,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    emoji: string;
    label: string;
  }) => (
    <button
      onClick={onChange}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5",
        checked 
          ? "border-primary bg-primary/10" 
          : "border-border/50 bg-card/50"
      )}
    >
      <Checkbox checked={checked} className="pointer-events-none" />
      <span className="text-lg">{emoji}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm max-w-2xl mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <currentStepData.icon className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
        <CardDescription className="text-base">{currentStepData.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="min-h-[280px]">
          {currentStep === 0 && (
            <div className="space-y-6 text-center py-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-left p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <div className="font-medium text-sm">Personalized recommendations</div>
                    <div className="text-xs text-muted-foreground">Based on your unique sleep patterns and preferences</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-2xl">📊</div>
                  <div>
                    <div className="font-medium text-sm">Track your progress</div>
                    <div className="text-xs text-muted-foreground">Quick daily check-ins to see what's working</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-2xl">⌚</div>
                  <div>
                    <div className="font-medium text-sm">Connect your wearable (optional)</div>
                    <div className="text-xs text-muted-foreground">Automatic sleep tracking from Garmin and more</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                For educational purposes only. Not medical advice.
              </p>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-3">
              {SLEEP_POSITIONS.map(option => (
                <OptionCard
                  key={option.value}
                  selected={sleepPosition === option.value}
                  onClick={() => setSleepPosition(option.value)}
                  emoji={option.emoji}
                  label={option.label}
                  description={option.description}
                />
              ))}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Select any areas where you experience pain or discomfort (optional)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PAIN_POINTS.map(option => (
                  <CheckboxOption
                    key={option.value}
                    checked={painPoints.includes(option.value)}
                    onChange={() => togglePainPoint(option.value)}
                    emoji={option.emoji}
                    label={option.label}
                  />
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-3">
              {TEMPERATURE_OPTIONS.map(option => (
                <OptionCard
                  key={option.value}
                  selected={temperature === option.value}
                  onClick={() => setTemperature(option.value)}
                  emoji={option.emoji}
                  label={option.label}
                  description={option.description}
                />
              ))}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-3">
              {STRESS_LEVELS.map(option => (
                <OptionCard
                  key={option.value}
                  selected={stressLevel === option.value}
                  onClick={() => setStressLevel(option.value)}
                  emoji={option.emoji}
                  label={option.label}
                  description={option.description}
                />
              ))}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-3">
              {WAKEUP_CONDITIONS.map(option => (
                <OptionCard
                  key={option.value}
                  selected={wakeupCondition === option.value}
                  onClick={() => setWakeupCondition(option.value)}
                  emoji={option.emoji}
                  label={option.label}
                  description={option.description}
                />
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete} 
              disabled={!canProceed() || loading}
              className="bg-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

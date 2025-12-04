import { useState } from "react";
import { SleepProfile } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2 } from "lucide-react";

interface ProfileFormProps {
  email: string;
  existingProfile?: SleepProfile | null;
  onSubmit: (profile: Partial<SleepProfile> & { email: string }) => Promise<SleepProfile | null>;
  loading?: boolean;
}

const PAIN_POINTS = [
  "Neck pain",
  "Shoulder pain",
  "Lower back pain",
  "Hip pain",
  "Headaches",
  "Stiffness",
  "Numbness/tingling",
];

export const ProfileForm = ({ email, existingProfile, onSubmit, loading }: ProfileFormProps) => {
  const [sleepPosition, setSleepPosition] = useState<string>(existingProfile?.sleep_position || "side");
  const [painPoints, setPainPoints] = useState<string[]>(existingProfile?.pain_points || []);
  const [temperaturePreference, setTemperaturePreference] = useState<string>(existingProfile?.temperature_preference || "neutral");
  const [stressLevel, setStressLevel] = useState<string>(existingProfile?.stress_level || "medium");
  const [wakeUpCondition, setWakeUpCondition] = useState<string>(existingProfile?.wake_up_condition || "neutral");

  const handlePainPointToggle = (point: string) => {
    setPainPoints(prev => 
      prev.includes(point) 
        ? prev.filter(p => p !== point)
        : [...prev, point]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      email,
      sleep_position: sleepPosition as any,
      pain_points: painPoints,
      temperature_preference: temperaturePreference as any,
      stress_level: stressLevel as any,
      wake_up_condition: wakeUpCondition as any,
    });
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5 text-primary" />
          {existingProfile ? "Update Profile" : "Create Sleep Profile"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Sleep Position</Label>
            <Select value={sleepPosition} onValueChange={setSleepPosition}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="side">🛏️ Side Sleeper</SelectItem>
                <SelectItem value="back">🔙 Back Sleeper</SelectItem>
                <SelectItem value="stomach">⬇️ Stomach Sleeper</SelectItem>
                <SelectItem value="mixed">🔄 Mixed/Changes Position</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Temperature Preference</Label>
            <Select value={temperaturePreference} onValueChange={setTemperaturePreference}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">❄️ Cold (like it cool)</SelectItem>
                <SelectItem value="neutral">😐 Neutral</SelectItem>
                <SelectItem value="warm">🔥 Warm (like it cozy)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Stress Level</Label>
            <Select value={stressLevel} onValueChange={setStressLevel}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">😌 Low</SelectItem>
                <SelectItem value="medium">😐 Medium</SelectItem>
                <SelectItem value="high">😰 High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>How do you typically wake up?</Label>
            <Select value={wakeUpCondition} onValueChange={setWakeUpCondition}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="energized">⚡ Energized</SelectItem>
                <SelectItem value="neutral">😐 Neutral</SelectItem>
                <SelectItem value="tired">😴 Tired</SelectItem>
                <SelectItem value="stiff">🦴 Stiff/Sore</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-3 block">Pain Points (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAIN_POINTS.map(point => (
                <div key={point} className="flex items-center space-x-2">
                  <Checkbox
                    id={point}
                    checked={painPoints.includes(point)}
                    onCheckedChange={() => handlePainPointToggle(point)}
                  />
                  <Label htmlFor={point} className="text-sm cursor-pointer">
                    {point}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {existingProfile ? "Update Profile" : "Create Profile"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

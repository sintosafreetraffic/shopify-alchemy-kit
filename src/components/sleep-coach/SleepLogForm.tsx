import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Sun, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SleepLogFormProps {
  email: string;
  onSubmit: (log: any) => Promise<boolean>;
  loading?: boolean;
}

export const SleepLogForm = ({ email, onSubmit, loading }: SleepLogFormProps) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [painLevel, setPainLevel] = useState(3);
  const [timeToSleep, setTimeToSleep] = useState<string>("");
  const [wakeUps, setWakeUps] = useState<string>("");
  const [feltHot, setFeltHot] = useState(false);
  const [feltStressed, setFeltStressed] = useState(false);
  const [notes, setNotes] = useState("");

  const handleDateChange = (newDate: string) => {
    // Validate date is not in the future
    if (newDate > today) {
      toast.error("Cannot log sleep for future dates");
      return;
    }
    setDate(newDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check date validation on submit
    if (date > today) {
      toast.error("Cannot log sleep for future dates");
      return;
    }
    
    const log = {
      email,
      date,
      sleep_quality: sleepQuality,
      pain_level_morning: painLevel,
      time_to_sleep_minutes: timeToSleep ? parseInt(timeToSleep) : null,
      wake_ups_per_night: wakeUps ? parseInt(wakeUps) : null,
      felt_hot: feltHot,
      felt_stressed: feltStressed,
      notes: notes || null,
      source: 'manual' as const,
    };

    const success = await onSubmit(log);
    if (success) {
      // Reset form
      setSleepQuality(5);
      setPainLevel(3);
      setTimeToSleep("");
      setWakeUps("");
      setFeltHot(false);
      setFeltStressed(false);
      setNotes("");
    }
  };

  const qualityLabels = ["Terrible", "Very Poor", "Poor", "Below Average", "Average", "Above Average", "Good", "Very Good", "Excellent", "Perfect"];
  const painLabels = ["None", "", "Mild", "", "Moderate", "", "Severe", "", "Very Severe", "", "Extreme"];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Moon className="h-5 w-5 text-primary" />
          Log Your Sleep
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => handleDateChange(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">You can only log sleep for today or past dates</p>
          </div>

          <div>
            <Label>Sleep Quality: {sleepQuality}/10 - {qualityLabels[sleepQuality - 1]}</Label>
            <div className="mt-3 px-2">
              <Slider
                value={[sleepQuality]}
                onValueChange={(v) => setSleepQuality(v[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span>😫 Poor</span>
              <span>😐 Average</span>
              <span>😴 Excellent</span>
            </div>
          </div>

          <div>
            <Label>Morning Pain Level: {painLevel}/10 - {painLabels[painLevel]}</Label>
            <div className="mt-3 px-2">
              <Slider
                value={[painLevel]}
                onValueChange={(v) => setPainLevel(v[0])}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span>No pain</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeToSleep">Minutes to Fall Asleep</Label>
              <Input
                id="timeToSleep"
                type="number"
                placeholder="e.g., 15"
                value={timeToSleep}
                onChange={(e) => setTimeToSleep(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="wakeUps">Wake-ups During Night</Label>
              <Input
                id="wakeUps"
                type="number"
                placeholder="e.g., 2"
                value={wakeUps}
                onChange={(e) => setWakeUps(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="feltHot"
                checked={feltHot}
                onCheckedChange={(checked) => setFeltHot(checked === true)}
              />
              <Label htmlFor="feltHot" className="text-sm cursor-pointer">
                🌡️ Felt too hot
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="feltStressed"
                checked={feltStressed}
                onCheckedChange={(checked) => setFeltStressed(checked === true)}
              />
              <Label htmlFor="feltStressed" className="text-sm cursor-pointer">
                😰 Felt stressed
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about your sleep..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 min-h-[80px]"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sun className="mr-2 h-4 w-4" />
                Log Sleep
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

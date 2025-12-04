import { SleepProfile } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Bed, Thermometer, Brain, Sun } from "lucide-react";

interface ProfileViewerProps {
  profile: SleepProfile | null;
}

export const ProfileViewer = ({ profile }: ProfileViewerProps) => {
  if (!profile) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-8 text-center text-muted-foreground">
          No profile found. Create one to get personalized recommendations.
        </CardContent>
      </Card>
    );
  }

  const positionIcons: Record<string, string> = {
    side: "🛏️ Side",
    back: "🔙 Back",
    stomach: "⬇️ Stomach",
    mixed: "🔄 Mixed",
  };

  const temperatureColors: Record<string, string> = {
    cold: "bg-blue-500/20 text-blue-700 border-blue-500/30",
    neutral: "bg-gray-500/20 text-gray-700 border-gray-500/30",
    warm: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  };

  const stressColors: Record<string, string> = {
    low: "bg-green-500/20 text-green-700 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    high: "bg-red-500/20 text-red-700 border-red-500/30",
  };

  const wakeUpColors: Record<string, string> = {
    energized: "bg-green-500/20 text-green-700 border-green-500/30",
    neutral: "bg-gray-500/20 text-gray-700 border-gray-500/30",
    tired: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    stiff: "bg-red-500/20 text-red-700 border-red-500/30",
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" />
          Sleep Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Bed className="h-3 w-3" /> Sleep Position
            </div>
            <div className="font-medium">{positionIcons[profile.sleep_position] || profile.sleep_position}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Thermometer className="h-3 w-3" /> Temperature
            </div>
            <Badge variant="outline" className={temperatureColors[profile.temperature_preference]}>
              {profile.temperature_preference.charAt(0).toUpperCase() + profile.temperature_preference.slice(1)}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Brain className="h-3 w-3" /> Stress Level
            </div>
            <Badge variant="outline" className={stressColors[profile.stress_level]}>
              {profile.stress_level.charAt(0).toUpperCase() + profile.stress_level.slice(1)}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Sun className="h-3 w-3" /> Wake Up Feeling
            </div>
            <Badge variant="outline" className={wakeUpColors[profile.wake_up_condition]}>
              {profile.wake_up_condition.charAt(0).toUpperCase() + profile.wake_up_condition.slice(1)}
            </Badge>
          </div>
        </div>

        {profile.pain_points && profile.pain_points.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-2">Pain Points</div>
            <div className="flex flex-wrap gap-2">
              {profile.pain_points.map((point, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {point}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <div>Member since: {new Date(profile.created_at).toLocaleDateString()}</div>
          {profile.purchase_count > 0 && (
            <div>Products purchased: {profile.purchase_count}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

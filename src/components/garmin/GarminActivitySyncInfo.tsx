/**
 * Garmin Activity Sync Info
 * Calm, reassuring messaging about activity sync status
 * No technical jargon, no urgency, premium trust
 */
import { Activity, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GarminActivitySyncInfoProps {
  isActivityEnabled: boolean;
  hasRecentActivity?: boolean;
}

export function GarminActivitySyncInfo({ 
  isActivityEnabled,
  hasRecentActivity = false 
}: GarminActivitySyncInfoProps) {
  // Don't show if activity is not enabled
  if (!isActivityEnabled) {
    return null;
  }

  return (
    <div className="space-y-3 border-t border-border/50 pt-4 mt-4">
      {/* Status Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Activity Sync</span>
        </div>
        <Badge variant="default" className="bg-green-600 gap-1">
          <CheckCircle className="h-3 w-3" />
          Connected
        </Badge>
      </div>

      {/* Explanation text */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        Activity history from before your connection can't be imported with this Garmin setup.
        New workouts will sync automatically from now on and will be used to gently refine your sleep guidance over time.
      </p>

      {/* Reassurance line */}
      <p className="text-xs text-muted-foreground/80">
        You don't need past data for effective coaching — your baseline builds naturally as you go.
      </p>

      {/* Optional micro-insight when data is flowing */}
      {hasRecentActivity && (
        <p className="text-xs text-muted-foreground/70 italic pt-1">
          On days with more intense activity, your body may benefit from extra wind-down time in the evening.
        </p>
      )}
    </div>
  );
}

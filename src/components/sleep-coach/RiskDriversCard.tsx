/**
 * RiskDriversCard - Displays risk analysis with actionable drivers
 * 
 * Shows the user's risk level with explainable factors.
 * Calm, non-alarming design that guides toward improvement.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Thermometer,
  Brain,
  Calendar,
  TrendingDown,
  Moon,
  Home
} from "lucide-react";

type RiskDriver = 
  | "pain_worsening"
  | "sleep_declining"
  | "low_engagement"
  | "high_churn_risk"
  | "temperature_sensitivity"
  | "stress_elevated"
  | "no_recent_logs"
  | "product_underutilized"
  | "environment_suboptimal";

type Level3 = "low" | "medium" | "high";

interface RiskAnalysis {
  level: Level3;
  score: number;
  drivers: RiskDriver[];
  rationale: string;
}

interface RiskDriversCardProps {
  riskAnalysis: RiskAnalysis | null;
}

const DRIVER_CONFIG: Record<RiskDriver, { 
  label: string; 
  icon: typeof AlertTriangle;
  actionHint: string;
}> = {
  pain_worsening: {
    label: "Pain Trending Up",
    icon: TrendingDown,
    actionHint: "Review pillow positioning",
  },
  sleep_declining: {
    label: "Sleep Quality Declining",
    icon: Moon,
    actionHint: "Check evening routine",
  },
  low_engagement: {
    label: "Low Engagement",
    icon: Calendar,
    actionHint: "Try logging more consistently",
  },
  high_churn_risk: {
    label: "Engagement Dropping",
    icon: AlertCircle,
    actionHint: "Reconnect with your routine",
  },
  temperature_sensitivity: {
    label: "Temperature Issues",
    icon: Thermometer,
    actionHint: "Optimize room temperature",
  },
  stress_elevated: {
    label: "Elevated Stress",
    icon: Brain,
    actionHint: "Try evening relaxation",
  },
  no_recent_logs: {
    label: "No Recent Tracking",
    icon: Calendar,
    actionHint: "Log your sleep tonight",
  },
  product_underutilized: {
    label: "Products Underused",
    icon: Home,
    actionHint: "Review product placement",
  },
  environment_suboptimal: {
    label: "Environment Issues",
    icon: Home,
    actionHint: "Optimize sleep space",
  },
};

export const RiskDriversCard = ({ riskAnalysis }: RiskDriversCardProps) => {
  if (!riskAnalysis) {
    return null;
  }
  
  const { level, drivers, rationale } = riskAnalysis;
  
  // Low risk = show success state
  if (level === "low" && drivers.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <div className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                All Clear
              </div>
              <div className="text-xs text-muted-foreground">
                No significant risk factors detected
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const levelConfig = {
    low: {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/5 border-amber-500/20",
      icon: AlertCircle,
      label: "Minor Attention",
    },
    medium: {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      icon: AlertCircle,
      label: "Needs Attention",
    },
    high: {
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/30",
      icon: AlertTriangle,
      label: "Priority Attention",
    },
  };
  
  const config = levelConfig[level];
  const LevelIcon = config.icon;

  return (
    <Card className={`${config.bg}`}>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className={`flex items-center gap-2 ${config.color}`}>
            <LevelIcon className="h-4 w-4" />
            {config.label}
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            {drivers.length} factor{drivers.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-4 space-y-3">
        {/* Rationale */}
        <p className="text-xs text-muted-foreground">
          {rationale}
        </p>
        
        {/* Driver Pills */}
        {drivers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {drivers.slice(0, 3).map((driver) => {
              const driverConfig = DRIVER_CONFIG[driver];
              const DriverIcon = driverConfig.icon;
              
              return (
                <div
                  key={driver}
                  className="flex items-center gap-1.5 text-xs bg-background/50 rounded-full px-2.5 py-1 border border-border/50"
                >
                  <DriverIcon className="h-3 w-3 text-muted-foreground" />
                  <span>{driverConfig.label}</span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Top Action Hint */}
        {drivers.length > 0 && (
          <div className="text-xs text-muted-foreground italic pt-1">
            💡 Tip: {DRIVER_CONFIG[drivers[0]].actionHint}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

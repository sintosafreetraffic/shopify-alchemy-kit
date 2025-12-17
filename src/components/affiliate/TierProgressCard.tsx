import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Award, Star, Crown, Gem, Shield } from "lucide-react";

interface TierInfo {
  tier: string;
  commissionRate: number;
  nextTier: string | null;
  salesNeeded: number;
}

interface TierProgressCardProps {
  tierInfo: TierInfo;
  directSalesLast30: number;
  track?: string | null;
}

// Monoline tier icons - no emojis
const tierIcons: Record<string, React.ElementType> = {
  bronze: Shield,
  silver: Award,
  gold: Star,
  platinum: Gem,
  diamond: Crown,
};

// Tier styling with semantic tokens
const tierStyles: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  bronze: {
    bg: "bg-amber-50/50",
    border: "border-amber-200/60",
    text: "text-amber-800",
    accent: "text-amber-600",
  },
  silver: {
    bg: "bg-slate-50/50",
    border: "border-slate-200/60",
    text: "text-slate-700",
    accent: "text-slate-500",
  },
  gold: {
    bg: "bg-yellow-50/50",
    border: "border-yellow-200/60",
    text: "text-yellow-800",
    accent: "text-yellow-600",
  },
  platinum: {
    bg: "bg-slate-100/50",
    border: "border-slate-300/60",
    text: "text-slate-800",
    accent: "text-slate-600",
  },
  diamond: {
    bg: "bg-sky-50/50",
    border: "border-sky-200/60",
    text: "text-sky-800",
    accent: "text-sky-600",
  },
};

const allTiers = [
  { name: "bronze", displayName: "Bronze", rate: 10, threshold: 0 },
  { name: "silver", displayName: "Silver", rate: 15, threshold: 10 },
  { name: "gold", displayName: "Gold", rate: 20, threshold: 25 },
  { name: "platinum", displayName: "Platinum", rate: 25, threshold: 50 },
  { name: "diamond", displayName: "Diamond", rate: 35, threshold: null },
];

export function TierProgressCard({ tierInfo, directSalesLast30, track }: TierProgressCardProps) {
  const currentStyle = tierStyles[tierInfo.tier] || tierStyles.bronze;
  const CurrentIcon = tierIcons[tierInfo.tier] || Shield;

  const formatTierName = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getProgressToNextTier = () => {
    if (tierInfo.tier === "diamond" || tierInfo.tier === "platinum") return 100;
    const thresholds: Record<string, number> = { bronze: 10, silver: 25, gold: 50 };
    const currentThreshold = thresholds[tierInfo.tier] || 10;
    const prevThreshold = tierInfo.tier === "bronze" ? 0 : tierInfo.tier === "silver" ? 10 : 25;
    const progress = ((directSalesLast30 - prevThreshold) / (currentThreshold - prevThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const trackLabel = track === "partner" ? "Partner" : track === "ambassador" ? "Ambassador" : "Affiliate";

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Tier Progress
          </CardTitle>
          {track && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {trackLabel}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Tier Badge */}
        <div className={`flex items-center gap-3 p-4 rounded-xl ${currentStyle.bg} border ${currentStyle.border}`}>
          <div className={`p-2 rounded-lg bg-background/80 ${currentStyle.accent}`}>
            <CurrentIcon className="h-6 w-6" />
          </div>
          <div>
            <p className={`font-semibold ${currentStyle.text}`}>
              {formatTierName(tierInfo.tier)} Tier
            </p>
            <p className="text-sm text-muted-foreground">
              {tierInfo.commissionRate}% commission rate
            </p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {tierInfo.nextTier && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{formatTierName(tierInfo.tier)}</span>
              <span className="text-muted-foreground">{formatTierName(tierInfo.nextTier)}</span>
            </div>
            <Progress value={getProgressToNextTier()} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {tierInfo.salesNeeded > 0
                ? `${tierInfo.salesNeeded} more sales needed for ${formatTierName(tierInfo.nextTier)}`
                : `You've reached ${formatTierName(tierInfo.tier)} tier`}
            </p>
          </div>
        )}

        {/* All Tiers Overview */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground/80">All Tiers</p>
          <div className="space-y-1.5">
            {allTiers.map((tier) => {
              const TierIcon = tierIcons[tier.name];
              const style = tierStyles[tier.name];
              const isActive = tierInfo.tier === tier.name;

              return (
                <div
                  key={tier.name}
                  className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                    isActive ? `${style.bg} border ${style.border}` : "bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TierIcon className={`h-4 w-4 ${isActive ? style.accent : "text-muted-foreground"}`} />
                    <span className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                      {tier.displayName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${isActive ? style.text : "text-muted-foreground"}`}>
                      {tier.rate}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      {tier.threshold === null ? "(invite)" : tier.threshold === 0 ? "(default)" : `(${tier.threshold}+)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

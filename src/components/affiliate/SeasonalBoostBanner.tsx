/**
 * SeasonalBoostBanner Component
 * 
 * Displays active promotional campaigns with boosted commission rates.
 * Framework for seasonal/campaign-based commission multipliers.
 * 
 * Banner only appears when an active campaign exists.
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, X, Gift, Percent, ChevronRight } from "lucide-react";
import { differenceInHours, differenceInDays, format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  description: string;
  boost_percentage: number; // e.g., 20 for +20% boost
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  theme: "holiday" | "launch" | "flash" | "milestone";
}

interface SeasonalBoostBannerProps {
  affiliateTier: string;
  baseCommissionRate: number;
  className?: string;
}

// Mock campaigns - in production, fetch from DB or app_settings
function getActiveCampaigns(): Campaign[] {
  const now = new Date();
  
  // Example campaigns - would come from database
  const campaigns: Campaign[] = [
    // Uncomment to test:
    // {
    //   id: "winter-2025",
    //   name: "Winter Wellness Week",
    //   description: "Bonus commissions on all sleep products",
    //   boost_percentage: 25,
    //   starts_at: "2025-01-10T00:00:00Z",
    //   ends_at: "2025-01-17T23:59:59Z",
    //   is_active: true,
    //   theme: "holiday",
    // },
  ];
  
  // Filter to only active campaigns within date range
  return campaigns.filter((c) => {
    const start = new Date(c.starts_at);
    const end = new Date(c.ends_at);
    return c.is_active && now >= start && now <= end;
  });
}

function getThemeStyles(theme: Campaign["theme"]) {
  switch (theme) {
    case "holiday":
      return {
        bg: "bg-gradient-to-r from-red-50 to-green-50",
        border: "border-red-200/60",
        accent: "text-red-600",
        icon: Gift,
      };
    case "launch":
      return {
        bg: "bg-gradient-to-r from-purple-50 to-blue-50",
        border: "border-purple-200/60",
        accent: "text-purple-600",
        icon: Sparkles,
      };
    case "flash":
      return {
        bg: "bg-gradient-to-r from-amber-50 to-orange-50",
        border: "border-amber-200/60",
        accent: "text-amber-600",
        icon: Clock,
      };
    case "milestone":
      return {
        bg: "bg-gradient-to-r from-blue-50 to-sky-50",
        border: "border-blue-200/60",
        accent: "text-blue-600",
        icon: Percent,
      };
    default:
      return {
        bg: "bg-primary/5",
        border: "border-primary/20",
        accent: "text-primary",
        icon: Sparkles,
      };
  }
}

function formatTimeRemaining(endsAt: string): string {
  const end = new Date(endsAt);
  const now = new Date();
  
  const hoursRemaining = differenceInHours(end, now);
  
  if (hoursRemaining < 1) {
    return "Ending soon";
  }
  if (hoursRemaining < 24) {
    return `${hoursRemaining}h left`;
  }
  
  const daysRemaining = differenceInDays(end, now);
  return `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left`;
}

export function SeasonalBoostBanner({
  affiliateTier,
  baseCommissionRate,
  className,
}: SeasonalBoostBannerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCampaigns(getActiveCampaigns());
  }, []);

  // Filter out dismissed campaigns
  const visibleCampaigns = campaigns.filter((c) => !dismissed.has(c.id));

  if (visibleCampaigns.length === 0) {
    return null;
  }

  const handleDismiss = (campaignId: string) => {
    setDismissed((prev) => new Set([...prev, campaignId]));
    // Optionally persist to localStorage
    sessionStorage.setItem(`dismissed_campaign_${campaignId}`, "true");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {visibleCampaigns.map((campaign) => {
        const theme = getThemeStyles(campaign.theme);
        const ThemeIcon = theme.icon;
        const boostedRate = baseCommissionRate + (baseCommissionRate * campaign.boost_percentage) / 100;
        const timeRemaining = formatTimeRemaining(campaign.ends_at);

        return (
          <Card
            key={campaign.id}
            className={`${theme.bg} ${theme.border} border overflow-hidden`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`p-2 rounded-lg bg-background/80 shrink-0 ${theme.accent}`}>
                  <ThemeIcon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-background/80 ${theme.accent}`}>
                      +{campaign.boost_percentage}% BOOST
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{campaign.description}</p>
                  
                  {/* Rate display */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Your rate:</span>
                      <span className="line-through text-muted-foreground/60">{baseCommissionRate}%</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className={`font-bold ${theme.accent}`}>{boostedRate.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {timeRemaining}
                    </div>
                  </div>
                </div>

                {/* Dismiss button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDismiss(campaign.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

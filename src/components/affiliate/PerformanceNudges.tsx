/**
 * PerformanceNudges Component
 * 
 * Smart nudges to encourage affiliates based on their current state:
 * - Close to next tier
 * - Sales streak notifications
 * - Inactivity recovery
 * - First sale encouragement
 * 
 * Subtle, premium, non-intrusive design.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Flame, Target, Award, Sparkles, ArrowRight, Share2 } from "lucide-react";

interface PerformanceNudgesProps {
  tier: string;
  nextTier: string | null;
  salesNeeded: number;
  directSalesLast30: number;
  hasFirstSale: boolean;
  lastSaleDate: string | null;
  onCopyLink: () => void;
}

type NudgeType = 'close_to_tier' | 'inactive' | 'no_sales' | 'streak' | 'celebrate';

interface Nudge {
  type: NudgeType;
  priority: number;
  Icon: React.ElementType;
  title: string;
  message: string;
  cta?: {
    label: string;
    onClick?: () => void;
  };
  style: {
    bg: string;
    border: string;
    iconColor: string;
  };
}

export function PerformanceNudges({
  tier,
  nextTier,
  salesNeeded,
  directSalesLast30,
  hasFirstSale,
  lastSaleDate,
  onCopyLink,
}: PerformanceNudgesProps) {
  const nudges: Nudge[] = [];

  // Calculate days since last sale
  const daysSinceLastSale = lastSaleDate 
    ? Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Nudge 1: Close to next tier (within 3 sales)
  if (nextTier && salesNeeded > 0 && salesNeeded <= 3) {
    nudges.push({
      type: 'close_to_tier',
      priority: 1,
      Icon: Award,
      title: `${salesNeeded} sale${salesNeeded === 1 ? '' : 's'} to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}`,
      message: `You're almost there! Reach ${nextTier} tier for higher commission rates.`,
      cta: {
        label: "Share your link",
        onClick: onCopyLink,
      },
      style: {
        bg: 'bg-amber-50/80',
        border: 'border-amber-200/60',
        iconColor: 'text-amber-600',
      },
    });
  }

  // Nudge 2: No first sale yet
  if (!hasFirstSale) {
    nudges.push({
      type: 'no_sales',
      priority: 2,
      Icon: Target,
      title: "Get your first sale",
      message: "Share your referral link to start earning commissions. The first sale is the hardest—you've got this!",
      cta: {
        label: "Copy referral link",
        onClick: onCopyLink,
      },
      style: {
        bg: 'bg-blue-50/80',
        border: 'border-blue-200/60',
        iconColor: 'text-blue-600',
      },
    });
  }

  // Nudge 3: Inactive (no sales in 14+ days but has sold before)
  if (hasFirstSale && daysSinceLastSale && daysSinceLastSale >= 14) {
    nudges.push({
      type: 'inactive',
      priority: 3,
      Icon: Sparkles,
      title: "Time to reconnect",
      message: `It's been ${daysSinceLastSale} days since your last sale. Re-share your link to get back on track.`,
      cta: {
        label: "Share your link",
        onClick: onCopyLink,
      },
      style: {
        bg: 'bg-slate-50/80',
        border: 'border-slate-200/60',
        iconColor: 'text-slate-600',
      },
    });
  }

  // Nudge 4: On a streak (3+ sales in last 7 days approximation)
  if (directSalesLast30 >= 10 && daysSinceLastSale !== null && daysSinceLastSale < 3) {
    nudges.push({
      type: 'streak',
      priority: 4,
      Icon: Flame,
      title: "You're on fire!",
      message: "Keep the momentum going. Your consistent effort is paying off.",
      style: {
        bg: 'bg-orange-50/80',
        border: 'border-orange-200/60',
        iconColor: 'text-orange-600',
      },
    });
  }

  // Sort by priority and show only the top nudge
  const sortedNudges = nudges.sort((a, b) => a.priority - b.priority);
  const topNudge = sortedNudges[0];

  if (!topNudge) return null;

  return (
    <Card className={`border ${topNudge.style.border} ${topNudge.style.bg}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-background/80 ${topNudge.style.iconColor}`}>
            <topNudge.Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{topNudge.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{topNudge.message}</p>
            {topNudge.cta && (
              <Button
                size="sm"
                variant="ghost"
                onClick={topNudge.cta.onClick}
                className="mt-2 h-8 text-xs gap-1"
              >
                <Share2 className="h-3 w-3" />
                {topNudge.cta.label}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

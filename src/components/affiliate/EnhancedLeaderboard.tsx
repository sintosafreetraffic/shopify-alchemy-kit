/**
 * EnhancedLeaderboard Component
 * 
 * Premium leaderboard with monthly/all-time toggle,
 * streak indicators, and visual hierarchy.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Flame, Crown, Medal, Award, Shield, Star, Gem, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  display_label: string;
  tier: string;
  monthly_sales_count: number;
  monthly_revenue_generated: number;
  total_commissions: number;
  is_current_user: boolean;
  streak_days?: number;
}

interface EnhancedLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  loading?: boolean;
  className?: string;
}

const tierConfig: Record<string, { color: string; bgColor: string; Icon: React.ElementType }> = {
  bronze: { color: "text-amber-700", bgColor: "bg-amber-50", Icon: Shield },
  silver: { color: "text-slate-600", bgColor: "bg-slate-50", Icon: Award },
  gold: { color: "text-yellow-700", bgColor: "bg-yellow-50", Icon: Star },
  platinum: { color: "text-slate-700", bgColor: "bg-slate-100", Icon: Gem },
  diamond: { color: "text-sky-700", bgColor: "bg-sky-50", Icon: Crown },
};

function getRankIcon(rank: number) {
  if (rank === 1) return { Icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-100" };
  if (rank === 2) return { Icon: Medal, color: "text-slate-400", bg: "bg-slate-100" };
  if (rank === 3) return { Icon: Medal, color: "text-amber-600", bg: "bg-amber-100" };
  return null;
}

function formatTierName(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function EnhancedLeaderboard({
  leaderboard,
  loading = false,
  className,
}: EnhancedLeaderboardProps) {
  const [view, setView] = useState<"monthly" | "alltime">("monthly");

  // Sort by monthly revenue for monthly view, total commissions for all-time
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (view === "monthly") {
      return b.monthly_revenue_generated - a.monthly_revenue_generated;
    }
    return b.total_commissions - a.total_commissions;
  });

  // Re-rank based on current view
  const rankedLeaderboard = sortedLeaderboard.map((entry, index) => ({
    ...entry,
    displayRank: index + 1,
  }));

  // Find current user's position
  const currentUserEntry = rankedLeaderboard.find((e) => e.is_current_user);
  const currentUserRank = currentUserEntry?.displayRank;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-muted-foreground">No leaderboard data available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Leaderboard
          </CardTitle>
          {currentUserRank && (
            <div className="text-sm text-muted-foreground">
              Your rank: <span className="font-semibold text-foreground">#{currentUserRank}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as "monthly" | "alltime")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="monthly" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </TabsTrigger>
            <TabsTrigger value="alltime" className="gap-2">
              <Trophy className="h-4 w-4" />
              All Time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-0">
            <LeaderboardList entries={rankedLeaderboard} metric="revenue" />
          </TabsContent>

          <TabsContent value="alltime" className="mt-0">
            <LeaderboardList entries={rankedLeaderboard} metric="commissions" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface LeaderboardListProps {
  entries: (LeaderboardEntry & { displayRank: number })[];
  metric: "revenue" | "commissions";
}

function LeaderboardList({ entries, metric }: LeaderboardListProps) {
  // Show top 10 only
  const displayEntries = entries.slice(0, 10);

  return (
    <div className="space-y-2">
      {displayEntries.map((entry) => {
        const rankInfo = getRankIcon(entry.displayRank);
        const tierInfo = tierConfig[entry.tier] || tierConfig.bronze;
        const TierIcon = tierInfo.Icon;

        return (
          <div
            key={entry.displayRank}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              entry.is_current_user
                ? "bg-primary/5 border border-primary/20"
                : "bg-muted/30 hover:bg-muted/50"
            )}
          >
            {/* Rank */}
            <div className="w-10 shrink-0">
              {rankInfo ? (
                <div className={`w-8 h-8 rounded-full ${rankInfo.bg} flex items-center justify-center`}>
                  <rankInfo.Icon className={`h-4 w-4 ${rankInfo.color}`} />
                </div>
              ) : (
                <span className="text-sm font-medium text-muted-foreground pl-2">
                  #{entry.displayRank}
                </span>
              )}
            </div>

            {/* Partner Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("font-medium truncate", entry.is_current_user && "text-primary")}>
                  {entry.display_label}
                </span>
                {entry.is_current_user && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>
                )}
                {entry.streak_days && entry.streak_days >= 3 && (
                  <span className="flex items-center gap-1 text-xs text-orange-600">
                    <Flame className="h-3 w-3" />
                    {entry.streak_days}d
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 text-xs ${tierInfo.color}`}>
                  <TierIcon className="h-3 w-3" />
                  {formatTierName(entry.tier)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.monthly_sales_count} sales this month
                </span>
              </div>
            </div>

            {/* Value */}
            <div className="text-right shrink-0">
              <p className="font-semibold">
                $
                {metric === "revenue"
                  ? entry.monthly_revenue_generated.toFixed(0)
                  : entry.total_commissions.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {metric === "revenue" ? "revenue" : "earned"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

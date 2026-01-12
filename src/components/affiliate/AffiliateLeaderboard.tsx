/**
 * AffiliateLeaderboard Component
 * 
 * Enhanced leaderboard with:
 * - Top 10 ranking by 30-day revenue
 * - Streak indicators (consecutive days with sales)
 * - Tier badges with premium styling
 * - Current user highlight
 * - Trophy animations for top 3
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Shield, Award, Star, Gem, Crown, Loader2, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface AffiliateLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  currentUserRank?: number;
}

const tierConfig: Record<string, { color: string; bgColor: string; Icon: React.ElementType }> = {
  'bronze': { color: 'text-amber-700', bgColor: 'bg-amber-50', Icon: Shield },
  'silver': { color: 'text-slate-600', bgColor: 'bg-slate-50', Icon: Award },
  'gold': { color: 'text-yellow-700', bgColor: 'bg-yellow-50', Icon: Star },
  'platinum': { color: 'text-slate-700', bgColor: 'bg-slate-100', Icon: Gem },
  'diamond': { color: 'text-sky-700', bgColor: 'bg-sky-50', Icon: Crown },
};

function formatTierName(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shadow-sm">
          <Trophy className="h-4 w-4 text-yellow-900" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center shadow-sm">
        <span className="text-sm font-bold text-slate-700">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center shadow-sm">
        <span className="text-sm font-bold text-amber-800">3</span>
      </div>
    );
  }
  return (
    <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
  );
}

function StreakIndicator({ days }: { days: number }) {
  if (!days || days < 2) return null;
  
  const intensity = Math.min(days, 7);
  const color = intensity >= 7 ? 'text-orange-500' : 
                intensity >= 4 ? 'text-amber-500' : 'text-yellow-500';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${color}`}>
            <Flame className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{days}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-medium">{days}-day streak!</p>
          <p className="text-xs text-muted-foreground">Consecutive days with sales</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AffiliateLeaderboard({ entries, loading, currentUserRank }: AffiliateLeaderboardProps) {
  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Leaderboard
          </CardTitle>
          {currentUserRank && currentUserRank > 10 && (
            <Badge variant="secondary" className="text-xs">
              Your rank: #{currentUserRank}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Top partners by 30-day revenue</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No leaderboard data available yet.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Start sharing to climb the ranks!</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="hidden sm:table-cell">Tier</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Streak</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => {
                  const TierIcon = tierConfig[entry.tier]?.Icon || Shield;
                  const isCurrentUser = entry.is_current_user;
                  
                  return (
                    <TableRow 
                      key={entry.rank} 
                      className={`
                        transition-colors
                        ${isCurrentUser ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
                        ${index === 0 ? 'bg-yellow-50/30' : ''}
                      `}
                    >
                      <TableCell className="font-medium">
                        <RankBadge rank={entry.rank} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={isCurrentUser ? 'font-semibold' : ''}>
                            {entry.display_label}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                              You
                            </Badge>
                          )}
                          {/* Mobile streak indicator */}
                          <div className="sm:hidden">
                            <StreakIndicator days={entry.streak_days || 0} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${tierConfig[entry.tier]?.bgColor || 'bg-secondary'} ${tierConfig[entry.tier]?.color || ''}`}>
                          <TierIcon className="h-3 w-3" />
                          {formatTierName(entry.tier)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <StreakIndicator days={entry.streak_days || 0} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold">
                            ${entry.monthly_revenue_generated.toFixed(0)}
                          </span>
                          {entry.rank <= 3 && (
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AffiliateLeaderboard;

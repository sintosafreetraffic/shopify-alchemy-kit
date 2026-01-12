/**
 * MilestoneBadges Component
 * 
 * Gamification layer for affiliate program.
 * Shows earned badges, progress toward next milestones, and tier progress.
 * 
 * Badges:
 * - First Sale: First commission earned
 * - Rising Star: 10 sales
 * - Top Performer: 50 sales
 * - Legend: 100 sales
 * - Content Creator: First UGC approved
 * - Team Builder: First sub-affiliate sale
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Rocket, Crown, Camera, Users, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MilestoneBadge {
  id: string;
  name: string;
  description: string;
  Icon: React.ElementType;
  color: string;
  bgColor: string;
  requirement: number | boolean;
  current: number | boolean;
  isUnlocked: boolean;
}

interface MilestoneBadgesProps {
  totalSales: number;
  hasFirstSale: boolean;
  hasUGCApproved: boolean;
  hasSubAffiliateSale: boolean;
  tier: string;
  tierProgress: number;
  nextTier: string | null;
  salesNeededForNextTier: number;
}

export function MilestoneBadges({
  totalSales,
  hasFirstSale,
  hasUGCApproved,
  hasSubAffiliateSale,
  tier,
  tierProgress,
  nextTier,
  salesNeededForNextTier,
}: MilestoneBadgesProps) {
  const badges: MilestoneBadge[] = [
    {
      id: "first_sale",
      name: "First Sale",
      description: "Earned your first commission",
      Icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      requirement: 1,
      current: totalSales,
      isUnlocked: hasFirstSale,
    },
    {
      id: "rising_star",
      name: "Rising Star",
      description: "Reached 10 sales",
      Icon: Rocket,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      requirement: 10,
      current: totalSales,
      isUnlocked: totalSales >= 10,
    },
    {
      id: "top_performer",
      name: "Top Performer",
      description: "Reached 50 sales",
      Icon: Trophy,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      requirement: 50,
      current: totalSales,
      isUnlocked: totalSales >= 50,
    },
    {
      id: "legend",
      name: "Legend",
      description: "Reached 100 sales",
      Icon: Crown,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      requirement: 100,
      current: totalSales,
      isUnlocked: totalSales >= 100,
    },
    {
      id: "content_creator",
      name: "Creator",
      description: "First content approved",
      Icon: Camera,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      requirement: true,
      current: hasUGCApproved,
      isUnlocked: hasUGCApproved,
    },
    {
      id: "team_builder",
      name: "Team Builder",
      description: "Earned from sub-affiliate",
      Icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
      requirement: true,
      current: hasSubAffiliateSale,
      isUnlocked: hasSubAffiliateSale,
    },
  ];

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  // Find next milestone badge to unlock
  const nextSalesBadge = badges.find(
    (b) => typeof b.requirement === "number" && !b.isUnlocked
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg font-medium">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Achievements
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {unlockedCount}/{badges.length} unlocked
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Badge grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <TooltipProvider>
            {badges.map((badge) => (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`relative flex flex-col items-center p-3 rounded-xl border transition-all ${
                      badge.isUnlocked
                        ? `${badge.bgColor} border-transparent`
                        : "bg-muted/30 border-border/50 opacity-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        badge.isUnlocked ? badge.bgColor : "bg-muted"
                      }`}
                    >
                      {badge.isUnlocked ? (
                        <badge.Icon className={`h-5 w-5 ${badge.color}`} />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium mt-2 text-center ${
                        badge.isUnlocked ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {badge.name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {typeof badge.requirement === "number" && !badge.isUnlocked && (
                    <p className="text-xs mt-1">
                      {badge.current as number}/{badge.requirement} sales
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Next milestone progress */}
        {nextSalesBadge && typeof nextSalesBadge.requirement === "number" && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                Next: <span className="font-medium text-foreground">{nextSalesBadge.name}</span>
              </span>
              <span className="font-medium">
                {totalSales}/{nextSalesBadge.requirement}
              </span>
            </div>
            <Progress
              value={(totalSales / nextSalesBadge.requirement) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Tier progress */}
        {nextTier && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                Tier: <span className="font-medium text-foreground capitalize">{tier}</span> →{" "}
                <span className="capitalize">{nextTier}</span>
              </span>
              <span className="font-medium">
                {salesNeededForNextTier > 0 ? `${salesNeededForNextTier} to go` : "Reached!"}
              </span>
            </div>
            <Progress value={tierProgress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

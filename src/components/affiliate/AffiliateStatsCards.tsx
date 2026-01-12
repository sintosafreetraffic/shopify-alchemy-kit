/**
 * AffiliateStatsCards Component
 * 
 * Premium stat cards with subtle animations and clear hierarchy.
 * Designed for instant comprehension of key metrics.
 */

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Package, TrendingUp, Users, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCard {
  label: string;
  value: string | number;
  subValue?: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface AffiliateStatsCardsProps {
  totalEarnings: number;
  totalReferrals: number;
  monthlySales: number;
  subAffiliatesCount: number;
  pendingCommissions?: number;
  streakDays?: number;
}

export function AffiliateStatsCards({
  totalEarnings,
  totalReferrals,
  monthlySales,
  subAffiliatesCount,
  pendingCommissions = 0,
  streakDays = 0,
}: AffiliateStatsCardsProps) {
  const stats: StatCard[] = [
    {
      label: "Total Earnings",
      value: `$${totalEarnings.toFixed(2)}`,
      subValue: pendingCommissions > 0 ? `$${pendingCommissions.toFixed(2)} pending` : undefined,
      Icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      label: "Total Referrals",
      value: totalReferrals,
      Icon: Package,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "30-Day Sales",
      value: monthlySales,
      subValue: streakDays > 2 ? `${streakDays}-day streak 🔥` : undefined,
      Icon: TrendingUp,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      label: "Sub-Affiliates",
      value: subAffiliatesCount,
      subValue: subAffiliatesCount > 0 ? "5% on their sales" : undefined,
      Icon: Users,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border border-border/50 hover:border-border/80 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-full shrink-0", stat.iconBg)}>
                <stat.Icon className={cn("h-5 w-5", stat.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                {stat.subValue && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.subValue}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

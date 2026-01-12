/**
 * MonthlyDigestPreview Component
 * 
 * Shows a preview of what the monthly email digest will contain.
 * Helps affiliates understand their monthly performance at a glance.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, TrendingUp, TrendingDown, Minus, Calendar, DollarSign, Users, Target } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface MonthlyDigestPreviewProps {
  currentMonthEarnings: number;
  lastMonthEarnings: number;
  currentMonthSales: number;
  lastMonthSales: number;
  subAffiliateCount: number;
  tier: string;
  commissionRate: number;
  className?: string;
}

function getChangeIndicator(current: number, previous: number) {
  if (previous === 0 && current > 0) {
    return { Icon: TrendingUp, color: "text-green-600", label: "New!" };
  }
  if (previous === 0) {
    return { Icon: Minus, color: "text-muted-foreground", label: "—" };
  }
  
  const change = ((current - previous) / previous) * 100;
  
  if (change > 5) {
    return { Icon: TrendingUp, color: "text-green-600", label: `+${change.toFixed(0)}%` };
  }
  if (change < -5) {
    return { Icon: TrendingDown, color: "text-red-500", label: `${change.toFixed(0)}%` };
  }
  return { Icon: Minus, color: "text-muted-foreground", label: "Stable" };
}

export function MonthlyDigestPreview({
  currentMonthEarnings,
  lastMonthEarnings,
  currentMonthSales,
  lastMonthSales,
  subAffiliateCount,
  tier,
  commissionRate,
  className,
}: MonthlyDigestPreviewProps) {
  const now = new Date();
  const monthName = format(now, "MMMM yyyy");
  const lastMonth = format(subMonths(now, 1), "MMMM");
  
  const earningsChange = getChangeIndicator(currentMonthEarnings, lastMonthEarnings);
  const salesChange = getChangeIndicator(currentMonthSales, lastMonthSales);

  return (
    <Card className={`border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Mail className="h-5 w-5 text-muted-foreground" />
          Monthly Summary
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Preview of your {monthName} performance
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Earnings */}
          <div className="p-4 rounded-lg bg-green-50/50 border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded bg-green-100">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div className={`flex items-center gap-1 text-xs ${earningsChange.color}`}>
                <earningsChange.Icon className="h-3 w-3" />
                {earningsChange.label}
              </div>
            </div>
            <p className="text-2xl font-bold text-green-700">
              ${currentMonthEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Earnings this month
            </p>
          </div>

          {/* Sales */}
          <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded bg-blue-100">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <div className={`flex items-center gap-1 text-xs ${salesChange.color}`}>
                <salesChange.Icon className="h-3 w-3" />
                {salesChange.label}
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {currentMonthSales}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sales this month
            </p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold capitalize">{tier}</p>
            <p className="text-xs text-muted-foreground">Tier</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{commissionRate}%</p>
            <p className="text-xs text-muted-foreground">Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{subAffiliateCount}</p>
            <p className="text-xs text-muted-foreground">Sub-affiliates</p>
          </div>
        </div>

        {/* Comparison note */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-muted-foreground">
            vs. {lastMonth}: ${lastMonthEarnings.toFixed(2)} earnings, {lastMonthSales} sales
          </p>
        </div>

        {/* Email timing note */}
        <p className="text-xs text-muted-foreground text-center">
          Your full monthly digest is sent on the 1st of each month
        </p>
      </CardContent>
    </Card>
  );
}

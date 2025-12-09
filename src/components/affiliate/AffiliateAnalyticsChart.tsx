// Performance: Lazy-loaded chart component for affiliate analytics
// Uses Recharts - loaded on demand to reduce initial bundle size
import { memo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";

interface DailyAnalytics {
  date: string;
  sales_count: number;
  commission_amount: number;
}

interface AnalyticsTotals {
  total_30d_sales: number;
  total_30d_commissions: number;
}

interface AffiliateAnalyticsChartProps {
  daily: DailyAnalytics[];
  totals: AnalyticsTotals;
}

const AffiliateAnalyticsChart = memo(function AffiliateAnalyticsChart({ 
  daily, 
  totals 
}: AffiliateAnalyticsChartProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">30-Day Sales</p>
          <p className="text-2xl font-bold">{totals.total_30d_sales}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">30-Day Commissions</p>
          <p className="text-2xl font-bold">${totals.total_30d_commissions.toFixed(2)}</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => format(parseISO(value), 'MM/dd')}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              labelFormatter={(value) => format(parseISO(value as string), 'MMM d, yyyy')}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Commission']}
            />
            <Area 
              type="monotone" 
              dataKey="commission_amount" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
});

export default AffiliateAnalyticsChart;

/**
 * WhyThisPlanCard - Explains why the current plan was generated
 * 
 * Displays:
 * - Plan headline (AI-generated)
 * - Rationale connecting identity + environment + state
 * - Refresh reason context when applicable
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, RefreshCw, TrendingDown, ThermometerSun, Target } from "lucide-react";
import { REFRESH_REASON_TONES, type RefreshReason } from "@/types/coach-plan";

interface WhyThisPlanCardProps {
  planHeadline?: string;
  whyThisPlan?: string;
  refreshReason?: RefreshReason | string;
  generatedAt: string;
}

const REASON_ICONS: Record<string, React.ReactNode> = {
  trend_worsening: <TrendingDown className="h-4 w-4" />,
  pain_increased: <ThermometerSun className="h-4 w-4" />,
  quality_declined: <TrendingDown className="h-4 w-4" />,
  expired: <RefreshCw className="h-4 w-4" />,
  manual: <Target className="h-4 w-4" />,
};

export function WhyThisPlanCard({
  planHeadline,
  whyThisPlan,
  refreshReason,
  generatedAt,
}: WhyThisPlanCardProps) {
  // Get refresh context if available
  const reasonKey = refreshReason as RefreshReason;
  const refreshContext = reasonKey && REFRESH_REASON_TONES[reasonKey];
  
  // Format date
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Default headline if not provided
  const headline = planHeadline || "Your 7-Night Sleep Plan";
  
  // Default rationale if not provided
  const rationale = whyThisPlan || 
    "This plan is personalized based on your sleep profile, environment setup, and recent sleep patterns.";

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            {/* Headline */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">{headline}</h3>
              <Badge variant="outline" className="text-xs font-normal">
                {formattedDate}
              </Badge>
            </div>
            
            {/* Rationale */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {rationale}
            </p>
            
            {/* Refresh context banner */}
            {refreshContext && refreshReason !== "manual" && refreshReason !== "no_plan" && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                <span className="text-muted-foreground">
                  {REASON_ICONS[reasonKey] || <RefreshCw className="h-4 w-4" />}
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium capitalize">{refreshContext.tone} focus:</span>{" "}
                  {refreshContext.focus}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

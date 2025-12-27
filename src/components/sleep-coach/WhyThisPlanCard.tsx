/**
 * WhyThisPlanCard - Explains why the current plan was generated
 * 
 * Displays:
 * - Plan headline (AI-generated)
 * - Rationale connecting identity + environment + state
 * - Refresh reason context when applicable
 * - Wearable insights trust hint (when available)
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, RefreshCw, TrendingDown, ThermometerSun, Target, Watch } from "lucide-react";
import { REFRESH_REASON_TONES, type RefreshReason } from "@/types/coach-plan";

interface WearableInsightsHint {
  sources: string[];
  hasSleepArchitecture: boolean;
  hasBedtimePatterns: boolean;
  nightsAnalyzed?: number;
  // Qualitative labels (not raw numbers)
  efficiencyLevel?: 'high' | 'moderate' | 'low' | null;
  bedtimeConsistency?: 'consistent' | 'variable' | 'irregular' | null;
}

interface WhyThisPlanCardProps {
  planHeadline?: string;
  whyThisPlan?: string;
  refreshReason?: RefreshReason | string;
  generatedAt: string;
  wearableInsights?: WearableInsightsHint | null;
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
  wearableInsights,
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

  // Build qualitative wearable baseline description
  const buildWearableHint = () => {
    if (!wearableInsights || wearableInsights.sources.length === 0) return null;
    
    const sourceNames = wearableInsights.sources.map(s => 
      s === 'garmin' ? 'Garmin' : s === 'apple_health' ? 'Apple Watch' : s
    );
    
    const nightsCount = wearableInsights.nightsAnalyzed ?? 0;
    
    // Building baseline fallback: connected but <3 nights
    if (nightsCount < 3) {
      return {
        type: 'building' as const,
        text: `Building your baseline from ${sourceNames.join(' & ')} — more insights in a few days.`,
      };
    }
    
    // Qualitative baseline hint
    const qualifiers: string[] = [];
    
    if (wearableInsights.bedtimeConsistency) {
      qualifiers.push(`${wearableInsights.bedtimeConsistency} bedtimes`);
    }
    if (wearableInsights.efficiencyLevel) {
      qualifiers.push(`${wearableInsights.efficiencyLevel} sleep efficiency`);
    }
    
    if (qualifiers.length > 0) {
      return {
        type: 'baseline' as const,
        text: `Your baseline shows ${qualifiers.join(' and ')}.`,
      };
    }
    
    // Fallback: has data but no qualifiers computed
    return {
      type: 'baseline' as const,
      text: `Using ${sourceNames.join(' & ')} sleep patterns as your baseline.`,
    };
  };
  
  const wearableHint = buildWearableHint();

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
            
            {/* Wearable baseline trust hint */}
            {wearableHint && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                <Watch className="h-3.5 w-3.5 text-primary/60" />
                <span className={`text-xs ${wearableHint.type === 'building' ? 'text-muted-foreground/70 italic' : 'text-muted-foreground/80'}`}>
                  {wearableHint.text}
                </span>
              </div>
            )}
            
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

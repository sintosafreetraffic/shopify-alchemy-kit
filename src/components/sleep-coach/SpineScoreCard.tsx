/**
 * SpineScoreCard - Visual spine health score with breakdown
 * 
 * Displays the spine score as a prominent metric with:
 * - Animated score display
 * - Trend indicator
 * - Expandable factor breakdown
 * - Calm, scientific design
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpineScoreFactor {
  name: string;
  impact: number;
  description: string;
}

interface SpineScoreCardProps {
  score: number;
  trend?: "improving" | "stable" | "declining";
  factors?: SpineScoreFactor[];
  showBreakdown?: boolean;
}

export const SpineScoreCard = ({ 
  score, 
  trend = "stable", 
  factors = [],
  showBreakdown = true 
}: SpineScoreCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine score color and label
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-rose-500";
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Attention";
  };
  
  const getProgressColor = (score: number) => {
    if (score >= 75) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };
  
  const TrendIcon = trend === "improving" ? TrendingUp : 
                    trend === "declining" ? TrendingDown : Minus;
  
  const trendColor = trend === "improving" ? "text-emerald-500" : 
                     trend === "declining" ? "text-rose-500" : "text-muted-foreground";
  
  const trendLabel = trend === "improving" ? "Improving" : 
                     trend === "declining" ? "Declining" : "Stable";

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base font-medium">
            <Activity className="h-4 w-4 text-primary" />
            Spine Health Score
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[260px]">
                <p className="text-xs">
                  Your Spine Health Score reflects sleep quality, pain levels, 
                  trends, and product usage. Higher is better.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Score Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold tracking-tight ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className="font-medium"
            >
              {getScoreLabel(score)}
            </Badge>
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-xs font-medium">{trendLabel}</span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress 
            value={score} 
            className="h-2"
            style={{
              ['--progress-color' as string]: getProgressColor(score),
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
        
        {/* Expandable Breakdown */}
        {showBreakdown && factors.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs h-8 px-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span>Score Breakdown</span>
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
            
            {isExpanded && (
              <div className="mt-3 space-y-2">
                {factors.map((factor, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-3 py-2"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{factor.name}</div>
                      <div className="text-muted-foreground text-[11px]">
                        {factor.description}
                      </div>
                    </div>
                    <Badge 
                      variant={factor.impact >= 0 ? "default" : "destructive"}
                      className="ml-2 text-xs font-mono"
                    >
                      {factor.impact >= 0 ? "+" : ""}{factor.impact}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

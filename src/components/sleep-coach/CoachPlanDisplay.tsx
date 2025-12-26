/**
 * CoachPlanDisplay - Enhanced AI Coach Plan Display (v2)
 * 
 * Features:
 * - "Why this plan" rationale strip
 * - Enhanced spine score visualization
 * - Persona-connected product tips
 * - High-contrast today's actions
 * - Coach readiness label
 * - Analytics tracking
 */

import { useEffect, useCallback } from "react";
import { CoachPlan } from "@/hooks/useSleepApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, FileText, Clock, Heart, Target, Loader2, AlertTriangle, RefreshCw, User, Watch } from "lucide-react";
import { Link } from "react-router-dom";

// Import v2 components
import { WhyThisPlanCard } from "./WhyThisPlanCard";
import { ProductSetupCard } from "./ProductSetupCard";
import { SpineScoreDisplay } from "./SpineScoreDisplay";
import { TodayActionsCard } from "./TodayActionsCard";

// Import analytics
import { 
  trackCoachPlanViewed, 
  trackCoachPlanDayOpened,
  trackCoachTodayActionsMarked 
} from "@/lib/coachAnalytics";

// Types
import type { PersonaCluster, RefreshReason, TodayAction } from "@/types/coach-plan";

interface SpineScoreFactor {
  name: string;
  impact: number;
  description: string;
}

interface CoachPlanDisplayProps {
  plan: CoachPlan | null;
  onGeneratePlan: (reason?: string) => void;
  loading?: boolean;
  refreshStatus?: { shouldRegenerate: boolean; reason: string } | null;
  isAutoRefreshing?: boolean;
  // Enhanced metrics (v2)
  spineScoreBreakdown?: {
    score: number;
    factors: SpineScoreFactor[];
    trend: "improving" | "stable" | "declining";
  } | null;
  // Persona context for product tips
  personaCluster?: PersonaCluster | null;
  productsOwned?: string[];
  // Coach readiness
  coachReadinessLabel?: string | null;
}

const REFRESH_REASON_MESSAGES: Record<string, string> = {
  no_plan: "No plan exists yet",
  expired: "Your weekly plan has ended",
  quiz_updated: "Your sleep assessment was updated",
  product_changed: "New products were added to your profile",
  quality_declined: "Your sleep quality has declined significantly",
  pain_increased: "Your pain levels have increased",
  trend_worsening: "Your sleep trend is worsening",
  stale: "Your plan is over a week old",
};

export const CoachPlanDisplay = ({ 
  plan, 
  onGeneratePlan, 
  loading, 
  refreshStatus,
  isAutoRefreshing,
  spineScoreBreakdown,
  personaCluster,
  productsOwned = [],
  coachReadinessLabel,
}: CoachPlanDisplayProps) => {
  // Check if plan exists but has empty sleep_plan data
  const hasPlanData = plan?.sleep_plan && Object.keys(plan.sleep_plan).length > 0;
  
  // Check if plan is expired (week is over)
  const isPlanExpired = plan?.valid_until ? new Date(plan.valid_until) < new Date() : false;
  
  // Check if plan is stale (older than 7 days)
  const planAgeDays = plan?.generated_at 
    ? Math.floor((Date.now() - new Date(plan.generated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isPlanStale = planAgeDays > 7;
  
  // Show refresh notification if needed
  const showRefreshNotice = refreshStatus?.shouldRegenerate && !loading && !isAutoRefreshing;
  const refreshReasonMessage = refreshStatus?.reason 
    ? REFRESH_REASON_MESSAGES[refreshStatus.reason] || "Your plan needs updating"
    : null;

  // Get spine score (prefer breakdown, fallback to plan)
  const spineScore = spineScoreBreakdown?.score ?? plan?.spine_health_score ?? null;
  const spineTrend = spineScoreBreakdown?.trend ?? "stable";

  // Build analytics context
  const analyticsContext = {
    personaCluster: personaCluster ?? null,
    coachReadinessLabel: coachReadinessLabel ?? null,
    spineScore,
  };

  // Track plan view on mount (once per session per plan)
  useEffect(() => {
    if (plan?.id && hasPlanData) {
      const hasTodayActions = (plan.recommended_actions_today?.length ?? 0) > 0;
      trackCoachPlanViewed(plan.id, planAgeDays, hasTodayActions, analyticsContext);
    }
  }, [plan?.id, hasPlanData]);

  // Handle day tab click
  const handleDayOpened = useCallback((dayIndex: number) => {
    if (plan?.id) {
      trackCoachPlanDayOpened(plan.id, dayIndex, analyticsContext);
    }
  }, [plan?.id, analyticsContext]);

  // Handle today actions completion
  const handleActionsCompleted = useCallback((completed: number, total: number) => {
    if (plan?.id && completed > 0) {
      trackCoachTodayActionsMarked(plan.id, completed, total, analyticsContext);
    }
  }, [plan?.id, analyticsContext]);

  // Parse today actions with effort levels
  const todayActions: TodayAction[] = (plan?.recommended_actions_today || []).map((action: any) => ({
    time: action.time || "morning",
    action: action.action || "",
    duration: action.duration || "5 min",
    effort: action.effort || "low",
  }));

  if (!plan || !hasPlanData) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          {loading || isAutoRefreshing ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isAutoRefreshing ? "Refreshing Your Sleep Plan..." : "Generating Your Sleep Plan..."}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Our AI is creating a personalized 7-day plan based on your profile and sleep logs.
              </p>
            </>
          ) : (
            <>
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Sleep Plan Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Your personalized AI sleep plan will be generated automatically based on your profile and sleep logs.
              </p>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Connect your Garmin or Apple Watch to get deeper insights from your sleep data.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => onGeneratePlan('manual')}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate My Plan
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/settings/sleep-sources">
                    <Watch className="h-4 w-4 mr-2" />
                    Connect Wearable
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const weeklyPlan = plan.sleep_plan || {};
  const days = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Extract enhanced plan data (v2 fields) - safely access optional fields
  const planAny = plan as any;
  const rawAiResponse = planAny.raw_ai_response ? JSON.parse(planAny.raw_ai_response) : null;
  const planHeadline = rawAiResponse?.planHeadline;
  const whyThisPlan = rawAiResponse?.whyThisPlan;
  const spineScoreHint = rawAiResponse?.spineScoreHint;
  const generatedReason = planAny.generated_reason || 'manual';
  
  // Extract wearable insights from logs_snapshot for trust hint
  const logsSnapshot = planAny.logs_snapshot || {};
  const wearableInsights = logsSnapshot.wearable_connected ? {
    sources: logsSnapshot.wearable_sources || [],
    hasSleepArchitecture: !!(logsSnapshot.sleep_architecture?.nightsAnalyzed >= 3),
    hasBedtimePatterns: !!(logsSnapshot.bedtime_patterns?.consistencyScore),
  } : null;

  return (
    <div className="space-y-4">
      {/* Why This Plan Card - v2 */}
      <WhyThisPlanCard
        planHeadline={planHeadline}
        whyThisPlan={whyThisPlan}
        refreshReason={generatedReason as RefreshReason}
        generatedAt={plan.generated_at}
        wearableInsights={wearableInsights}
      />

      {/* Refresh notification banner */}
      {showRefreshNotice && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {refreshReasonMessage}
            </p>
            <p className="text-xs text-muted-foreground">
              Generate a new plan to get updated recommendations.
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={() => onGeneratePlan(refreshStatus?.reason || 'manual')} 
            disabled={loading}
            className="flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Plan
          </Button>
        </div>
      )}

      {/* Two-column layout on desktop */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Left column: Spine Score + Product Tips */}
        <div className="md:col-span-1 space-y-4">
          {/* Spine Score Display */}
          {spineScore !== null && (
            <SpineScoreDisplay
              score={spineScore}
              trend={spineTrend}
              hint={spineScoreHint}
              factors={spineScoreBreakdown?.factors}
              showBreakdown={true}
            />
          )}

          {/* Coach Readiness Label */}
          {coachReadinessLabel && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Coach Level:</span>
              <Badge variant="secondary" className="text-xs">
                {coachReadinessLabel}
              </Badge>
            </div>
          )}

          {/* Product Setup Card */}
          {personaCluster && productsOwned.length > 0 && (
            <ProductSetupCard
              productsOwned={productsOwned}
              personaCluster={personaCluster}
            />
          )}
        </div>

        {/* Right column: Today Actions + Main Plan */}
        <div className="md:col-span-2 space-y-4">
          {/* Today's Actions - High contrast card */}
          {todayActions.length > 0 && (
            <TodayActionsCard 
              actions={todayActions}
              onActionsCompleted={handleActionsCompleted}
            />
          )}

          {/* Main Plan Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  7-Day Schedule
                </span>
              </CardTitle>
              
              {/* Encouragement Message */}
              {plan.encouragement_message && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-3">
                  <div className="flex items-start gap-3">
                    <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{plan.encouragement_message}</p>
                  </div>
                </div>
              )}

              {/* Focus Areas */}
              {plan.main_focus_this_week && plan.main_focus_this_week.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    This Week's Focus
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plan.main_focus_this_week.map((focus, i) => (
                      <Badge key={i} variant="secondary">
                        {focus}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Standard validity info */}
              {plan.valid_until && !showRefreshNotice && (
                <div className="mt-2">
                  {isPlanExpired ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Your weekly plan has ended. Generate a new plan for this week!
                      </p>
                      <Button size="sm" onClick={() => onGeneratePlan('expired')} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Generate New Plan
                      </Button>
                    </div>
                  ) : isPlanStale ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Based on data from {planAgeDays} days ago – consider refreshing after your latest logs.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Plan valid until {new Date(plan.valid_until).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="schedule" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="schedule">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </TabsTrigger>
                  <TabsTrigger value="resources">
                    <FileText className="h-4 w-4 mr-2" />
                    Resources
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="space-y-3">
                  {days.map((day, i) => {
                    const dayPlan = weeklyPlan[day];
                    if (!dayPlan) return null;
                    
                    return (
                      <div 
                        key={day} 
                        className="bg-muted/30 rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleDayOpened(i + 1)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{dayNames[i]}</span>
                          {dayPlan.focus && (
                            <Badge variant="outline" className="text-xs">
                              {dayPlan.focus}
                            </Badge>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          {dayPlan.morningTask && (
                            <div className="flex items-start gap-2">
                              <span className="text-yellow-500">☀️</span>
                              <span className="text-muted-foreground">{dayPlan.morningTask}</span>
                            </div>
                          )}
                          {dayPlan.eveningTask && (
                            <div className="flex items-start gap-2">
                              <span className="text-blue-500">🌙</span>
                              <span className="text-muted-foreground">{dayPlan.eveningTask}</span>
                            </div>
                          )}
                        </div>
                        {dayPlan.tip && (
                          <div className="mt-2 text-xs text-muted-foreground italic">
                            💡 {dayPlan.tip}
                          </div>
                        )}
                        {dayPlan.microHabit && (
                          <div className="mt-2 text-xs text-primary/80">
                            ⚡ Micro-habit: {dayPlan.microHabit}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="resources">
                  {plan.recommended_pdfs && plan.recommended_pdfs.length > 0 ? (
                    <div className="space-y-2">
                      {plan.recommended_pdfs.map((pdf, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <span>{pdf}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No resources recommended yet.
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                <span>Generated: {new Date(plan.generated_at).toLocaleDateString()}</span>
                <span className="mx-2">•</span>
                <span>This plan uses your latest sleep assessment and recent logged sleep</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Performance: Chart components are lazy-loaded to reduce initial bundle size
import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Lock, ShoppingBag, Users, Moon, LogOut, AlertCircle, 
  RefreshCw, LayoutDashboard, ListChecks, Sparkles, User, 
  TrendingUp, TrendingDown, Minus, Flame, Brain, ClipboardEdit, BarChart3
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSleepDashboardData } from "@/hooks/useSleepDashboardData";
import { useSleepApi, SleepProfile, SleepLog } from "@/hooks/useSleepApi";
import { toast } from "sonner";

// Import sleep coach components
import { ProfileWizard } from "@/components/sleep-coach/ProfileWizard";
import { ProfileForm } from "@/components/sleep-coach/ProfileForm";
import { SleepPlanTab } from "@/components/sleep-coach/plan";
import { SleepLogsTab } from "@/components/sleep-coach/SleepLogsTab";
import { ShareProgressModal } from "@/components/sleep-coach/ShareProgressModal";
import { PersonaCard } from "@/components/sleep-coach/PersonaCard";
import { CoachReadinessCard } from "@/components/sleep-coach/CoachReadinessCard";
import { OverviewTabMinimal } from "@/components/sleep-coach/overview";
import { ProfileTab } from "@/components/sleep-coach/profile";
import { useCoachMetrics } from "@/hooks/useCoachMetrics";
import { usePlanCompletion } from "@/hooks/usePlanCompletion";
import { trackCoachPlanRefreshed } from "@/lib/coachAnalytics";
// Import TimeRange type directly for type safety (not lazy-loaded)
import type { TimeRange } from "@/components/sleep-coach/SleepProgressChart";

// Lazy load chart component to reduce initial bundle size
const SleepProgressChart = lazy(() => 
  import("@/components/sleep-coach/SleepProgressChart").then(mod => ({ default: mod.SleepProgressChart }))
);

// Type alias for external use
type ChartTimeRange = TimeRange;

/**
 * Calculate consecutive logging streak from logs based on created_at dates
 */
function calculateStreak(logs: SleepLog[]): number {
  if (logs.length === 0) return 0;
  
  // Get unique dates when logs were created (not the date field, but created_at)
  const createdDates = [...new Set(
    logs.map(log => new Date(log.created_at).toISOString().split('T')[0])
  )].sort((a, b) => b.localeCompare(a)); // Sort descending
  
  if (createdDates.length === 0) return 0;
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Check if the most recent log is from today or yesterday
  if (createdDates[0] !== today && createdDates[0] !== yesterday) {
    return 0;
  }
  
  let streak = 1;
  let currentDate = new Date(createdDates[0]);
  
  for (let i = 1; i < createdDates.length; i++) {
    const prevDate = new Date(currentDate.getTime() - 86400000);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    
    if (createdDates[i] === prevDateStr) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }
  
  return streak;
}

const SleepCoachDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState<{ reason: string; hasPurchased: boolean } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showWizard, setShowWizard] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse progressRange from URL on mount
  const initialProgressRange = useMemo((): ChartTimeRange => {
    const urlRange = searchParams.get('progressRange');
    if (urlRange && ['7d', '30d', '90d', '12m'].includes(urlRange)) {
      return urlRange as ChartTimeRange;
    }
    return '30d';
  }, []); // Only compute once on mount
  
  const [shareRange, setShareRange] = useState<ChartTimeRange>(initialProgressRange);
  const navigate = useNavigate();

  // Check for quiz retake notification
  const quizUpdated = searchParams.get('quizUpdated') === 'true';

  // Load dashboard data - this hook handles fetching once after auth
  const { data, loading: dataLoading, error: dataError, refetch } = useSleepDashboardData(
    isAuthenticated ? email : null
  );

  // API helpers for mutations (no direct fetching - only for create/update/delete)
  const { 
    loading: apiLoading, 
    error: apiError,
    createOrUpdateProfile,
    addLog,
    updateLog,
    deleteLog,
    generateCoachPlan,
    checkPlanRefresh
  } = useSleepApi();

  // Plan refresh status
  const [refreshStatus, setRefreshStatus] = useState<{ shouldRegenerate: boolean; reason: string } | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Check access when authenticated
  const checkAccess = useCallback(async (session: any) => {
    if (!session?.access_token) return;
    
    setIsCheckingAccess(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-sleep-coach-access`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      
      const data = await response.json();
      console.log('[SleepCoach] Access check result:', data);
      
      if (!data.hasAccess) {
        if (data.accessReason === 'quiz_required') {
          toast.info("Complete the Sleep Assessment first", {
            description: "Before we create your personalized AI sleep plan, we need a short sleep assessment.",
            duration: 6000,
          });
          navigate('/sleep-quiz?returnTo=/sleep-coach');
          return;
        }
        // Other access denial reasons
        setAccessDenied({ reason: data.accessReason, hasPurchased: data.hasPurchased });
      } else {
        setAccessDenied(null);
      }
    } catch (error) {
      console.error('[SleepCoach] Access check error:', error);
    } finally {
      setIsCheckingAccess(false);
    }
  }, [navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsAuthenticated(true);
        setEmail(session.user.email || null);
        // Check access after confirming authentication
        await checkAccess(session);
      }
      setIsCheckingAuth(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setEmail(session.user.email || null);
        // Re-check access on auth state change
        if (event === 'SIGNED_IN') {
          await checkAccess(session);
        }
      } else {
        setIsAuthenticated(false);
        setEmail(null);
        setAccessDenied(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAccess]);

  // Show toast if user just retook the quiz
  useEffect(() => {
    if (quizUpdated && isAuthenticated && !isCheckingAccess) {
      toast.success("Sleep profile updated!", {
        description: "Your sleep assessment has been updated. Generate a new plan to see personalized recommendations.",
        duration: 8000,
      });
      // Clear only the quizUpdated param, preserve others
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('quizUpdated');
      setSearchParams(newParams, { replace: true });
    }
  }, [quizUpdated, isAuthenticated, isCheckingAccess, searchParams, setSearchParams]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Navigate to retake quiz
  const handleRetakeQuiz = () => {
    navigate('/sleep-quiz?returnTo=/sleep-coach&mode=retake&quizUpdated=true');
  };

  // Profile wizard completion handler
  const handleWizardComplete = useCallback(async (profileData: Partial<SleepProfile> & { email: string }) => {
    const result = await createOrUpdateProfile(profileData);
    if (result) {
      toast.success("Profile created successfully!");
      setShowWizard(false);
      await refetch(); // Refetch data after profile creation
    } else {
      toast.error("Failed to create profile");
    }
    return result;
  }, [createOrUpdateProfile, refetch]);

  // Profile update handler
  const handleProfileUpdate = useCallback(async (profileData: Partial<SleepProfile> & { email: string }) => {
    const result = await createOrUpdateProfile(profileData);
    if (result) {
      toast.success("Profile updated successfully!");
      setShowEditProfile(false);
      await refetch();
    } else {
      toast.error("Failed to update profile");
    }
    return result;
  }, [createOrUpdateProfile, refetch]);

  // Sleep log handlers
  const handleAddLog = useCallback(async (log: Partial<SleepLog>) => {
    const success = await addLog(log);
    if (success) {
      toast.success("Sleep log added!");
      await refetch();
    } else {
      toast.error(apiError || "Failed to add log");
    }
    return success;
  }, [addLog, refetch, apiError]);

  const handleUpdateLog = useCallback(async (id: string, log: Partial<SleepLog>) => {
    const success = await updateLog(id, log);
    if (success) {
      toast.success("Sleep log updated!");
      await refetch();
    } else {
      toast.error(apiError || "Failed to update log");
    }
    return success;
  }, [updateLog, refetch, apiError]);

  const handleDeleteLog = useCallback(async (id: string) => {
    const success = await deleteLog(id);
    if (success) {
      toast.success("Sleep log deleted!");
      await refetch();
    } else {
      toast.error("Failed to delete log");
    }
    return success;
  }, [deleteLog, refetch]);

  // Coach plan generation handler
  const handleGeneratePlan = useCallback(async (reason = 'manual') => {
    if (!email) return;
    setIsGeneratingPlan(true);
    try {
      const plan = await generateCoachPlan(email, 'weekly', reason);
      if (plan) {
        toast.success("New sleep plan generated!");
        setRefreshStatus(null); // Clear refresh status after successful generation
        await refetch();
      } else {
        toast.error("Failed to generate plan");
      }
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [email, generateCoachPlan, refetch]);

  // Check plan refresh status after data loads - only once when profile loads
  useEffect(() => {
    if (isAuthenticated && !dataLoading && data.profile && !isCheckingAccess) {
      checkPlanRefresh().then(result => {
        if (result) {
          setRefreshStatus(result);
          console.log('[SleepCoach] Plan refresh check:', result);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, dataLoading, data.profile?.id, isCheckingAccess]);

  // Calculate streak from logs
  const streak = calculateStreak(data.logs);
  
  // Calculate last log days ago
  const lastLogDaysAgo = data.logs.length > 0 
    ? Math.floor((Date.now() - new Date(data.logs[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  // Use deterministic coach metrics hook
  const { spineScore, riskAnalysis, coachReadiness, planRefreshTrigger } = useCoachMetrics({
    profile: data.profile,
    trends: data.trends,
    plan: data.coachPlan,
    logsCount: data.logs.length,
    lastLogDaysAgo,
    streakDays: streak,
  });
  
  // Get persona cluster from profile
  const personaCluster = (data.profile as any)?.persona_cluster || 
    (data.profile?.sleep_assessment as any)?.persona?.cluster || null;

  // Plan completion tracking
  const planId = data.coachPlan?.id || null;
  const {
    completedActions,
    dayCompletion,
    adherenceRate,
    streakDays: completionStreak,
    toggleAction,
    saveReflection,
  } = usePlanCompletion({ planId, enabled: !!planId });

  if (isCheckingAuth || isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isCheckingAccess ? "Verifying access..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Sleep Coach Dashboard</h2>
              <p className="text-muted-foreground">
                Sign in to access your personalized AI sleep coaching dashboard.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
              <p className="text-sm font-medium">Access is available to:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <span>Rise By Night customers</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Affiliates with 3+ sales</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Moon className="h-4 w-4 text-primary" />
                <span>Sleep assessment completers</span>
              </div>
            </div>
            <Link to="/auth?returnTo=/sleep-coach&context=sleep-coach">
              <Button className="w-full">
                Sign In / Create Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No Profile CTA Component
  const NoProfileCTA = () => (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardContent className="py-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Complete Your Sleep Profile</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You don't have a sleep profile yet – start the onboarding wizard to unlock your AI Sleep Coach with personalized recommendations.
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)} size="lg">
          <Sparkles className="mr-2 h-4 w-4" />
          Start Profile Wizard
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Moon className="h-6 w-6 text-primary" />
                  Sleep Coach Dashboard
                </CardTitle>
                <CardDescription className="mt-1">
                  Welcome, {email}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refetch}
                  disabled={dataLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error State */}
        {dataError && (
          <Card className="border-destructive mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Failed to load data</p>
                  <p className="text-sm text-muted-foreground">{dataError}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {dataLoading && (
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your sleep data...</p>
            </CardContent>
          </Card>
        )}

        {/* Profile Wizard Modal (in-page) */}
        {showWizard && email && (
          <div className="mb-6">
            <ProfileWizard 
              email={email} 
              onComplete={handleWizardComplete}
              loading={apiLoading}
            />
            <div className="text-center mt-4">
              <Button variant="ghost" onClick={() => setShowWizard(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Main Content - Only render tabs when not loading and no error */}
        {!dataLoading && !dataError && !showWizard && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">Sleep Logs</span>
              </TabsTrigger>
              <TabsTrigger value="coach" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI Coach</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB - Redesigned Scandinavian Minimalism */}
            <TabsContent value="overview">
              <OverviewTabMinimal
                profile={data.profile}
                logs={data.logs}
                trends={data.trends}
                streak={streak}
                onUpdateAssessment={handleRetakeQuiz}
              />
            </TabsContent>

            {/* SLEEP LOGS TAB */}
            <TabsContent value="logs" className="space-y-6">
              {!data.profile ? (
                <NoProfileCTA />
              ) : (
                <SleepLogsTab
                  email={email || ""}
                  logs={data.logs}
                  trends={data.trends}
                  hasPersona={!!personaCluster}
                  onAddLog={handleAddLog}
                  onUpdateLog={handleUpdateLog}
                  onDeleteLog={handleDeleteLog}
                  apiLoading={apiLoading}
                />
              )}
            </TabsContent>

            {/* AI COACH TAB - Premium Adaptive Plan */}
            <TabsContent value="coach" className="space-y-6">
              {!data.profile ? (
                <NoProfileCTA />
              ) : (
                (() => {
                  const planAny = data.coachPlan as any;
                  const rawResponse = planAny?.raw_ai_response ? JSON.parse(planAny.raw_ai_response) : null;
                  return (
                    <SleepPlanTab
                      plan={data.coachPlan ? {
                        id: data.coachPlan.id,
                        planHeadline: rawResponse?.planHeadline,
                        weekFocus: rawResponse?.week_focus,
                        adaptiveSummary: rawResponse?.adaptive_summary,
                        phase: rawResponse?.phase,
                        detectedPatterns: rawResponse?.detected_patterns || [],
                        days: rawResponse?.days,
                        todayActions: data.coachPlan.recommended_actions_today as any,
                        spineScore: spineScore?.score ?? data.coachPlan.spine_health_score ?? undefined,
                        spineScoreHint: rawResponse?.spineScoreHint,
                        focusAreas: data.coachPlan.main_focus_this_week || [],
                        encouragement: data.coachPlan.encouragement_message || undefined,
                        generatedAt: data.coachPlan.generated_at,
                        validUntil: data.coachPlan.valid_until || undefined,
                      } : null}
                      loading={isGeneratingPlan}
                      streakDays={completionStreak || streak}
                      adaptiveContext={{
                        phase: rawResponse?.phase || "foundation",
                        weekNumber: rawResponse?.week_number || 1,
                        detectedPatterns: rawResponse?.detected_patterns || [],
                        adherenceRate: adherenceRate || rawResponse?.adherence_rate,
                      }}
                      onRegeneratePlan={(reason) => handleGeneratePlan(reason)}
                    />
                  );
                })()
              )}
            </TabsContent>

            {/* PROFILE TAB */}
            <TabsContent value="profile" className="space-y-6">
              {!data.profile ? (
                <NoProfileCTA />
              ) : showEditProfile && email ? (
                <>
                  <ProfileForm 
                    email={email}
                    existingProfile={data.profile}
                    onSubmit={handleProfileUpdate}
                    loading={apiLoading}
                  />
                  <div className="text-center">
                    <Button variant="ghost" onClick={() => setShowEditProfile(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : email ? (
                <ProfileTab
                  profile={data.profile}
                  email={email}
                  adherenceRate={adherenceRate}
                  streakDays={completionStreak || streak}
                  onRefetch={refetch}
                  onRetakeQuiz={handleRetakeQuiz}
                />
              ) : null}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default SleepCoachDashboard;

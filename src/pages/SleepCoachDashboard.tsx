import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Lock, ShoppingBag, Users, Moon, LogOut, AlertCircle, 
  RefreshCw, LayoutDashboard, ListChecks, Sparkles, User, 
  TrendingUp, TrendingDown, Minus, Flame, Brain, ClipboardEdit
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSleepDashboardData } from "@/hooks/useSleepDashboardData";
import { useSleepApi, SleepProfile, SleepLog } from "@/hooks/useSleepApi";
import { toast } from "sonner";

// Import sleep coach components
import { ProfileWizard } from "@/components/sleep-coach/ProfileWizard";
import { ProfileViewer } from "@/components/sleep-coach/ProfileViewer";
import { ProfileForm } from "@/components/sleep-coach/ProfileForm";
import { SleepLogForm } from "@/components/sleep-coach/SleepLogForm";
import { SleepLogTable } from "@/components/sleep-coach/SleepLogTable";
import { CoachPlanDisplay } from "@/components/sleep-coach/CoachPlanDisplay";
import { StreakDisplay } from "@/components/sleep-coach/StreakDisplay";
import { SleepHistorySection } from "@/components/sleep-coach/SleepHistorySection";
import { SleepProgressChart } from "@/components/sleep-coach/SleepProgressChart";
import { ShareProgressModal } from "@/components/sleep-coach/ShareProgressModal";

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
    generateCoachPlan
  } = useSleepApi();

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
          toast.info("Complete the Sleep Quiz first", {
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
  const handleGeneratePlan = useCallback(async () => {
    if (!email) return;
    setIsGeneratingPlan(true);
    try {
      const plan = await generateCoachPlan(email, 'weekly');
      if (plan) {
        toast.success("New sleep plan generated!");
        await refetch();
      } else {
        toast.error("Failed to generate plan");
      }
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [email, generateCoachPlan, refetch]);

  // Calculate streak from logs
  const streak = calculateStreak(data.logs);

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
                <span>Sleep quiz completers</span>
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

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              {!data.profile ? (
                <NoProfileCTA />
              ) : (
                <>
                  {/* Profile Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Your Sleep Profile</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRetakeQuiz}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          <ClipboardEdit className="h-3 w-3 mr-1" />
                          Update Assessment
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Position</p>
                          <p className="font-medium capitalize">{data.profile.sleep_position}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Temperature</p>
                          <p className="font-medium capitalize">{data.profile.temperature_preference}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Stress Level</p>
                          <p className="font-medium capitalize">{data.profile.stress_level}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Wake Up</p>
                          <p className="font-medium capitalize">{data.profile.wake_up_condition}</p>
                        </div>
                      </div>
                      {data.profile.pain_points && data.profile.pain_points.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Pain Points</p>
                          <div className="flex flex-wrap gap-2">
                            {data.profile.pain_points.map((point, i) => (
                              <Badge key={i} variant="secondary">{point}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Trend Stats */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Sleep Trends</span>
                        <div className="flex items-center gap-2 text-sm font-normal">
                          {data.trends.trend === 'improving' && (
                            <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Improving
                            </Badge>
                          )}
                          {data.trends.trend === 'worsening' && (
                            <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Worsening
                            </Badge>
                          )}
                          {data.trends.trend === 'stable' && (
                            <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">
                              <Minus className="h-3 w-3 mr-1" />
                              Stable
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-primary">
                            {data.trends.avgSleepQuality > 0 ? data.trends.avgSleepQuality.toFixed(1) : '-'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Avg Quality /10</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-primary">
                            {data.trends.avgPain > 0 ? data.trends.avgPain.toFixed(1) : '-'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Avg Pain /10</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-green-600">{data.trends.goodNights}</div>
                          <div className="text-xs text-muted-foreground mt-1">Good Nights (7+)</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-red-600">{data.trends.poorNights}</div>
                          <div className="text-xs text-muted-foreground mt-1">Poor Nights (≤4)</div>
                        </div>
                      </div>
                      {(data.trends.hotNights > 0 || data.trends.stressedNights > 0) && (
                        <div className="flex gap-4 mt-4 pt-4 border-t border-border/50">
                          {data.trends.hotNights > 0 && (
                            <div className="flex items-center gap-1 text-sm text-orange-600">
                              <Flame className="h-4 w-4" />
                              <span>{data.trends.hotNights} hot nights</span>
                            </div>
                          )}
                          {data.trends.stressedNights > 0 && (
                            <div className="flex items-center gap-1 text-sm text-purple-600">
                              <Brain className="h-4 w-4" />
                              <span>{data.trends.stressedNights} stressed nights</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Streak Display */}
                  <StreakDisplay streak={streak} />
                </>
              )}
            </TabsContent>

            {/* SLEEP LOGS TAB */}
            <TabsContent value="logs" className="space-y-6">
              {!data.profile ? (
                <NoProfileCTA />
              ) : (
                <>
                  {email && (
                    <SleepLogForm 
                      email={email} 
                      onSubmit={handleAddLog}
                      loading={apiLoading}
                    />
                  )}
                  
                  {/* Sleep Progress Chart with Share */}
                  <SleepProgressChart 
                    logs={data.logs}
                    onShareClick={() => setIsShareModalOpen(true)}
                  />
                  
                  {/* Weekly Sleep History */}
                  <SleepHistorySection 
                    logs={data.logs}
                    trends={data.trends}
                  />
                  
                  {/* Share Modal */}
                  <ShareProgressModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    logs={data.logs}
                  />
                </>
              )}
            </TabsContent>

            {/* AI COACH TAB */}
            <TabsContent value="coach" className="space-y-6">
              {!data.profile ? (
                <NoProfileCTA />
              ) : (
                <>
                  {!data.coachPlan && (
                    <Card>
                      <CardContent className="py-8 text-center space-y-4">
                        <Sparkles className="h-12 w-12 text-primary mx-auto opacity-50" />
                        <div>
                          <h3 className="text-lg font-semibold mb-2">No AI Plan Generated Yet</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            Generate your personalized 7-day sleep plan based on your sleep quiz assessment
                            {data.logs.length > 0 ? ` and ${data.logs.length} logged nights` : ''}.
                          </p>
                        </div>
                        <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan}>
                          {isGeneratingPlan ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Weekly Plan
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  {data.coachPlan && (
                    <CoachPlanDisplay 
                      plan={data.coachPlan} 
                      onGeneratePlan={handleGeneratePlan}
                      loading={isGeneratingPlan}
                    />
                  )}
                </>
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
              ) : (
                <>
                  <ProfileViewer profile={data.profile} />
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={() => setShowEditProfile(true)}>
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default SleepCoachDashboard;

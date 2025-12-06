import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock, ShoppingBag, Users, Moon, LogOut, User, BarChart3, Sparkles, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSleepApi, SleepProfile, SleepLog, CoachPlan, TrendData } from "@/hooks/useSleepApi";
import { ProfileWizard, SleepLogForm, SleepHistoryChart, CoachPlanDisplay, StreakDisplay, ProfileViewer, SleepLogTable } from "@/components/sleep-coach";

const SleepCoachDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  // Data states
  const [profile, setProfile] = useState<SleepProfile | null>(null);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [coachPlan, setCoachPlan] = useState<CoachPlan | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const api = useSleepApi();

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsAuthenticated(true);
        setEmail(session.user.email || "");
      }
      setIsCheckingAuth(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setEmail(session.user.email || "");
      } else {
        setIsAuthenticated(false);
        setEmail("");
        setProfile(null);
        setLogs([]);
        setTrends(null);
        setCoachPlan(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when authenticated
  const loadData = useCallback(async () => {
    if (!email) return;
    
    setDataLoading(true);
    try {
      const [profileData, logsData, planData] = await Promise.all([
        api.fetchProfile(email),
        api.fetchLogs(email, 30),
        api.fetchCoachPlan(email),
      ]);
      
      setProfile(profileData);
      if (logsData) {
        setLogs(logsData.logs);
        setTrends(logsData.trends);
      }
      setCoachPlan(planData);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setDataLoading(false);
    }
  }, [email, api]);

  useEffect(() => {
    if (isAuthenticated && email) {
      loadData();
    }
  }, [isAuthenticated, email, loadData]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Handler for profile creation from wizard
  const handleProfileCreate = async (
    profileData: Partial<SleepProfile> & { email: string }
  ): Promise<SleepProfile | null> => {
    const result = await api.createOrUpdateProfile(profileData);
    if (result) {
      setProfile(result);
      toast.success("Profile created! Generating your sleep plan...");
      // Auto-generate plan after profile creation
      const plan = await api.generateCoachPlan(email, "initial");
      if (plan) {
        setCoachPlan(plan);
        toast.success("Your personalized sleep plan is ready!");
      }
    }
    return result;
  };

  // Handler for adding sleep logs
  const handleAddLog = async (logData: Partial<SleepLog>): Promise<boolean> => {
    const success = await api.addLog(logData);
    if (success) {
      toast.success("Sleep log saved!");
      // Refresh logs
      const logsData = await api.fetchLogs(email, 30);
      if (logsData) {
        setLogs(logsData.logs);
        setTrends(logsData.trends);
      }
    } else if (api.error) {
      toast.error(api.error);
    }
    return success;
  };

  // Handler for updating sleep logs
  const handleUpdateLog = async (id: string, logData: Partial<SleepLog>): Promise<boolean> => {
    const success = await api.updateLog(id, logData);
    if (success) {
      toast.success("Log updated!");
      const logsData = await api.fetchLogs(email, 30);
      if (logsData) {
        setLogs(logsData.logs);
        setTrends(logsData.trends);
      }
    } else if (api.error) {
      toast.error(api.error);
    }
    return success;
  };

  // Handler for deleting sleep logs
  const handleDeleteLog = async (id: string): Promise<boolean> => {
    const success = await api.deleteLog(id);
    if (success) {
      toast.success("Log deleted!");
      setLogs(prev => prev.filter(l => l.id !== id));
    } else if (api.error) {
      toast.error(api.error);
    }
    return success;
  };

  // Handler for generating coach plan
  const handleGeneratePlan = async (): Promise<void> => {
    const plan = await api.generateCoachPlan(email, "weekly");
    if (plan) {
      setCoachPlan(plan);
      toast.success("New sleep plan generated!");
    } else if (api.error) {
      toast.error(api.error);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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

  // Loading state while fetching data
  if (dataLoading && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your sleep data...</p>
        </div>
      </div>
    );
  }

  // No profile yet - show wizard
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold">Sleep Coach Setup</h1>
              <p className="text-muted-foreground">Let's personalize your experience</p>
            </div>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
          
          <ProfileWizard 
            email={email} 
            onComplete={handleProfileCreate}
            loading={api.loading}
          />
        </div>
      </div>
    );
  }

  // Calculate streak from logs (consecutive days of logging based on created_at)
  const calculateStreak = (): number => {
    if (logs.length === 0) return 0;
    
    // Sort logs by created_at date descending
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get unique logging dates
    const logDates = new Set(sortedLogs.map(log => {
      const d = new Date(log.created_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
    
    // Count consecutive days from today
    const checkDate = new Date(today);
    while (logDates.has(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return streak;
  };

  const currentStreak = calculateStreak();

  // Main dashboard with profile
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Moon className="h-6 w-6 text-primary" />
              Sleep Coach
            </h1>
            <p className="text-muted-foreground text-sm">Welcome back, {email}</p>
          </div>
          <div className="flex items-center gap-3">
            <StreakDisplay streak={currentStreak} className="w-auto" />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Trends Summary */}
        {trends && logs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-primary">{trends.avgSleepQuality.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Quality</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{trends.avgPain.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Pain</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-green-500">{trends.goodNights}</div>
                <div className="text-xs text-muted-foreground">Good Nights</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-4">
                <div className={`text-2xl font-bold ${trends.trend === 'improving' ? 'text-green-500' : trends.trend === 'worsening' ? 'text-red-500' : ''}`}>
                  {trends.trend === 'improving' ? '📈' : trends.trend === 'worsening' ? '📉' : '➡️'}
                </div>
                <div className="text-xs text-muted-foreground capitalize">{trends.trend}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Log Sleep</span>
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Sleep Plan</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SleepHistoryChart logs={logs} />
              </div>
              <div>
                <SleepLogForm 
                  email={email} 
                  onSubmit={handleAddLog}
                  loading={api.loading}
                />
              </div>
            </div>
            
            {logs.length > 0 && trends && (
              <SleepLogTable 
                logs={logs.slice(0, 7)} 
                trends={trends}
                onUpdateLog={handleUpdateLog}
                onDeleteLog={handleDeleteLog}
              />
            )}
          </TabsContent>

          <TabsContent value="log" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <SleepLogForm 
                email={email} 
                onSubmit={handleAddLog}
                loading={api.loading}
              />
              <div>
                {trends && (
                  <SleepLogTable 
                    logs={logs.slice(0, 10)} 
                    trends={trends}
                    onUpdateLog={handleUpdateLog}
                    onDeleteLog={handleDeleteLog}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plan">
            <CoachPlanDisplay 
              plan={coachPlan}
              onGeneratePlan={handleGeneratePlan}
              loading={api.loading}
            />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileViewer profile={profile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SleepCoachDashboard;

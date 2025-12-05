import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock, ShoppingBag, Users, Moon, LayoutDashboard, User, History, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSleepApi, SleepProfile, SleepLog, CoachPlan, TrendData } from "@/hooks/useSleepApi";
import { toast } from "sonner";
import {
  ProfileWizard,
  ProfileForm,
  ProfileViewer,
  SleepLogForm,
  SleepLogTable,
  SleepHistoryChart,
  CoachPlanDisplay,
} from "@/components/sleep-coach";

const SleepCoachDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

  // Data states
  const [profile, setProfile] = useState<SleepProfile | null>(null);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [trends, setTrends] = useState<TrendData>({
    avgSleepQuality: 0,
    avgPain: 0,
    trend: 'stable',
    hotNights: 0,
    stressedNights: 0,
    goodNights: 0,
    poorNights: 0,
  });
  const [coachPlan, setCoachPlan] = useState<CoachPlan | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const api = useSleepApi();

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsAuthenticated(true);
        setEmail(session.user.email || '');
      }
      setIsCheckingAuth(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setEmail(session.user.email || '');
      } else {
        setIsAuthenticated(false);
        setEmail("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when email is available
  const loadData = useCallback(async () => {
    if (!email) return;
    
    setIsLoadingData(true);
    try {
      const [profileData, logsData, planData] = await Promise.all([
        api.fetchProfile(email),
        api.fetchLogs(email, 30),
        api.fetchCoachPlan(email),
      ]);

      if (profileData) {
        setProfile(profileData);
        setShowWizard(false);
      } else {
        setShowWizard(true);
      }

      if (logsData) {
        setLogs(logsData.logs);
        setTrends(logsData.trends);
      }

      if (planData) {
        setCoachPlan(planData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoadingData(false);
    }
  }, [email, api]);

  useEffect(() => {
    if (email) {
      loadData();
    }
  }, [email, loadData]);

  // Handler: Profile creation from wizard
  const handleProfileCreate = async (profileData: Partial<SleepProfile> & { email: string }): Promise<SleepProfile | null> => {
    const result = await api.createOrUpdateProfile(profileData);
    if (result) {
      setProfile(result);
      setShowWizard(false);
      toast.success("Profile created successfully!");
      
      // Generate initial sleep plan
      const plan = await api.generateCoachPlan(email, 'initial');
      if (plan) {
        setCoachPlan(plan);
      }
    } else {
      toast.error(api.error || "Failed to create profile");
    }
    return result;
  };

  // Handler: Profile update
  const handleProfileUpdate = async (profileData: Partial<SleepProfile> & { email: string }): Promise<SleepProfile | null> => {
    const result = await api.createOrUpdateProfile(profileData);
    if (result) {
      setProfile(result);
      toast.success("Profile updated successfully!");
    } else {
      toast.error(api.error || "Failed to update profile");
    }
    return result;
  };

  // Handler: Add sleep log
  const handleLogSubmit = async (log: Partial<SleepLog>): Promise<boolean> => {
    const success = await api.addLog(log);
    if (success) {
      toast.success("Sleep log saved!");
      await loadData(); // Refresh data
    } else {
      toast.error(api.error || "Failed to save log");
    }
    return success;
  };

  // Handler: Update sleep log
  const handleLogUpdate = async (id: string, log: Partial<SleepLog>): Promise<boolean> => {
    const success = await api.updateLog(id, log);
    if (success) {
      toast.success("Sleep log updated!");
      await loadData();
    } else {
      toast.error(api.error || "Failed to update log");
    }
    return success;
  };

  // Handler: Delete sleep log
  const handleLogDelete = async (id: string): Promise<boolean> => {
    const success = await api.deleteLog(id);
    if (success) {
      toast.success("Sleep log deleted");
      await loadData();
    } else {
      toast.error(api.error || "Failed to delete log");
    }
    return success;
  };

  // Handler: Generate coach plan
  const handleGeneratePlan = async (): Promise<void> => {
    const plan = await api.generateCoachPlan(email, 'weekly');
    if (plan) {
      setCoachPlan(plan);
      toast.success("New sleep plan generated!");
    } else {
      toast.error(api.error || "Failed to generate plan");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Loading state
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

  // Not authenticated
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

  // Loading data
  if (isLoadingData && !profile && logs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your sleep data...</p>
        </div>
      </div>
    );
  }

  // Show wizard for new users
  if (showWizard && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to Sleep Coach</h1>
            <p className="text-muted-foreground">Let's set up your profile to get personalized recommendations</p>
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

  // Main dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Moon className="h-6 w-6 text-primary" />
              Sleep Coach Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome back, {email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSignOut} size="sm">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <Moon className="h-4 w-4" />
              <span className="hidden sm:inline">Log Sleep</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Coach Plan */}
              <CoachPlanDisplay 
                plan={coachPlan}
                onGeneratePlan={handleGeneratePlan}
                loading={api.loading}
              />
              
              {/* Quick Stats & Chart */}
              <div className="space-y-6">
                {profile && <ProfileViewer profile={profile} />}
                {logs.length > 0 && (
                  <SleepHistoryChart logs={logs} />
                )}
              </div>
            </div>
          </TabsContent>

          {/* Log Sleep Tab */}
          <TabsContent value="log" className="max-w-xl">
            <SleepLogForm 
              email={email}
              onSubmit={handleLogSubmit}
              loading={api.loading}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <SleepLogTable 
              logs={logs}
              trends={trends}
              onUpdateLog={handleLogUpdate}
              onDeleteLog={handleLogDelete}
            />
            {logs.length > 0 && (
              <SleepHistoryChart logs={logs} />
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="max-w-xl">
            <ProfileForm 
              email={email}
              existingProfile={profile}
              onSubmit={handleProfileUpdate}
              loading={api.loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SleepCoachDashboard;

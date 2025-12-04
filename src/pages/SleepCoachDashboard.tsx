import { useState, useEffect } from "react";
import { useSleepApi, SleepProfile, SleepLog, CoachPlan, TrendData } from "@/hooks/useSleepApi";
import { 
  SleepLogForm, 
  SleepLogTable, 
  SleepHistoryChart, 
  ProfileViewer, 
  ProfileForm, 
  ProfileWizard, 
  CoachPlanDisplay, 
  WhatsAppSimulator 
} from "@/components/sleep-coach";
import { SleepReportSummary } from "@/components/sleep-coach/SleepReportSummary";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Moon, BarChart3, MessageCircle, Loader2, Sparkles, Users, ArrowRight, Lock, ShoppingBag, AlertCircle, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/moon-logo-yellow-transparent.png";

interface AccessStatus {
  hasAccess: boolean;
  accessReason: string;
  affiliateSales: number;
  hasPurchased: boolean;
}

const SleepCoachDashboard = () => {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<SleepProfile | null>(null);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [isVerifyingAccess, setIsVerifyingAccess] = useState(false);

  const { loading, error, fetchProfile, createOrUpdateProfile, fetchLogs, addLog, updateLog, deleteLog, generateCoachPlan, fetchCoachPlan, getWhatsAppMessage } = useSleepApi();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsAuthenticated(true);
        const userEmail = session.user.email || '';
        setEmail(userEmail);
        
        // Verify access first (fast), then load data in background
        await verifyAccess(userEmail);
        setIsCheckingAuth(false);
        
        // Load user data after showing dashboard (slower operations)
        loadUserData(userEmail);
      } else {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        const userEmail = session.user.email || '';
        setEmail(userEmail);
        await verifyAccess(userEmail);
        loadUserData(userEmail);
      } else {
        setIsAuthenticated(false);
        setEmail("");
        setAccessStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const verifyAccess = async (userEmail: string) => {
    setIsVerifyingAccess(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sleep-coach-access', {
        body: { email: userEmail },
      });

      if (error) throw error;
      setAccessStatus(data);
    } catch (e: any) {
      console.error('Error verifying access:', e);
      // Default to allowing access if verification fails (graceful degradation)
      setAccessStatus({ hasAccess: true, accessReason: 'default', affiliateSales: 0, hasPurchased: false });
    } finally {
      setIsVerifyingAccess(false);
    }
  };

  const loadUserData = async (userEmail: string) => {
    const [profileData, logsData, planData] = await Promise.all([
      fetchProfile(userEmail),
      fetchLogs(userEmail),
      fetchCoachPlan(userEmail),
    ]);

    setProfile(profileData);
    setShowWizard(!profileData);
    if (logsData) {
      setLogs(logsData.logs);
      setTrends(logsData.trends);
    }
    
    // Auto-generate plan if: no plan exists, plan is expired, or sleep quality dropped significantly
    if (profileData && !planData) {
      // No plan exists - generate initial plan
      const newPlan = await generateCoachPlan(userEmail, 'initial');
      setPlan(newPlan);
    } else if (planData) {
      const validUntil = new Date(planData.valid_until);
      const now = new Date();
      
      // Check if plan is expired
      if (validUntil < now) {
        const newPlan = await generateCoachPlan(userEmail, 'weekly_update');
        setPlan(newPlan);
      } else if (logsData && shouldRegeneratePlan(logsData.trends, planData)) {
        // Sleep quality dropped significantly - regenerate
        const newPlan = await generateCoachPlan(userEmail, 'weekly_update');
        setPlan(newPlan);
      } else {
        setPlan(planData);
      }
    } else {
      setPlan(planData);
    }
  };

  // Check if plan should be regenerated based on declining sleep quality
  const shouldRegeneratePlan = (trends: TrendData | null, currentPlan: CoachPlan): boolean => {
    if (!trends) return false;
    
    // Only regenerate if trend is worsening and it's been at least 3 days since last plan
    const planDate = new Date(currentPlan.generated_at);
    const daysSincePlan = (Date.now() - planDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return trends.trend === 'worsening' && daysSincePlan >= 3;
  };

  const refreshLogs = async () => {
    const logsData = await fetchLogs(email);
    if (logsData) {
      setLogs(logsData.logs);
      setTrends(logsData.trends);
    }
  };

  const handleAddLog = async (log: any) => {
    const success = await addLog(log);
    if (success) {
      toast({ title: "Sleep logged!", description: "Your sleep data has been saved." });
      await refreshLogs();
    } else {
      toast({ title: "Error", description: error || "Failed to save sleep log", variant: "destructive" });
    }
    return success;
  };

  const handleUpdateLog = async (id: string, log: Partial<SleepLog>) => {
    const success = await updateLog(id, log);
    if (success) {
      toast({ title: "Log updated!", description: "Your sleep data has been updated." });
      await refreshLogs();
    } else {
      toast({ title: "Error", description: error || "Failed to update sleep log", variant: "destructive" });
    }
    return success;
  };

  const handleDeleteLog = async (id: string) => {
    const success = await deleteLog(id);
    if (success) {
      toast({ title: "Log deleted", description: "Your sleep log has been removed." });
      await refreshLogs();
    } else {
      toast({ title: "Error", description: error || "Failed to delete sleep log", variant: "destructive" });
    }
    return success;
  };

  const handleCreateProfile = async (profileData: any) => {
    const result = await createOrUpdateProfile(profileData);
    if (result) {
      setProfile(result);
      setShowWizard(false);
      toast({ title: "Profile saved!", description: "Your sleep profile has been created. Let's generate your personalized plan!" });
      setTimeout(() => handleGeneratePlan(), 500);
    } else {
      toast({ title: "Error", description: error || "Failed to save profile", variant: "destructive" });
    }
    return result;
  };

  const handleGeneratePlan = async () => {
    if (!email) return;
    const newPlan = await generateCoachPlan(email, plan ? 'weekly_update' : 'initial');
    if (newPlan) {
      setPlan(newPlan);
      toast({ title: "Plan generated!", description: "Your personalized sleep plan is ready." });
    } else {
      toast({ title: "Error", description: error || "Failed to generate plan", variant: "destructive" });
    }
  };

  const handleWhatsAppSimulate = async () => {
    if (!email) return null;
    return await getWhatsAppMessage(email);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Loading state
  if (isCheckingAuth || isVerifyingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isCheckingAuth ? "Checking authentication..." : "Verifying access..."}
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt
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

  // Access denied
  if (accessStatus && !accessStatus.hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Access Required</h2>
              <p className="text-muted-foreground">
                To access the Sleep Coach, you need to either:
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <div className="flex items-start gap-3">
                <ShoppingBag className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Purchase a Rise By Night Product</p>
                  <p className="text-sm text-muted-foreground">
                    Customers automatically get free access to the AI Sleep Coach.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Become an Affiliate</p>
                  <p className="text-sm text-muted-foreground">
                    Earn access with 3+ successful referrals and help others sleep better.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/product/ergonomic-pillow" className="flex-1">
                <Button variant="outline" className="w-full">Shop Products</Button>
              </Link>
              <Link to="/affiliate" className="flex-1">
                <Button className="w-full">Join Affiliate</Button>
              </Link>
            </div>
            <Button variant="ghost" onClick={handleSignOut} className="text-muted-foreground">
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main dashboard (authenticated with access)
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Rise By Night" className="h-10 w-10" />
              <div>
                <h1 className="text-xl font-bold">Sleep Coach Dashboard</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Sleep Improvement System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden md:block">{email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {showWizard && !profile && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Welcome to Sleep Coach
              </div>
              <h2 className="text-2xl font-bold mb-2">Let's Create Your Sleep Profile</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Complete this quick setup to unlock your personalized AI sleep plan.
              </p>
            </div>
            <ProfileWizard email={email} onComplete={handleCreateProfile} loading={loading} />
          </div>
        )}

        {!showWizard && (
          <Tabs defaultValue="plan" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-lg mx-auto">
              <TabsTrigger value="plan" className="gap-2">
                <Moon className="h-4 w-4" />
                Sleep Plan
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="report" className="gap-2">
                <FileText className="h-4 w-4" />
                Report
              </TabsTrigger>
              <TabsTrigger value="engagement" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Engagement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plan" className="space-y-6">
              <CoachPlanDisplay plan={plan} onGeneratePlan={handleGeneratePlan} loading={loading} />
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-6">
              <SleepHistoryChart logs={logs} />
              
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  {profile ? (
                    <ProfileViewer profile={profile} />
                  ) : (
                    <ProfileForm email={email} onSubmit={handleCreateProfile} loading={loading} />
                  )}
                  <SleepLogForm email={email} onSubmit={handleAddLog} loading={loading} />
                </div>
                <div className="lg:col-span-2">
                  <SleepLogTable 
                    logs={logs} 
                    trends={trends || { avgSleepQuality: 0, avgPain: 0, trend: 'stable', hotNights: 0, stressedNights: 0, goodNights: 0, poorNights: 0 }}
                    onUpdateLog={handleUpdateLog}
                    onDeleteLog={handleDeleteLog}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="report" className="space-y-6">
              <SleepReportSummary 
                logs={logs} 
                trends={trends || { avgSleepQuality: 0, avgPain: 0, trend: 'stable', hotNights: 0, stressedNights: 0, goodNights: 0, poorNights: 0 }} 
                plan={plan} 
                email={email} 
              />
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <WhatsAppSimulator onSimulate={handleWhatsAppSimulate} loading={loading} />
                {profile && <ProfileForm email={email} existingProfile={profile} onSubmit={handleCreateProfile} loading={loading} />}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Affiliate Program Banner */}
        <Card className="mt-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Help Fellow Sleepers & Earn Commission</h3>
                  <p className="text-sm text-muted-foreground">
                    Join our affiliate program and earn up to 35% commission by helping others improve their sleep.
                  </p>
                </div>
              </div>
              <Link to="/affiliate">
                <Button className="gap-2">
                  Join Affiliate Program
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SleepCoachDashboard;

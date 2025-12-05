import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock, ShoppingBag, Users, Moon, LogOut, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSleepApi } from "@/hooks/useSleepApi";
import type { SleepProfile, SleepLog, CoachPlan, TrendData } from "@/hooks/useSleepApi";
import { StreakDisplay } from "@/components/sleep-coach/StreakDisplay";
import { SleepHistoryChart } from "@/components/sleep-coach/SleepHistoryChart";
import { ProfileViewer } from "@/components/sleep-coach/ProfileViewer";
import { ProfileForm } from "@/components/sleep-coach/ProfileForm";
import { SleepLogForm } from "@/components/sleep-coach/SleepLogForm";
import { SleepLogTable } from "@/components/sleep-coach/SleepLogTable";
import { ProfileWizard } from "@/components/sleep-coach/ProfileWizard";
import { CoachPlanDisplay } from "@/components/sleep-coach/CoachPlanDisplay";
import { WhatsAppSettings } from "@/components/sleep-coach/WhatsAppSettings";
import { toast } from "sonner";

const SleepCoachDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<SleepProfile | null>(null);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [coachPlan, setCoachPlan] = useState<CoachPlan | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const navigate = useNavigate();
  const api = useSleepApi();

  // Calculate streak from logs
  const calculateStreak = (logs: SleepLog[]): number => {
    if (logs.length === 0) return 0;
    
    const sortedDates = [...new Set(logs.map(l => l.created_at.split('T')[0]))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;
    
    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (sortedDates[i] === expectedDate || (i === 0 && sortedDates[i] === yesterday)) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

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

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated && email) {
      loadData();
    }
  }, [isAuthenticated, email]);

  const loadData = async () => {
    if (!email) return;
    setIsLoadingData(true);
    
    try {
      const [profileData, logsData, planData] = await Promise.all([
        api.fetchProfile(email),
        api.fetchLogs(email),
        api.fetchCoachPlan(email),
      ]);
      
      setProfile(profileData);
      if (logsData) {
        setLogs(logsData.logs);
        setTrends(logsData.trends);
      }
      setCoachPlan(planData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleProfileCreate = async (profileData: Partial<SleepProfile> & { email: string }): Promise<SleepProfile | null> => {
    const result = await api.createOrUpdateProfile(profileData);
    if (result) {
      setProfile(result);
      toast.success("Profile created successfully!");
      // Generate initial plan
      const plan = await api.generateCoachPlan(email, 'initial');
      if (plan) setCoachPlan(plan);
      return result;
    }
    return null;
  };

  const handleProfileUpdate = async (profileData: Partial<SleepProfile> & { email: string }): Promise<SleepProfile | null> => {
    const result = await api.createOrUpdateProfile(profileData);
    if (result) {
      setProfile(result);
      setShowProfileForm(false);
      toast.success("Profile updated!");
      return result;
    }
    return null;
  };

  const handleLogSubmit = async (log: Partial<SleepLog>): Promise<boolean> => {
    const success = await api.addLog({ ...log, email });
    if (success) {
      toast.success("Sleep log added!");
      loadData();
      return true;
    } else if (api.error) {
      toast.error(api.error);
    }
    return false;
  };

  const handleLogUpdate = async (id: string, log: Partial<SleepLog>): Promise<boolean> => {
    const success = await api.updateLog(id, log);
    if (success) {
      toast.success("Log updated!");
      loadData();
      return true;
    } else if (api.error) {
      toast.error(api.error);
    }
    return false;
  };

  const handleLogDelete = async (id: string): Promise<boolean> => {
    const success = await api.deleteLog(id);
    if (success) {
      toast.success("Log deleted!");
      loadData();
      return true;
    }
    return false;
  };

  const handleGeneratePlan = async () => {
    const plan = await api.generateCoachPlan(email, 'weekly');
    if (plan) {
      setCoachPlan(plan);
      toast.success("New sleep plan generated!");
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

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your sleep data...</p>
        </div>
      </div>
    );
  }

  // Show profile wizard if no profile exists
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Create Your Sleep Profile</h1>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
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

  const streak = calculateStreak(logs);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sleep Coach Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Sleep Logs</TabsTrigger>
            <TabsTrigger value="plan">AI Coach</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <StreakDisplay streak={streak} />
              <SleepHistoryChart logs={logs} />
            </div>
            
            {trends && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{trends.avgSleepQuality.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">Avg Quality</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{trends.avgPain.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">Avg Pain</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{trends.goodNights}</p>
                      <p className="text-sm text-muted-foreground">Good Nights</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold capitalize">{trends.trend}</p>
                      <p className="text-sm text-muted-foreground">Trend</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <SleepLogForm 
                email={email} 
                onSubmit={handleLogSubmit} 
                loading={api.loading}
              />
              <SleepLogTable 
                logs={logs} 
                trends={trends || { avgSleepQuality: 0, avgPain: 0, trend: 'stable', hotNights: 0, stressedNights: 0, goodNights: 0, poorNights: 0 }}
                onUpdateLog={handleLogUpdate}
                onDeleteLog={handleLogDelete}
              />
            </div>
          </TabsContent>

          <TabsContent value="plan" className="space-y-6">
            <CoachPlanDisplay 
              plan={coachPlan} 
              onGeneratePlan={handleGeneratePlan}
              loading={api.loading}
            />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            {showProfileForm ? (
              <ProfileForm 
                email={email}
                existingProfile={profile}
                onSubmit={handleProfileUpdate}
                loading={api.loading}
              />
            ) : (
              <>
                <ProfileViewer profile={profile} />
                <div className="flex gap-2">
                  <Button onClick={() => setShowProfileForm(true)}>
                    Edit Profile
                  </Button>
                </div>
              </>
            )}
            
            <WhatsAppSettings 
              whatsappEnabled={profile?.whatsapp_enabled || false}
              whatsappPhone={profile?.whatsapp_phone || null}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SleepCoachDashboard;

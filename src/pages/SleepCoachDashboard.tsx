import { useState } from "react";
import { useSleepApi, SleepProfile, SleepLog, CoachPlan, TrendData } from "@/hooks/useSleepApi";
import { SleepLogForm, SleepLogTable, ProfileViewer, ProfileForm, ProfileWizard, CoachPlanDisplay, WhatsAppSimulator } from "@/components/sleep-coach";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Moon, BarChart3, MessageCircle, Loader2, Sparkles } from "lucide-react";
import logo from "@/assets/moon-logo-yellow-transparent.png";

const SleepCoachDashboard = () => {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [profile, setProfile] = useState<SleepProfile | null>(null);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const { loading, error, fetchProfile, createOrUpdateProfile, fetchLogs, addLog, generateCoachPlan, fetchCoachPlan, getWhatsAppMessage } = useSleepApi();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    
    setIsSearching(true);
    setEmail(searchEmail.trim().toLowerCase());
    
    const [profileData, logsData, planData] = await Promise.all([
      fetchProfile(searchEmail.trim().toLowerCase()),
      fetchLogs(searchEmail.trim().toLowerCase()),
      fetchCoachPlan(searchEmail.trim().toLowerCase()),
    ]);

    setProfile(profileData);
    setShowWizard(!profileData); // Show wizard if no profile exists
    if (logsData) {
      setLogs(logsData.logs);
      setTrends(logsData.trends);
    }
    setPlan(planData);
    setIsSearching(false);
  };

  const handleAddLog = async (log: any) => {
    const success = await addLog(log);
    if (success) {
      toast({ title: "Sleep logged!", description: "Your sleep data has been saved." });
      // Refresh logs
      const logsData = await fetchLogs(email);
      if (logsData) {
        setLogs(logsData.logs);
        setTrends(logsData.trends);
      }
    } else {
      toast({ title: "Error", description: error || "Failed to save sleep log", variant: "destructive" });
    }
    return success;
  };

  const handleCreateProfile = async (profileData: any) => {
    const result = await createOrUpdateProfile(profileData);
    if (result) {
      setProfile(result);
      setShowWizard(false);
      toast({ title: "Profile saved!", description: "Your sleep profile has been created. Let's generate your personalized plan!" });
      // Auto-generate initial plan after profile creation
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
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <Card className="mb-8 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter customer email to load their data..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-base"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !searchEmail.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                {isSearching ? "Loading..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {email && showWizard && !profile && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                New User Detected
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Rise By Night Sleep Coach!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Let's create a personalized sleep profile for <span className="font-medium text-foreground">{email}</span> to unlock AI-powered recommendations.
              </p>
            </div>
            <ProfileWizard email={email} onComplete={handleCreateProfile} loading={loading} />
          </div>
        )}

        {email && !showWizard && (
          <Tabs defaultValue="plan" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="plan" className="gap-2">
                <Moon className="h-4 w-4" />
                Sleep Plan
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
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
                  <SleepLogTable logs={logs} trends={trends || { avgSleepQuality: 0, avgPain: 0, trend: 'stable', hotNights: 0, stressedNights: 0, goodNights: 0, poorNights: 0 }} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <WhatsAppSimulator onSimulate={handleWhatsAppSimulate} loading={loading} />
                {profile && <ProfileForm email={email} existingProfile={profile} onSubmit={handleCreateProfile} loading={loading} />}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!email && (
          <div className="text-center py-16">
            <Moon className="h-16 w-16 text-primary/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enter an email to get started</h2>
            <p className="text-muted-foreground">Search for a customer to view their sleep data and AI coach plan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SleepCoachDashboard;

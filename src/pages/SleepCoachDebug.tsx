import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Bug, ArrowLeft } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Only render if debug mode is enabled
const isDebugEnabled = import.meta.env.VITE_SHOW_SLEEP_DEBUG === 'true';

interface QuizProfile {
  email: string;
  sleep_position: string;
  pain_points: string[];
  temperature_preference: string;
  stress_level: string;
  wake_up_condition: string;
  quiz_completed: boolean;
  quiz_completed_at: string;
}

interface CoachPlanSummary {
  id: string;
  generated_at: string;
  plan_type: string;
  quiz_snapshot: Record<string, unknown> | null;
}

const SleepCoachDebug = () => {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<QuizProfile | null>(null);
  const [plans, setPlans] = useState<CoachPlanSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      
      setEmail(session.user.email);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('sleep_profiles')
        .select('email, sleep_position, pain_points, temperature_preference, stress_level, wake_up_condition, quiz_completed, quiz_completed_at')
        .eq('email', session.user.email)
        .maybeSingle();

      if (profileError) {
        console.error('[Debug] Profile fetch error:', profileError);
      }
      setProfile(profileData as QuizProfile | null);

      // Fetch last 3 plans
      const { data: plansData, error: plansError } = await supabase
        .from('coach_plans')
        .select('id, generated_at, plan_type, sleep_plan')
        .eq('email', session.user.email)
        .order('generated_at', { ascending: false })
        .limit(3);

      if (plansError) {
        console.error('[Debug] Plans fetch error:', plansError);
      }

      // Extract quiz_snapshot from sleep_plan
      const planSummaries: CoachPlanSummary[] = (plansData || []).map((p) => ({
        id: p.id,
        generated_at: p.generated_at,
        plan_type: p.plan_type || null,
        quiz_snapshot: p.sleep_plan && typeof p.sleep_plan === 'object' && !Array.isArray(p.sleep_plan)
          ? ((p.sleep_plan as Record<string, unknown>).quiz_snapshot as Record<string, unknown> | null) ?? null
          : null,
      }));
      setPlans(planSummaries);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDebugEnabled) {
      fetchDebugData();
    }
  }, []);

  // Redirect if debug mode is disabled
  if (!isDebugEnabled) {
    return <Navigate to="/sleep-coach" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold">Sleep Coach Debug View</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchDebugData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/sleep-coach">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-8 flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading debug data...</span>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4 text-destructive">
              Error: {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* User Email */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Current User</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-sm bg-muted px-2 py-1 rounded">{email || 'Not logged in'}</code>
              </CardContent>
            </Card>

            {/* Quiz Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quiz Profile (sleep_profiles)</CardTitle>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-sm">No profile found</p>
                )}
              </CardContent>
            </Card>

            {/* Last 3 Plans */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last 3 Coach Plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plans.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No plans found</p>
                ) : (
                  plans.map((plan) => (
                    <div key={plan.id} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Plan ID: <code className="bg-muted px-1 rounded">{plan.id.slice(0, 8)}...</code></span>
                        <span className="text-muted-foreground">{new Date(plan.generated_at).toLocaleString()}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Type:</span> {plan.plan_type || 'N/A'}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">quiz_snapshot:</p>
                        {plan.quiz_snapshot ? (
                          <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(plan.quiz_snapshot, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No quiz_snapshot</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SleepCoachDebug;

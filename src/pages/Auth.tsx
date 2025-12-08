import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Moon, ShoppingBag, Users, AlertCircle } from "lucide-react";
import logo from "@/assets/moon-logo-yellow-transparent.png";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const returnTo = searchParams.get("returnTo") || "/";
  const prefilledEmail = searchParams.get("email");
  const context = searchParams.get("context"); // 'sleep-coach' or null

  const isSleepCoachContext = context === "sleep-coach";

  useEffect(() => {
    // Pre-fill email if provided
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(returnTo);
      }
    });

    // Store referral code in session storage if present
    if (referralCode) {
      sessionStorage.setItem("referral_code", referralCode);
    }
  }, [navigate, referralCode, prefilledEmail, returnTo]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${returnTo}`,
            data: {
              referral_code: sessionStorage.getItem("referral_code"),
              sleep_coach_email: isSleepCoachContext ? email : undefined,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Please check your email to verify your account",
        });

        // Clear referral code from storage after use
        sessionStorage.removeItem("referral_code");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have successfully signed in",
        });

        navigate(returnTo);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isSleepCoachContext && (
            <div className="flex justify-center mb-4">
              <img src={logo} alt="Rise By Night" className="h-16 w-16" />
            </div>
          )}
          <CardTitle className="text-2xl">
            {isSleepCoachContext 
              ? (isSignUp ? "Create Your Sleep Coach Account" : "Access Your Sleep Plan")
              : (isSignUp ? "Create Account" : "Sign In")
            }
          </CardTitle>
          <CardDescription>
            {isSleepCoachContext
              ? (isSignUp 
                  ? "Get access to your personalized AI sleep coaching dashboard"
                  : "Sign in to view your personalized sleep plan")
              : (isSignUp
                  ? "Join Rise By Night and start your journey to better sleep"
                  : "Welcome back! Sign in to your account")
            }
          </CardDescription>
          {referralCode && (
            <p className="text-sm text-primary font-medium mt-2">
              🎉 You were referred by a friend!
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Access Requirements Info - Only show on signup in sleep coach context */}
          {isSleepCoachContext && isSignUp && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-2">Sleep Coach Access Requirements</p>
                  <p className="text-muted-foreground mb-2">
                    The AI Sleep Coach is available to:
                  </p>
                </div>
              </div>
              <div className="space-y-2 ml-7">
                <div className="flex items-center gap-2 text-sm">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span>Rise By Night customers (purchased any product)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Affiliates with 3+ successful referrals</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Moon className="h-4 w-4 text-primary" />
                  <span>Quiz completers with a sleep profile</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                Your access will be verified using your account email.
              </p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {isSignUp && <PasswordStrengthIndicator password={password} />}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

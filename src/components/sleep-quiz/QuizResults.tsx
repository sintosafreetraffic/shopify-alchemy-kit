// Performance: Extracted from SleepQuiz.tsx for better code splitting and re-render isolation
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  AlertCircle, 
  Moon, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2 
} from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import {
  type AnalysisResult,
  type QuizAnswers,
  deriveDetectedIssues,
  convertToIssuePresentation,
} from "@/components/sleep-quiz";

interface QuizResultsProps {
  results: AnalysisResult;
  answers: QuizAnswers;
  visibleQuestionCount: number;
  isRetake: boolean;
  shouldNotifyQuizUpdated: boolean;
  email: string;
  // Account creation state
  showAccountForm: boolean;
  setShowAccountForm: (show: boolean) => void;
  accountExists: boolean | null;
  isCheckingAccount: boolean;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  isSubmitting: boolean;
  // Handlers
  onUnlockSleepCoach: () => void;
  onAccountSubmit: () => void;
  onForgotPassword: () => void;
  onGoToSleepCoach: () => void;
  onBackToHome: () => void;
  onViewProducts: () => void;
  onCancelAccountForm: () => void;
}

const QuizResults = memo(function QuizResults({
  results,
  answers,
  visibleQuestionCount,
  isRetake,
  shouldNotifyQuizUpdated,
  email,
  showAccountForm,
  setShowAccountForm,
  accountExists,
  isCheckingAccount,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
  onUnlockSleepCoach,
  onAccountSubmit,
  onForgotPassword,
  onGoToSleepCoach,
  onBackToHome,
  onViewProducts,
  onCancelAccountForm,
}: QuizResultsProps) {
  const detectedIssues = results.detectedIssues || deriveDetectedIssues(answers);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-border">
        <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
        <h2 className="text-2xl font-bold mb-2">Your Sleep Assessment</h2>
        <p className="text-muted-foreground">
          Personalized analysis based on your {visibleQuestionCount} responses
        </p>
      </div>

      {/* Assessment Summary */}
      <div className="p-4 rounded-xl bg-secondary/30 border border-border">
        <p className="text-foreground leading-relaxed">{results.assessment}</p>
      </div>

      {/* Detected Issues */}
      {detectedIssues.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Areas for Improvement
          </h3>
          <div className="space-y-2">
            {detectedIssues.map((issue, idx) => {
              const presentation = convertToIssuePresentation(issue);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                >
                  <p className="text-sm font-medium text-foreground">
                    {presentation.plain}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {presentation.clinical}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sleep Coach CTA */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-background border-primary/30">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Moon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-2">
              {results.profileCreated
                ? "Your AI Sleep Coach Is Ready"
                : "Unlock Your AI Sleep Coach"}
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              {results.profileCreated
                ? "Access your personalized 7-day sleep improvement plan."
                : "Create a free account to access your personalized plan."}
            </p>

            {results.profileCreated ? (
              <Button
                onClick={onGoToSleepCoach}
                className="w-full rounded-lg"
                size="lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Continue to My Sleep Coach
              </Button>
            ) : !showAccountForm ? (
              <Button
                onClick={onUnlockSleepCoach}
                className="w-full rounded-lg"
                size="lg"
              >
                <Lock className="w-4 h-4 mr-2" />
                Unlock Sleep Coach
              </Button>
            ) : (
              <div className="space-y-4">
                {isCheckingAccount ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Checking account...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-sm font-medium">
                        {accountExists ? "Welcome back!" : "Create your account"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {accountExists
                          ? `Enter your password (${email})`
                          : `Enter a password (${email})`}
                      </p>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={
                          accountExists
                            ? "Enter your password"
                            : "Create a password"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onAccountSubmit()}
                        className="pl-12 pr-12 h-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {!accountExists && password && (
                      <PasswordStrengthIndicator password={password} />
                    )}
                    <Button
                      onClick={onAccountSubmit}
                      disabled={isSubmitting || !password.trim()}
                      className="w-full rounded-lg"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {accountExists
                        ? "Login & Access Sleep Coach"
                        : "Create Account & Continue"}
                    </Button>
                    {accountExists && (
                      <button
                        onClick={onForgotPassword}
                        className="w-full text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                    <button
                      onClick={onCancelAccountForm}
                      className="w-full text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Footer Actions */}
      <div className="flex gap-4 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onBackToHome}
          className="flex-1 rounded-lg"
        >
          Back to Home
        </Button>
        {!results.profileCreated && (
          <Button onClick={onViewProducts} className="flex-1 rounded-lg">
            View Products
          </Button>
        )}
      </div>
    </div>
  );
});

export default QuizResults;

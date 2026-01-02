/**
 * Coach Onboarding Wizard
 * First-time experience for new coach users
 * 
 * Requirements:
 * - 4 steps max: What this is, daily routine, data inputs, notifications
 * - Show on first coach access only
 * - Persist completion flag to DB (with localStorage cache)
 * - Calm, Scandinavian minimal UI
 * - Skip option available
 * - Analytics: RBN_Coach_Onboarding_Started/Completed/Skipped
 */
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trackEvent } from "@/lib/analytics";
import { Moon, Clock, Activity, Bell, ChevronRight, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "rbn_coach_onboarding_completed";

interface CoachOnboardingWizardProps {
  onComplete: () => void;
}

interface Step {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  details: string[];
}

const STEPS: Step[] = [
  {
    id: "intro",
    icon: Moon,
    title: "Your personal sleep coach",
    description: "Evidence-based guidance to help you sleep better, naturally.",
    details: [
      "Personalized recommendations based on your sleep patterns",
      "Weekly plans that adapt to your progress",
      "Educational content, not medical advice",
    ],
  },
  {
    id: "daily",
    icon: Clock,
    title: "Just a few minutes each day",
    description: "Small consistent actions lead to lasting improvements.",
    details: [
      "Quick daily check-in (under 2 minutes)",
      "Simple sleep quality rating each morning",
      "Optional notes to track what works for you",
    ],
  },
  {
    id: "data",
    icon: Activity,
    title: "Better data, better insights",
    description: "Connect your wearable for automatic tracking.",
    details: [
      "Garmin and other devices supported",
      "Automatic sleep detection and scoring",
      "Completely optional—manual logging works too",
    ],
  },
  {
    id: "ready",
    icon: CheckCircle2,
    title: "You're all set",
    description: "Your first personalized plan is ready.",
    details: [
      "Start with today's recommended actions",
      "Check back each morning to log your sleep",
      "Your plan will adapt as we learn more",
    ],
  },
];

export const CoachOnboardingWizard = ({ onComplete }: CoachOnboardingWizardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasStartedTracking, setHasStartedTracking] = useState(false);

  // Check if onboarding was already completed
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed !== "true") {
      setIsOpen(true);
    }
  }, []);

  // Track start event once
  useEffect(() => {
    if (isOpen && !hasStartedTracking) {
      trackEvent("RBN_Coach_Onboarding_Started", {
        timestamp: new Date().toISOString(),
      });
      setHasStartedTracking(true);
    }
  }, [isOpen, hasStartedTracking]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    trackEvent("RBN_Coach_Onboarding_Completed", {
      steps_viewed: currentStep + 1,
      timestamp: new Date().toISOString(),
    });
    setIsOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    trackEvent("RBN_Coach_Onboarding_Skipped", {
      skipped_at_step: currentStep + 1,
      step_id: STEPS[currentStep].id,
      timestamp: new Date().toISOString(),
    });
    setIsOpen(false);
    onComplete();
  };

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="mb-2">
          <Progress value={progress} className="h-1" />
        </div>

        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 bg-primary/10 p-4 rounded-full w-fit">
            <StepIcon className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step details */}
        <div className="py-4 space-y-3">
          {step.details.map((detail, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 text-primary">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-foreground">{detail}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer on first step */}
        {currentStep === 0 && (
          <p className="text-xs text-muted-foreground text-center border-t pt-4">
            For educational purposes only. Not medical advice. Consult a healthcare provider for sleep disorders.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleNext} size="lg" className="w-full">
            {isLastStep ? "Get Started" : "Continue"}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            Skip for now
          </Button>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1 pt-2">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-primary"
                  : index < currentStep
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook to check if onboarding should be shown
 * Uses DB persistence with localStorage cache for fast UX
 */
export const useCoachOnboarding = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check both localStorage (fast) and DB (authoritative)
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Fast path: check localStorage first
      const localCompleted = localStorage.getItem(STORAGE_KEY);
      if (localCompleted === "true") {
        setShouldShowOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Check DB for authoritative state
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          // Not authenticated, use localStorage only
          setShouldShowOnboarding(localCompleted !== "true");
          setIsLoading(false);
          return;
        }

        const { data: engagementData } = await supabase
          .from("engagement_meta")
          .select("coach_onboarding_completed_at")
          .eq("email", user.email)
          .maybeSingle();

        if (engagementData?.coach_onboarding_completed_at) {
          // Already completed in DB, sync localStorage
          localStorage.setItem(STORAGE_KEY, "true");
          setShouldShowOnboarding(false);
        } else {
          // Not completed, show onboarding
          setShouldShowOnboarding(true);
        }
      } catch (error) {
        console.error("[CoachOnboarding] Error checking status:", error);
        // Fallback to localStorage
        setShouldShowOnboarding(localCompleted !== "true");
      }
      
      setIsLoading(false);
    };

    checkOnboardingStatus();
  }, []);

  // Mark complete in both localStorage AND database
  const markComplete = useCallback(async () => {
    // Immediate localStorage update for fast UX
    localStorage.setItem(STORAGE_KEY, "true");
    setShouldShowOnboarding(false);

    // Persist to DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const now = new Date().toISOString();
      
      // Upsert to engagement_meta
      const { error } = await supabase
        .from("engagement_meta")
        .upsert({
          email: user.email,
          coach_onboarding_completed_at: now,
          last_seen_at: now,
          updated_at: now,
        }, {
          onConflict: "email",
        });

      if (error) {
        console.error("[CoachOnboarding] Error saving to DB:", error);
      } else {
        console.log("[CoachOnboarding] Completion saved to DB");
      }
    } catch (error) {
      console.error("[CoachOnboarding] Error persisting completion:", error);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setShouldShowOnboarding(true);

    // Also reset in DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      await supabase
        .from("engagement_meta")
        .update({ coach_onboarding_completed_at: null })
        .eq("email", user.email);
    } catch (error) {
      console.error("[CoachOnboarding] Error resetting in DB:", error);
    }
  }, []);

  return {
    shouldShowOnboarding,
    isLoading,
    markComplete,
    resetOnboarding,
  };
};

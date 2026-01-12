/**
 * OnboardingChecklist Component
 * 
 * In-dashboard onboarding module for new affiliates.
 * Tracks completion of key setup steps and provides guidance.
 * 
 * Studies show 50-70% of new affiliates become inactive within 14 days
 * without proper onboarding. This component addresses that risk.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Play, ExternalLink, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  isComplete: boolean;
}

interface OnboardingChecklistProps {
  referralCode: string;
  hasDiscountCodes: boolean;
  hasFirstSale: boolean;
  hasUGCSubmission: boolean;
  onCopyLink: () => void;
  onCreateCode: () => void;
  onDismiss?: () => void;
}

export function OnboardingChecklist({
  referralCode,
  hasDiscountCodes,
  hasFirstSale,
  hasUGCSubmission,
  onCopyLink,
  onCreateCode,
  onDismiss,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check localStorage for dismissal
  useEffect(() => {
    const isDismissed = localStorage.getItem(`onboarding_dismissed_${referralCode}`);
    if (isDismissed === "true") {
      setDismissed(true);
    }
  }, [referralCode]);

  const handleDismiss = () => {
    localStorage.setItem(`onboarding_dismissed_${referralCode}`, "true");
    setDismissed(true);
    onDismiss?.();
  };

  const handleCopyLink = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps: OnboardingStep[] = [
    {
      id: "copy_link",
      title: "Copy your referral link",
      description: "Share this link to start earning commissions",
      action: {
        label: copied ? "Copied!" : "Copy Link",
        onClick: handleCopyLink,
      },
      isComplete: true, // Always completable
    },
    {
      id: "create_code",
      title: "Create a discount code",
      description: "Codes drive 40-60% of affiliate sales",
      action: {
        label: hasDiscountCodes ? "View Codes" : "Create Code",
        onClick: onCreateCode,
      },
      isComplete: hasDiscountCodes,
    },
    {
      id: "first_sale",
      title: "Get your first sale",
      description: "Share your link or code with your audience",
      isComplete: hasFirstSale,
    },
    {
      id: "submit_ugc",
      title: "Submit content for approval",
      description: "Get featured on our homepage and earn credibility",
      action: {
        label: "Go to Content Tab",
        href: "#content",
      },
      isComplete: hasUGCSubmission,
    },
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const progress = (completedCount / steps.length) * 100;
  const allComplete = completedCount === steps.length;

  // Don't show if dismissed or all complete
  if (dismissed || allComplete) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Sparkles className="h-5 w-5 text-primary" />
              Getting Started
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps to maximize your earnings
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
            Dismiss
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{completedCount} of {steps.length} complete</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                step.isComplete
                  ? "bg-green-50/50"
                  : index === steps.findIndex((s) => !s.isComplete)
                  ? "bg-card border"
                  : "opacity-60"
              }`}
            >
              {/* Completion indicator */}
              <div className="mt-0.5">
                {step.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${step.isComplete ? "text-green-700" : ""}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>

              {/* Action button */}
              {step.action && !step.isComplete && (
                <div className="shrink-0">
                  {step.action.href ? (
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-8 text-xs"
                    >
                      <a href={step.action.href}>{step.action.label}</a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={step.action.onClick}
                      className="h-8 text-xs"
                    >
                      {step.id === "copy_link" && copied ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : null}
                      {step.action.label}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Video link */}
        <div className="mt-4 pt-4 border-t">
          <a
            href="https://www.risebynight.com/affiliate-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Play className="h-4 w-4" />
            Watch: How to succeed as an affiliate
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

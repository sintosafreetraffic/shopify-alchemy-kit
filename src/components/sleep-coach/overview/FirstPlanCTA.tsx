/**
 * FirstPlanCTA - Prominent CTA for purchasers with 0 coach plans
 * 
 * TASK_01: Force First Coach Action
 * Shows only to purchasers (products_owned.length > 0) who have no coach_plan
 * 
 * Design: Premium Scandinavian, non-blocking, calm yet action-oriented
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Moon, ArrowRight, Loader2 } from "lucide-react";

interface FirstPlanCTAProps {
  onGeneratePlan: () => void;
  isLoading?: boolean;
}

export function FirstPlanCTA({ onGeneratePlan, isLoading }: FirstPlanCTAProps) {
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Subtle decorative element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <CardContent className="pt-8 pb-8 px-6 relative">
        <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Moon className="h-8 w-8 text-primary" />
          </div>
          
          {/* Headline */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Your Personalized Sleep Plan Awaits
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Based on your sleep profile and purchase, we'll create a science-backed 
              weekly plan tailored to your unique sleep patterns.
            </p>
          </div>
          
          {/* Primary CTA */}
          <Button 
            size="lg" 
            onClick={onGeneratePlan}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[240px] h-12 text-base font-medium shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Your Plan...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Your First Sleep Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          {/* Subtle reassurance */}
          <p className="text-xs text-muted-foreground/70">
            Takes about 10 seconds • Personalized to your profile
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Mail, Check, Info, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuizEmailStepProps {
  email: string;
  onEmailChange: (email: string) => void;
}

export const QuizEmailStep = memo(function QuizEmailStep({
  email,
  onEmailChange,
}: QuizEmailStepProps) {
  return (
    <div className="space-y-6">
      {/* Plan building banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Your plan is being created</p>
          <p className="text-xs text-muted-foreground">Just enter your email to see your personalized results.</p>
        </div>
      </div>
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground">
            Where should we send your results?
          </h2>
          <p className="text-muted-foreground mt-2">
            We'll show you your personalized sleep assessment and product recommendations right away.
          </p>
        </div>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button className="flex-shrink-0 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
              <Info className="w-5 h-5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="left" 
            className="max-w-xs p-4 text-sm bg-popover border border-border shadow-lg"
            sideOffset={8}
          >
            <p className="font-medium text-popover-foreground mb-1">Why we ask this</p>
            <p className="text-popover-foreground/80 leading-relaxed">
              Your email helps us save your assessment and send personalized sleep tips. We never spam.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="pl-12 h-14 text-base rounded-xl border-border focus:border-primary"
          />
        </div>
        
        {/* What they'll get */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border">
          <p className="text-sm font-medium text-foreground mb-3">You'll instantly receive:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              <span>Your personalized sleep assessment</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              <span>Product recommendations for your profile</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              <span>Optional: Free access to AI Sleep Coach</span>
            </li>
          </ul>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          By continuing, you agree to receive your assessment results and occasional sleep tips. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
});

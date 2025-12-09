import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Check, ArrowRight, Info, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { QuizQuestion as QuizQuestionType, QuizAnswers } from "./QuizConfig";
import { toast } from "sonner";

interface QuizQuestionProps {
  question: QuizQuestionType;
  answers: QuizAnswers;
  contextualInsight: string | null;
  onRadioChange: (questionId: string, value: string) => void;
  onCheckboxChange: (questionId: string, value: string, maxSelections?: number) => void;
  onSliderChange: (questionId: string, value: number[]) => void;
  onContinue: () => void;
}

export const QuizQuestion = memo(function QuizQuestion({
  question,
  answers,
  contextualInsight,
  onRadioChange,
  onCheckboxChange,
  onSliderChange,
  onContinue,
}: QuizQuestionProps) {
  const { id, type, options, optional, subtitle, maxSelections, min, max, labels, tooltip } = question;

  const renderContent = () => {
    if (type === "radio") {
      const currentValue = answers[id] as string || "";
      return (
        <div className="space-y-3">
          {options?.map((option) => {
            const isSelected = currentValue === option.value;
            
            return (
              <div 
                key={option.value} 
                className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
                onClick={() => onRadioChange(id, option.value)}
              >
                <div 
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <span className="flex-1 text-base text-foreground">
                  {option.label}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (type === "checkbox") {
      const currentAnswers = (answers[id] as string[]) || [];
      const hasSelection = currentAnswers.length > 0;
      
      return (
        <div className="space-y-3">
          {options?.map((option) => {
            const isChecked = currentAnswers.includes(option.value);
            
            return (
              <div 
                key={option.value} 
                className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isChecked 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
                onClick={() => onCheckboxChange(id, option.value, maxSelections)}
              >
                <div 
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isChecked 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  }`}
                >
                  {isChecked && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
                <span className="flex-1 text-base text-foreground">
                  {option.label}
                </span>
              </div>
            );
          })}
          
          {hasSelection && (
            <Button 
              onClick={onContinue}
              className="w-full mt-4 h-12 rounded-xl"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      );
    }
    
    if (type === "slider") {
      const value = (answers[id] as number) ?? 5;
      return (
        <div className="py-8 px-4">
          <div className="mb-8">
            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-primary">{value}</span>
              <span className="text-2xl text-muted-foreground ml-1">/ {max}</span>
            </div>
            <Slider
              value={[value]}
              onValueChange={(val) => onSliderChange(id, val)}
              min={min}
              max={max}
              step={1}
              className="w-full"
            />
          </div>
          {labels && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{labels[min!]}</span>
              <span>{labels[Math.floor((max! - min!) / 2)]}</span>
              <span>{labels[max!]}</span>
            </div>
          )}
          
          <Button 
            onClick={onContinue}
            className="w-full mt-6 h-12 rounded-xl"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Question Header with Tooltip */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
            {question.question}
            {optional && (
              <span className="text-muted-foreground text-sm font-normal ml-2">(optional)</span>
            )}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
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
              {tooltip}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Question Content */}
      <div className="min-h-[200px]">
        {renderContent()}
      </div>
      
      {/* Contextual insight */}
      {contextualInsight && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-primary">{contextualInsight}</p>
        </div>
      )}
    </div>
  );
});

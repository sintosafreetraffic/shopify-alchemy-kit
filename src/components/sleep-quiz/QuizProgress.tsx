import { memo } from "react";
import { Check } from "lucide-react";
import { SECTIONS } from "./QuizConfig";
import { getProgressMicrocopy } from "./QuizHelpers";

interface QuizProgressProps {
  sectionInfo: {
    sectionIndex: number;
    sectionName: string;
  } | null;
  progressPercent: number;
  completedSections: number[];
  isEmailStep: boolean;
}

export const QuizProgress = memo(function QuizProgress({
  sectionInfo,
  progressPercent,
  completedSections,
  isEmailStep,
}: QuizProgressProps) {
  return (
    <div className="mb-8">
      {/* Section indicator */}
      {sectionInfo && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">
              Step {sectionInfo.sectionIndex + 1} of 5
            </span>
            <span className="text-sm text-muted-foreground">—</span>
            <span className="text-sm font-medium text-foreground">
              {sectionInfo.sectionName}
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">{progressPercent}%</span>
        </div>
      )}
      
      {isEmailStep && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">Step 5 of 5</span>
            <span className="text-sm text-muted-foreground">—</span>
            <span className="text-sm font-medium text-foreground">Personal details & plan delivery</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">{progressPercent}%</span>
        </div>
      )}
      
      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Section completion indicators */}
      <div className="flex justify-between mt-3">
        {SECTIONS.slice(0, 5).map((section, idx) => (
          <div key={section.id} className="flex items-center gap-1">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              completedSections.includes(idx) 
                ? "bg-success text-success-foreground" 
                : sectionInfo?.sectionIndex === idx 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground"
            }`}>
              {completedSections.includes(idx) ? (
                <Check className="w-3 h-3" />
              ) : (
                idx + 1
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Progress microcopy */}
      <p className="text-sm text-muted-foreground text-center mt-4">
        {getProgressMicrocopy(progressPercent)}
      </p>
    </div>
  );
});

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

/**
 * QuizProgress - Displays progress through the assessment.
 * Shows section name and visual progress bar without step counts.
 * Calm, scientific framing aligned with 2025 funnel.
 */
export const QuizProgress = memo(function QuizProgress({
  sectionInfo,
  progressPercent,
  completedSections,
  isEmailStep,
}: QuizProgressProps) {
  return (
    <div className="mb-8">
      {/* Section indicator - shows current focus area, no step count */}
      {sectionInfo && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            {sectionInfo.sectionName}
          </span>
          <span className="text-sm text-muted-foreground font-medium">{progressPercent}%</span>
        </div>
      )}
      
      {isEmailStep && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            Personal details
          </span>
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
      
      {/* Section completion indicators - visual only, no numbers */}
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
                <span className="w-2 h-2 rounded-full bg-current opacity-40" />
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

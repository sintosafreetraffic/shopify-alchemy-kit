/**
 * ValentinesCountdown
 * 
 * Minimal countdown timer component for Valentine's offer.
 * Scandinavian-calm design - text-based, not flashy.
 */

import { useValentinesCountdown, useValentinesOffer } from "@/hooks/useValentinesOffer";
import { Clock } from "lucide-react";

interface ValentinesCountdownProps {
  variant?: "inline" | "block";
  showIcon?: boolean;
  className?: string;
}

export const ValentinesCountdown = ({ 
  variant = "inline", 
  showIcon = true,
  className = "" 
}: ValentinesCountdownProps) => {
  const countdown = useValentinesCountdown();
  const { isActive, urgency, style } = useValentinesOffer();

  if (!isActive) return null;

  const timeBlocks = [
    { value: countdown.days, label: "days" },
    { value: countdown.hours, label: "hrs" },
    { value: countdown.minutes, label: "min" },
    { value: countdown.seconds, label: "sec" },
  ].filter(block => countdown.days > 0 || block.label !== "days");

  if (variant === "block") {
    return (
      <div 
        className={`rounded-lg p-3 text-center ${className}`}
        style={{ backgroundColor: style.backgroundColor, borderColor: style.borderColor, borderWidth: 1 }}
      >
        <p className="text-xs font-medium mb-2" style={{ color: style.accentColor }}>
          {urgency.countdownLabel}
        </p>
        <div className="flex justify-center gap-2">
          {timeBlocks.map((block) => (
            <div key={block.label} className="text-center">
              <div 
                className="text-lg font-bold tabular-nums"
                style={{ color: style.accentColor }}
              >
                {String(block.value).padStart(2, '0')}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {block.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`flex items-center gap-1.5 text-sm ${className}`}>
      {showIcon && <Clock className="w-4 h-4" style={{ color: style.accentColor }} />}
      <span className="text-muted-foreground">{urgency.countdownLabel}:</span>
      <span className="font-semibold tabular-nums" style={{ color: style.accentColor }}>
        {countdown.days > 0 && `${countdown.days}d `}
        {String(countdown.hours).padStart(2, '0')}:
        {String(countdown.minutes).padStart(2, '0')}:
        {String(countdown.seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

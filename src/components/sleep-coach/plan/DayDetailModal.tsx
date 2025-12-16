/**
 * DayDetailModal - Full day plan detail with actions and reflections
 * 
 * Premium Scandinavian aesthetic with swipe navigation
 * Shows morning, evening, environment, behavioral focus
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface DayPlan {
  focus: string;
  morning_mobility: string;
  evening_wind_down: string;
  environment_adjustment: string;
  behavioral_focus: string;
  product_cue?: string;
}

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: string;
  dayPlan: DayPlan | null;
  completedActions: string[];
  reflection?: string;
  onToggleAction: (dayName: string, actionId: string, completed: boolean) => void;
  onSaveReflection: (dayName: string, note: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  dayStatus?: "not_started" | "in_progress" | "completed";
}

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// Monoline sun icon
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" stroke="#8E98A3" strokeWidth="1.5" opacity="0.8"/>
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93" stroke="#8E98A3" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
  </svg>
);

// Monoline moon icon
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#8E98A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
  </svg>
);

// Monoline environment icon
const EnvironmentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#8E98A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
    <polyline points="9,22 9,12 15,12 15,22" stroke="#8E98A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
  </svg>
);

// Monoline focus icon
const FocusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#8E98A3" strokeWidth="1.5" opacity="0.8"/>
    <circle cx="12" cy="12" r="3" stroke="#8E98A3" strokeWidth="1.5" opacity="0.8"/>
  </svg>
);

export function DayDetailModal({
  isOpen,
  onClose,
  dayName,
  dayPlan,
  completedActions,
  reflection: savedReflection,
  onToggleAction,
  onSaveReflection,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
  dayStatus = "not_started",
}: DayDetailModalProps) {
  const [reflection, setReflection] = useState(savedReflection || "");
  const [isClosing, setIsClosing] = useState(false);

  // Sync reflection with saved value
  useEffect(() => {
    setReflection(savedReflection || "");
  }, [savedReflection, dayName]);

  // Build completed set for quick lookup
  const completedSet = useMemo(() => new Set(completedActions), [completedActions]);

  const isActionCompleted = useCallback((actionId: string) => {
    const fullId = `${dayName.toLowerCase()}-${actionId}`;
    return completedSet.has(fullId);
  }, [completedSet, dayName]);

  const handleToggle = useCallback((actionId: string) => {
    const isCompleted = isActionCompleted(actionId);
    onToggleAction(dayName, actionId, !isCompleted);
  }, [dayName, isActionCompleted, onToggleAction]);

  const handleSaveReflection = useCallback(() => {
    if (reflection.trim()) {
      onSaveReflection(dayName, reflection.trim());
    }
  }, [reflection, dayName, onSaveReflection]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft" && canNavigatePrev) onNavigate("prev");
      if (e.key === "ArrowRight" && canNavigateNext) onNavigate("next");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, canNavigatePrev, canNavigateNext, onNavigate]);

  if (!isOpen) return null;

  const dayLabel = DAY_LABELS[dayName.toLowerCase()] || dayName;

  // Status styles
  const statusConfig = {
    not_started: { label: "Upcoming", bg: "rgba(167, 180, 194, 0.1)", color: "#6F6A66" },
    in_progress: { label: "In progress", bg: "rgba(60, 131, 246, 0.1)", color: "rgba(60, 131, 246, 0.85)" },
    completed: { label: "Completed", bg: "rgba(60, 131, 246, 0.15)", color: "rgba(60, 131, 246, 0.9)" },
  };

  const status = statusConfig[dayStatus];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${isClosing ? "opacity-0" : "opacity-100"}`}
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className={`fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[80vh] z-50 rounded-3xl overflow-hidden flex flex-col transition-all duration-200 ${isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
        style={{ backgroundColor: "#FAFAF8" }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: "rgba(167, 180, 194, 0.15)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => canNavigatePrev && onNavigate("prev")}
              disabled={!canNavigatePrev}
              className="p-2 rounded-xl transition-colors"
              style={{ 
                backgroundColor: canNavigatePrev ? "rgba(167, 180, 194, 0.1)" : "transparent",
                color: canNavigatePrev ? "#3D3B38" : "#A7A29C",
                cursor: canNavigatePrev ? "pointer" : "not-allowed",
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h2 
                className="text-xl font-semibold"
                style={{ color: "#2D2B29" }}
              >
                {dayLabel}
              </h2>
              <p 
                className="text-xs mt-0.5"
                style={{ color: "#6F6A66" }}
              >
                Your focus for tonight
              </p>
            </div>
            
            <button
              onClick={() => canNavigateNext && onNavigate("next")}
              disabled={!canNavigateNext}
              className="p-2 rounded-xl transition-colors"
              style={{ 
                backgroundColor: canNavigateNext ? "rgba(167, 180, 194, 0.1)" : "transparent",
                color: canNavigateNext ? "#3D3B38" : "#A7A29C",
                cursor: canNavigateNext ? "pointer" : "not-allowed",
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span 
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {status.label}
            </span>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl transition-colors hover:bg-[rgba(167,180,194,0.1)]"
              style={{ color: "#6F6A66" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          {!dayPlan ? (
            <div className="text-center py-12">
              <p style={{ color: "#6F6A66" }}>No plan available for this day.</p>
            </div>
          ) : (
            <>
              {/* Day Focus */}
              {dayPlan.focus && (
                <div 
                  className="p-5 rounded-2xl"
                  style={{ 
                    backgroundColor: "rgba(60, 131, 246, 0.04)",
                    border: "1px solid rgba(60, 131, 246, 0.1)",
                  }}
                >
                  <p 
                    className="text-lg font-medium"
                    style={{ color: "#2D2B29" }}
                  >
                    {dayPlan.focus}
                  </p>
                </div>
              )}

              {/* Morning Mobility */}
              <ActionSection
                icon={<SunIcon />}
                label="Morning Mobility"
                content={dayPlan.morning_mobility}
                actionId="morning"
                isCompleted={isActionCompleted("morning")}
                onToggle={handleToggle}
              />

              {/* Evening Wind-Down */}
              <ActionSection
                icon={<MoonIcon />}
                label="Evening Routine"
                content={dayPlan.evening_wind_down}
                actionId="evening"
                isCompleted={isActionCompleted("evening")}
                onToggle={handleToggle}
              />

              {/* Environment Adjustment */}
              {dayPlan.environment_adjustment && (
                <InfoSection
                  icon={<EnvironmentIcon />}
                  label="Environment"
                  content={dayPlan.environment_adjustment}
                />
              )}

              {/* Behavioral Focus */}
              {dayPlan.behavioral_focus && (
                <InfoSection
                  icon={<FocusIcon />}
                  label="Behavioral Focus"
                  content={dayPlan.behavioral_focus}
                />
              )}

              {/* Product Cue */}
              {dayPlan.product_cue && (
                <p 
                  className="text-xs px-1"
                  style={{ color: "#A7A29C" }}
                >
                  {dayPlan.product_cue}
                </p>
              )}

              {/* Reflection */}
              <div className="pt-4">
                <label 
                  className="text-[11px] font-semibold uppercase tracking-widest mb-3 block"
                  style={{ color: "#A7B4C2", letterSpacing: "0.12em" }}
                >
                  Reflection (optional)
                </label>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="How did today's routine feel..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                  style={{ 
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(167, 180, 194, 0.2)",
                    color: "#2D2B29",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(60, 131, 246, 0.4)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(167, 180, 194, 0.2)";
                  }}
                />
                <button
                  onClick={handleSaveReflection}
                  disabled={!reflection.trim()}
                  className="mt-3 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: reflection.trim() ? "rgba(60, 131, 246, 0.85)" : "rgba(167, 180, 194, 0.2)",
                    color: reflection.trim() ? "#FFFFFF" : "#A7A29C",
                    cursor: reflection.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Save Reflection
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Action section with checkbox
function ActionSection({
  icon,
  label,
  content,
  actionId,
  isCompleted,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  content: string;
  actionId: string;
  isCompleted: boolean;
  onToggle: (actionId: string) => void;
}) {
  return (
    <div 
      className="p-5 rounded-2xl transition-colors"
      style={{ 
        backgroundColor: isCompleted ? "rgba(60, 131, 246, 0.04)" : "#FFFFFF",
        border: isCompleted 
          ? "1px solid rgba(60, 131, 246, 0.15)" 
          : "1px solid rgba(167, 180, 194, 0.15)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(actionId)}
          className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5"
          style={{ 
            borderColor: isCompleted ? "rgba(60, 131, 246, 0.6)" : "rgba(167, 180, 194, 0.4)",
            backgroundColor: isCompleted ? "rgba(60, 131, 246, 0.1)" : "transparent",
          }}
        >
          {isCompleted && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 4" stroke="rgba(60, 131, 246, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <span 
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#A7B4C2" }}
            >
              {label}
            </span>
          </div>
          <p 
            className="text-sm leading-relaxed"
            style={{ 
              color: isCompleted ? "#6F6A66" : "#2D2B29",
              textDecoration: isCompleted ? "line-through" : "none",
              opacity: isCompleted ? 0.7 : 1,
            }}
          >
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

// Info section without checkbox
function InfoSection({
  icon,
  label,
  content,
}: {
  icon: React.ReactNode;
  label: string;
  content: string;
}) {
  return (
    <div 
      className="p-4 rounded-2xl"
      style={{ 
        backgroundColor: "#F4F3F1",
        borderLeft: "3px solid rgba(167, 180, 194, 0.35)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span 
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "#A7B4C2" }}
        >
          {label}
        </span>
      </div>
      <p 
        className="text-sm leading-relaxed"
        style={{ color: "#2D2B29" }}
      >
        {content}
      </p>
    </div>
  );
}

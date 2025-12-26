/**
 * DayDetailModal - Full day plan detail with actions and reflections
 * 
 * Clean, high-contrast design with clear visual hierarchy
 * Shows morning, evening, environment, behavioral focus
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

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

// Sun icon - morning
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Moon icon - evening
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Home icon - environment
const EnvironmentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Target icon - behavioral focus
const FocusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
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

  // Status badge styles
  const statusConfig = {
    not_started: { 
      label: "Upcoming", 
      className: "bg-slate-100 text-slate-600" 
    },
    in_progress: { 
      label: "In Progress", 
      className: "bg-blue-50 text-blue-600" 
    },
    completed: { 
      label: "Completed", 
      className: "bg-emerald-50 text-emerald-600" 
    },
  };

  const status = statusConfig[dayStatus];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isClosing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      />

      {/* Modal - larger on desktop, full on mobile */}
      <div 
        className={`fixed inset-x-2 top-[3%] bottom-[3%] sm:inset-x-4 md:inset-x-auto md:left-1/2 md:top-[5%] md:bottom-[5%] md:-translate-x-1/2 md:translate-y-0 md:w-[680px] lg:w-[760px] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100">
          {/* Day navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => canNavigatePrev && onNavigate("prev")}
              disabled={!canNavigatePrev}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
                canNavigatePrev 
                  ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700" 
                  : "border-transparent text-slate-300 cursor-not-allowed"
              }`}
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            <div className="text-center min-w-[100px] sm:min-w-[140px]">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900">
                {dayLabel}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Your focus for tonight
              </p>
            </div>
            
            <button
              onClick={() => canNavigateNext && onNavigate("next")}
              disabled={!canNavigateNext}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
                canNavigateNext 
                  ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700" 
                  : "border-transparent text-slate-300 cursor-not-allowed"
              }`}
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Status badge and close */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`hidden sm:inline-block px-3 py-1.5 rounded-full text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - tighter on mobile */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {!dayPlan ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No plan available for this day.</p>
            </div>
          ) : (
            <>
              {/* Day Focus - prominent highlight */}
              {dayPlan.focus && (
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <p className="text-sm sm:text-base md:text-lg font-medium text-slate-800 leading-relaxed">
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
                accentColor="amber"
              />

              {/* Evening Wind-Down */}
              <ActionSection
                icon={<MoonIcon />}
                label="Evening Routine"
                content={dayPlan.evening_wind_down}
                actionId="evening"
                isCompleted={isActionCompleted("evening")}
                onToggle={handleToggle}
                accentColor="indigo"
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
                <p className="text-xs text-slate-400 px-1 italic">
                  {dayPlan.product_cue}
                </p>
              )}

              {/* Reflection */}
              <div className="pt-3 border-t border-slate-100">
                <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 sm:mb-3 block">
                  Reflection (optional)
                </label>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="How did today's routine feel..."
                  rows={2}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={handleSaveReflection}
                  disabled={!reflection.trim()}
                  className={`mt-3 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    reflection.trim()
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
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
  accentColor = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  content: string;
  actionId: string;
  isCompleted: boolean;
  onToggle: (actionId: string) => void;
  accentColor?: "amber" | "indigo" | "blue";
}) {
  const colorClasses = {
    amber: {
      icon: "text-amber-500",
      bg: isCompleted ? "bg-amber-50" : "bg-white",
      border: isCompleted ? "border-amber-200" : "border-slate-200",
      checkbox: isCompleted ? "bg-amber-500 border-amber-500" : "border-slate-300 hover:border-amber-400",
    },
    indigo: {
      icon: "text-indigo-500",
      bg: isCompleted ? "bg-indigo-50" : "bg-white",
      border: isCompleted ? "border-indigo-200" : "border-slate-200",
      checkbox: isCompleted ? "bg-indigo-500 border-indigo-500" : "border-slate-300 hover:border-indigo-400",
    },
    blue: {
      icon: "text-blue-500",
      bg: isCompleted ? "bg-blue-50" : "bg-white",
      border: isCompleted ? "border-blue-200" : "border-slate-200",
      checkbox: isCompleted ? "bg-blue-500 border-blue-500" : "border-slate-300 hover:border-blue-400",
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <div className={`p-3 sm:p-5 rounded-xl border transition-all ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(actionId)}
          className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${colors.checkbox}`}
          aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {isCompleted && (
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 ${colors.icon}`}>
            <span className="[&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-[18px] sm:[&_svg]:h-[18px]">{icon}</span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </span>
          </div>
          <p className={`text-xs sm:text-sm leading-relaxed ${
            isCompleted 
              ? "text-slate-500 line-through" 
              : "text-slate-700"
          }`}>
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
    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border-l-4 border-slate-300">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-slate-400">
        <span className="[&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-[18px] sm:[&_svg]:h-[18px]">{icon}</span>
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
        {content}
      </p>
    </div>
  );
}

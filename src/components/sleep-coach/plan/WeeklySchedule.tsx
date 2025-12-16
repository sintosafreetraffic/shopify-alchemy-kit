/**
 * WeeklySchedule - 7-day responsive grid for weekly plan
 * 
 * Premium Scandinavian aesthetic with monoline icons
 * Shows daily focus, morning/evening summaries, status
 */

import { useMemo } from "react";

interface DayPlan {
  focus: string;
  morning_mobility: string;
  evening_wind_down: string;
  environment_adjustment: string;
  behavioral_focus: string;
  product_cue?: string;
}

interface WeeklyScheduleProps {
  days: {
    monday?: DayPlan;
    tuesday?: DayPlan;
    wednesday?: DayPlan;
    thursday?: DayPlan;
    friday?: DayPlan;
    saturday?: DayPlan;
    sunday?: DayPlan;
  };
  completion?: Record<string, "not_started" | "in_progress" | "completed">;
  currentDay?: string;
  onDayClick?: (dayName: string) => void;
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, { short: string; full: string }> = {
  monday: { short: "Mon", full: "Monday" },
  tuesday: { short: "Tue", full: "Tuesday" },
  wednesday: { short: "Wed", full: "Wednesday" },
  thursday: { short: "Thu", full: "Thursday" },
  friday: { short: "Fri", full: "Friday" },
  saturday: { short: "Sat", full: "Saturday" },
  sunday: { short: "Sun", full: "Sunday" },
};

// Monoline icons for different focus themes
const FocusIcons: Record<string, React.ReactNode> = {
  awareness: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#8E98A3" strokeWidth="1.25" opacity="0.7"/>
      <circle cx="12" cy="12" r="3" stroke="#8E98A3" strokeWidth="1.25" opacity="0.7"/>
    </svg>
  ),
  alignment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v18M3 12h18" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  recovery: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 12h4l3-9 4 18 3-9h4" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
    </svg>
  ),
  integration: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2" stroke="#8E98A3" strokeWidth="1.25" opacity="0.7"/>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  consistency: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M5 6h14M5 18h14" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  reflection: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#8E98A3" strokeWidth="1.25" opacity="0.7"/>
      <path d="M12 8v4l2 2" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
    </svg>
  ),
  default: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
};

// Get icon based on focus text
function getIconForFocus(focus: string): React.ReactNode {
  const lowerFocus = focus?.toLowerCase() || "";
  if (lowerFocus.includes("awareness")) return FocusIcons.awareness;
  if (lowerFocus.includes("alignment") || lowerFocus.includes("posture")) return FocusIcons.alignment;
  if (lowerFocus.includes("recovery") || lowerFocus.includes("rest")) return FocusIcons.recovery;
  if (lowerFocus.includes("integrat")) return FocusIcons.integration;
  if (lowerFocus.includes("consist")) return FocusIcons.consistency;
  if (lowerFocus.includes("reflect")) return FocusIcons.reflection;
  return FocusIcons.default;
}

// Status indicator styles
const STATUS_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  not_started: { 
    bg: 'rgba(167, 180, 194, 0.08)', 
    dot: '#A7A29C', 
    label: "Not started" 
  },
  in_progress: { 
    bg: 'rgba(60, 131, 246, 0.08)', 
    dot: 'rgba(60, 131, 246, 0.8)', 
    label: "In progress" 
  },
  completed: { 
    bg: 'rgba(34, 197, 94, 0.08)', 
    dot: 'rgba(34, 197, 94, 0.8)', 
    label: "Done" 
  },
};

export function WeeklySchedule({
  days,
  completion = {},
  currentDay,
  onDayClick,
}: WeeklyScheduleProps) {
  // Determine current day of week
  const today = useMemo(() => {
    if (currentDay) return currentDay;
    const dayIndex = new Date().getDay();
    const dayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return dayMap[dayIndex];
  }, [currentDay]);

  return (
    <section 
      className="rounded-3xl p-6 md:p-8"
      style={{ 
        backgroundColor: '#FAFAF8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header */}
      <p 
        className="text-[11px] font-semibold tracking-widest uppercase mb-6"
        style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
      >
        7-Night Schedule
      </p>

      {/* Grid - responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {DAY_ORDER.map((dayKey) => {
          const dayPlan = days[dayKey as keyof typeof days];
          const isToday = dayKey === today;
          const status = completion[dayKey] || "not_started";
          const statusStyle = STATUS_STYLES[status];

          if (!dayPlan) {
            return (
              <div 
                key={dayKey}
                className="rounded-2xl p-4 opacity-50"
                style={{ backgroundColor: '#F4F3F1' }}
              >
                <p className="text-xs font-medium" style={{ color: '#6F6A66' }}>
                  {DAY_LABELS[dayKey].short}
                </p>
                <p className="text-[10px] mt-2" style={{ color: '#A7A29C' }}>
                  No plan
                </p>
              </div>
            );
          }

          return (
            <div 
              key={dayKey}
              onClick={() => onDayClick?.(dayKey)}
              className="rounded-2xl p-4 transition-all cursor-pointer hover:shadow-sm"
              style={{ 
                backgroundColor: isToday ? 'rgba(60, 131, 246, 0.04)' : '#FFFFFF',
                border: isToday 
                  ? '1px solid rgba(60, 131, 246, 0.2)' 
                  : '1px solid rgba(167, 180, 194, 0.12)',
              }}
            >
              {/* Day label + icon */}
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-xs font-semibold"
                  style={{ 
                    color: isToday ? 'rgba(60, 131, 246, 0.85)' : '#3D3B38',
                  }}
                >
                  {DAY_LABELS[dayKey].short}
                  {isToday && (
                    <span 
                      className="ml-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: 'rgba(60, 131, 246, 0.12)',
                        color: 'rgba(60, 131, 246, 0.85)',
                      }}
                    >
                      Today
                    </span>
                  )}
                </span>
                {getIconForFocus(dayPlan.focus)}
              </div>

              {/* Focus */}
              <p 
                className="text-sm font-medium mb-2 truncate"
                style={{ color: '#2D2B29' }}
                title={dayPlan.focus}
              >
                {dayPlan.focus}
              </p>

              {/* Morning summary */}
              <div className="flex items-start gap-1.5 mb-1.5">
                <span className="text-[10px] mt-0.5" style={{ color: '#B45309' }}>AM</span>
                <p 
                  className="text-[11px] leading-snug line-clamp-2"
                  style={{ color: '#6F6A66' }}
                >
                  {dayPlan.morning_mobility}
                </p>
              </div>

              {/* Evening summary */}
              <div className="flex items-start gap-1.5 mb-3">
                <span className="text-[10px] mt-0.5" style={{ color: '#4F46E5' }}>PM</span>
                <p 
                  className="text-[11px] leading-snug line-clamp-2"
                  style={{ color: '#6F6A66' }}
                >
                  {dayPlan.evening_wind_down}
                </p>
              </div>

              {/* Status indicator */}
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                style={{ backgroundColor: statusStyle.bg }}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: statusStyle.dot }}
                />
                <span 
                  className="text-[10px]"
                  style={{ color: '#6F6A66' }}
                >
                  {statusStyle.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

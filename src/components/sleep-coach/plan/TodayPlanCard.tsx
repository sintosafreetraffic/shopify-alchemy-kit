/**
 * TodayPlanCard - Today's focus with completable actions
 * 
 * Shows 2-3 key actions for today with completion toggles
 * Premium Scandinavian aesthetic, calm interaction design
 */

import { useState, useCallback, useEffect, useMemo } from "react";

type PlanActionId = 'morning' | 'evening' | string;

interface TodayAction {
  id?: PlanActionId;
  time: "morning" | "evening";
  action: string;
  duration?: string;
  effort?: "low" | "medium";
}

interface DayPlan {
  focus: string;
  morning_mobility: string;
  evening_wind_down: string;
  environment_adjustment: string;
  behavioral_focus: string;
  product_cue?: string;
}

interface TodayPlanCardProps {
  todayActions?: TodayAction[];
  todayPlan?: DayPlan;
  dayName?: string;
  onActionComplete?: (dayName: string, actionId: string, completed: boolean) => void;
  onReflectionSubmit?: (dayName: string, note: string) => void;
  completedActions?: string[];
}

// Monoline sun icon
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4" stroke="#8E98A3" strokeWidth="1.5" opacity="0.8"/>
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93" stroke="#8E98A3" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
  </svg>
);

// Monoline moon icon
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#8E98A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
  </svg>
);

// Effort labels - brand blue scale, no traffic-light colors
const EFFORT_LABELS: Record<string, { label: string; style: React.CSSProperties }> = {
  low: { 
    label: "Brief", 
    style: { 
      backgroundColor: 'rgba(167, 180, 194, 0.1)', 
      color: '#6F6A66',
      border: '1px solid rgba(167, 180, 194, 0.2)',
    } 
  },
  medium: { 
    label: "Moderate", 
    style: { 
      backgroundColor: 'rgba(60, 131, 246, 0.08)', 
      color: 'rgba(60, 131, 246, 0.85)',
      border: '1px solid rgba(60, 131, 246, 0.15)',
    } 
  },
};

export function TodayPlanCard({
  todayActions = [],
  todayPlan,
  dayName = "Today",
  onActionComplete,
  onReflectionSubmit,
  completedActions = [],
}: TodayPlanCardProps) {
  const [reflection, setReflection] = useState("");
  
  // Build actions with stable IDs from todayPlan if todayActions is empty
  const actions = useMemo(() => {
    if (todayActions.length > 0) {
      // Ensure todayActions have IDs
      return todayActions.map((a, i) => ({
        ...a,
        id: a.id ?? a.time ?? `action-${i}`,
      }));
    }
    
    if (todayPlan) {
      const built: TodayAction[] = [];
      if (todayPlan.morning_mobility) {
        built.push({
          id: 'morning',
          time: 'morning',
          action: todayPlan.morning_mobility,
          duration: '5-8 min',
          effort: 'low',
        });
      }
      if (todayPlan.evening_wind_down) {
        built.push({
          id: 'evening',
          time: 'evening',
          action: todayPlan.evening_wind_down,
          duration: '8-12 min',
          effort: 'medium',
        });
      }
      return built;
    }
    
    return [];
  }, [todayActions, todayPlan]);
  
  // Build a set of completed full IDs for quick lookup
  // completedActions from hook comes as ["monday-morning", "monday-evening", ...]
  const completedSet = useMemo(() => new Set(completedActions), [completedActions]);
  
  // Local state for optimistic UI (synced from prop)
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(completedSet);

  // Sync with server state when completedActions prop changes
  useEffect(() => {
    setLocalCompleted(completedSet);
  }, [completedSet]);

  const handleToggle = useCallback((actionId: string) => {
    // Full ID includes day name
    const fullId = `${dayName.toLowerCase()}-${actionId}`;
    const isCompleted = localCompleted.has(fullId);
    const newCompleted = new Set(localCompleted);
    
    if (isCompleted) {
      newCompleted.delete(fullId);
    } else {
      newCompleted.add(fullId);
    }
    
    setLocalCompleted(newCompleted);
    // Pass actionId (not fullId) to parent - parent builds full ID
    onActionComplete?.(dayName, actionId, !isCompleted);
  }, [localCompleted, dayName, onActionComplete]);

  const handleReflectionSubmit = useCallback(() => {
    if (reflection.trim()) {
      onReflectionSubmit?.(dayName, reflection.trim());
      setReflection("");
    }
  }, [reflection, dayName, onReflectionSubmit]);

  // Count completed actions for this day
  const completedCount = useMemo(() => {
    const dayPrefix = `${dayName.toLowerCase()}-`;
    return Array.from(localCompleted).filter(id => id.startsWith(dayPrefix)).length;
  }, [localCompleted, dayName]);

  if (actions.length === 0 && !todayPlan) return null;

  return (
    <section 
      className="rounded-3xl p-7 md:p-9"
      style={{ 
        backgroundColor: '#FAFAF8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p 
            className="text-[11px] font-semibold tracking-widest uppercase mb-1.5"
            style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
          >
            {dayName}'s Focus
          </p>
          {todayPlan?.focus && (
            <h3 
              className="text-lg font-medium"
              style={{ color: '#2D2B29' }}
            >
              {todayPlan.focus}
            </h3>
          )}
        </div>
        
        {/* Completion count */}
        <div 
          className="text-sm px-3 py-1.5 rounded-full"
          style={{ 
            backgroundColor: 'rgba(60, 131, 246, 0.08)',
            color: 'rgba(60, 131, 246, 0.85)',
          }}
        >
          {completedCount}/{actions.length} completed
        </div>
      </div>

      {/* Actions list */}
      <div className="space-y-4 mb-6">
        {actions.map((action) => {
          const actionId = action.id ?? action.time;
          const fullId = `${dayName.toLowerCase()}-${actionId}`;
          const isCompleted = localCompleted.has(fullId);
          const effortConfig = EFFORT_LABELS[action.effort || "low"];
          
          return (
            <div 
              key={actionId}
              className="flex items-start gap-4 p-4 rounded-2xl transition-colors"
              style={{ 
                backgroundColor: isCompleted ? 'rgba(60, 131, 246, 0.04)' : '#FFFFFF',
                border: isCompleted 
                  ? '1px solid rgba(60, 131, 246, 0.15)' 
                  : '1px solid rgba(167, 180, 194, 0.15)',
              }}
            >
              {/* Checkbox - brand blue */}
              <button
                onClick={() => handleToggle(actionId)}
                className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5"
                style={{ 
                  borderColor: isCompleted ? 'rgba(60, 131, 246, 0.6)' : 'rgba(167, 180, 194, 0.4)',
                  backgroundColor: isCompleted ? 'rgba(60, 131, 246, 0.1)' : 'transparent',
                }}
              >
                {isCompleted && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="rgba(60, 131, 246, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Time chip + duration */}
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: 'rgba(167, 180, 194, 0.1)',
                      color: '#6F6A66',
                    }}
                  >
                    {action.time === "morning" ? <SunIcon /> : <MoonIcon />}
                    {action.time === "morning" ? "Morning" : "Evening"}
                  </span>
                  {action.duration && (
                    <span 
                      className="text-xs"
                      style={{ color: '#A7A29C' }}
                    >
                      {action.duration}
                    </span>
                  )}
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={effortConfig.style}
                  >
                    {effortConfig.label}
                  </span>
                </div>

                {/* Action text */}
                <p 
                  className="text-sm leading-relaxed"
                  style={{ 
                    color: isCompleted ? '#6F6A66' : '#2D2B29',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    opacity: isCompleted ? 0.7 : 1,
                    lineHeight: 1.55,
                  }}
                >
                  {action.action}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Environment & Behavioral focus (from day plan) */}
      {todayPlan && (todayPlan.environment_adjustment || todayPlan.behavioral_focus) && (
        <div 
          className="p-4 rounded-2xl mb-6"
          style={{ 
            backgroundColor: '#F4F3F1',
            borderLeft: '3px solid rgba(167, 180, 194, 0.35)',
          }}
        >
          {todayPlan.environment_adjustment && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#A7B4C2' }}>
                Environment
              </p>
              <p className="text-sm" style={{ color: '#2D2B29', lineHeight: 1.5 }}>
                {todayPlan.environment_adjustment}
              </p>
            </div>
          )}
          {todayPlan.behavioral_focus && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#A7B4C2' }}>
                Behavioral Focus
              </p>
              <p className="text-sm" style={{ color: '#2D2B29', lineHeight: 1.5 }}>
                {todayPlan.behavioral_focus}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Product cue (subtle) */}
      {todayPlan?.product_cue && (
        <p 
          className="text-xs mb-6 px-1"
          style={{ color: '#A7A29C', lineHeight: 1.5 }}
        >
          {todayPlan.product_cue}
        </p>
      )}

      {/* Reflection input */}
      <div>
        <label 
          className="text-[11px] font-semibold uppercase tracking-widest mb-2 block"
          style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
        >
          Brief reflection (optional)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="How did this evening's routine feel"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(167, 180, 194, 0.2)',
              color: '#2D2B29',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(60, 131, 246, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(167, 180, 194, 0.2)';
            }}
          />
          <button
            onClick={handleReflectionSubmit}
            disabled={!reflection.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ 
              backgroundColor: reflection.trim() ? 'rgba(60, 131, 246, 0.85)' : 'rgba(167, 180, 194, 0.2)',
              color: reflection.trim() ? '#FFFFFF' : '#A7A29C',
              cursor: reflection.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </section>
  );
}

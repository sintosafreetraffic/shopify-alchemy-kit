/**
 * PersonaCard Component
 * 
 * Displays the user's sleep persona with label, description, rationale, and recommended modules.
 * Uses calm, Scandinavian aesthetic matching the brand tone.
 * 
 * v7: Added recovery_sleeper persona support with teal color scheme.
 * Updated to read from stored profile persona fields as single source of truth.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Moon, Zap, Sparkles, ChevronRight, Dumbbell } from "lucide-react";
import { Link } from "react-router-dom";
import { type PersonaCluster, PERSONA_DEFINITIONS, MODULE_DEFINITIONS, PERSONA_HUMAN_NAMES } from "@/components/sleep-quiz/QuizTypes";

interface PersonaCardProps {
  cluster?: PersonaCluster;
  name?: string;              // Human name (Jason, Mila, Leo, Riley)
  label?: string;
  description?: string;
  recommendedModules?: number[];
  rationale?: string;
  showModuleLinks?: boolean;
}

// Icon mapping for personas (v7: added recovery_sleeper)
const PERSONA_ICONS: Record<PersonaCluster, typeof Heart> = {
  pain_sleeper: Heart,
  stress_insomnia: Moon,
  optimizer: Zap,
  recovery_sleeper: Dumbbell,
};

// Color mapping for personas (calm, neutral palette) - v7: added recovery_sleeper with teal
const PERSONA_COLORS: Record<PersonaCluster, { 
  bg: string; 
  iconBg: string; 
  text: string;
  border: string;
}> = {
  pain_sleeper: {
    bg: "from-rose-50/50 via-background to-background dark:from-rose-950/20",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200/50 dark:border-rose-800/30",
  },
  stress_insomnia: {
    bg: "from-violet-50/50 via-background to-background dark:from-violet-950/20",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200/50 dark:border-violet-800/30",
  },
  optimizer: {
    bg: "from-emerald-50/50 via-background to-background dark:from-emerald-950/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/50 dark:border-emerald-800/30",
  },
  recovery_sleeper: {
    bg: "from-teal-50/50 via-background to-background dark:from-teal-950/20",
    iconBg: "bg-teal-100 dark:bg-teal-900/50",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200/50 dark:border-teal-800/30",
  },
};

export function PersonaCard({
  cluster,
  name,
  label,
  description,
  recommendedModules,
  rationale,
  showModuleLinks = true,
}: PersonaCardProps) {
  // Get persona definition from cluster if available
  const definition = cluster ? PERSONA_DEFINITIONS[cluster] : null;
  
  const displayName = name || definition?.name || (cluster ? PERSONA_HUMAN_NAMES[cluster] : null);
  const displayLabel = label || definition?.label || "Your Sleep Persona";
  const displayDescription = description || definition?.description || "";
  const displayModules = recommendedModules || definition?.recommended_modules || [];
  const IconComponent = cluster ? PERSONA_ICONS[cluster] : Heart;
  const colors = cluster ? PERSONA_COLORS[cluster] : PERSONA_COLORS.pain_sleeper;

  if (!cluster && !label) {
    return null; // Don't render if no persona data
  }

  return (
    <Card className={`${colors.border} bg-gradient-to-br ${colors.bg}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
            <IconComponent className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              <span>Your Sleep Persona</span>
              {displayName && (
                <Badge 
                  variant="outline" 
                  className={`text-xs font-semibold ${colors.text} border-current`}
                >
                  {displayName}
                </Badge>
              )}
              <Badge 
                variant="secondary" 
                className={`text-xs font-medium ${colors.iconBg} ${colors.text}`}
              >
                {displayLabel}
              </Badge>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Persona Description */}
        <p className="text-foreground/85 leading-relaxed text-sm">
          {displayDescription}
        </p>

        {/* Rationale - Why this persona matches */}
        {rationale && (
          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-muted-foreground mb-1">Why this matches you</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {rationale}
            </p>
          </div>
        )}

        {/* Recommended Modules - Module Focus Strip */}
        {displayModules.length > 0 && (
          <div className="pt-3 border-t border-slate-200/40 dark:border-slate-700/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className={`w-4 h-4 ${colors.text}`} />
              <p className="text-sm font-medium text-foreground/90">Recommended Focus Modules</p>
            </div>
            <div className="space-y-2">
              {displayModules.slice(0, 3).map((moduleNum) => {
                const moduleInfo = MODULE_DEFINITIONS[moduleNum];
                return (
                  <div 
                    key={moduleNum}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/30 group hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${colors.iconBg} flex items-center justify-center text-xs font-medium ${colors.text}`}>
                        {moduleNum}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground/90">{moduleInfo?.name || `Module ${moduleNum}`}</span>
                        {moduleInfo?.description && (
                          <span className="text-xs text-muted-foreground">
                            {moduleInfo.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {showModuleLinks && (
                      <ChevronRight className={`w-4 h-4 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

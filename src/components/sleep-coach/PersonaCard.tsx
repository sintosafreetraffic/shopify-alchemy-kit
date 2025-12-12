/**
 * PersonaCard Component
 * 
 * Displays the user's sleep persona with label, description, and recommended modules.
 * Uses calm, Scandinavian aesthetic matching the brand tone.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Heart, Moon, Zap } from "lucide-react";
import { type PersonaCluster, PERSONA_DEFINITIONS } from "@/components/sleep-quiz/QuizTypes";

interface PersonaCardProps {
  cluster?: PersonaCluster;
  label?: string;
  description?: string;
  recommendedModules?: number[];
  rationale?: string;
}

// Module descriptions for display
const MODULE_INFO: Record<number, { name: string; description: string }> = {
  4: { name: "Alignment Fundamentals", description: "Core spinal alignment principles" },
  6: { name: "Environment Optimization", description: "Light, noise, and temperature control" },
  7: { name: "Temperature Regulation", description: "Optimal sleep temperature strategies" },
  8: { name: "Deep Sleep Enhancement", description: "Maximizing restorative sleep phases" },
  9: { name: "Evening Routine Reset", description: "Wind-down protocols for better sleep onset" },
  10: { name: "Morning Mobility", description: "Gentle morning movement practices" },
  11: { name: "Hip & Lower Body", description: "Lower body alignment techniques" },
};

// Icon mapping for personas
const PERSONA_ICONS: Record<PersonaCluster, typeof Brain> = {
  pain_sleeper: Heart,
  stress_insomnia: Moon,
  optimizer: Zap,
};

export function PersonaCard({
  cluster,
  label,
  description,
  recommendedModules,
  rationale,
}: PersonaCardProps) {
  // Get persona definition from cluster if available
  const definition = cluster ? PERSONA_DEFINITIONS[cluster] : null;
  
  const displayLabel = label || definition?.label || "Your Sleep Persona";
  const displayDescription = description || definition?.description || "";
  const displayModules = recommendedModules || definition?.recommended_modules || [];
  const IconComponent = cluster ? PERSONA_ICONS[cluster] : Brain;

  if (!cluster && !label) {
    return null; // Don't render if no persona data
  }

  return (
    <Card className="border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/50 via-background to-background dark:from-violet-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0">
            <IconComponent className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>Your Sleep Persona</span>
              <Badge variant="secondary" className="text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
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

        {/* Rationale */}
        {rationale && (
          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {rationale}
            </p>
          </div>
        )}

        {/* Recommended Modules */}
        {displayModules.length > 0 && (
          <div className="pt-3 border-t border-violet-200/40 dark:border-violet-700/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              <p className="text-sm font-medium text-foreground/90">Recommended Focus Modules</p>
            </div>
            <div className="space-y-2">
              {displayModules.map((moduleNum) => {
                const moduleInfo = MODULE_INFO[moduleNum];
                return (
                  <div 
                    key={moduleNum}
                    className="flex items-center justify-between p-2 rounded-lg bg-violet-50/50 dark:bg-violet-950/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800/50 flex items-center justify-center text-xs font-medium text-violet-700 dark:text-violet-300">
                        {moduleNum}
                      </div>
                      <span className="text-sm text-foreground/90">{moduleInfo?.name || `Module ${moduleNum}`}</span>
                    </div>
                    {moduleInfo?.description && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {moduleInfo.description}
                      </span>
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

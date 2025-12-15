/**
 * DEV-ONLY Persona Detection Debug Page
 * 
 * This page is only available in development mode.
 * Shows all 4 persona clusters with their internal and customer-facing data.
 * 
 * Purpose: Verify persona system is working correctly
 * - Internal names (Jason, Mila, Leo, Riley) are marked as INTERNAL
 * - Customer-facing labels (Pain Sleeper, etc.) are shown as UI-safe
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Heart, Moon, Zap, Dumbbell, AlertTriangle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  type PersonaCluster, 
  PERSONA_DEFINITIONS, 
  PERSONA_HUMAN_NAMES,
  MODULE_DEFINITIONS,
  CORE_NEED_MAP,
} from "@/components/sleep-quiz/QuizTypes";

// Icon mapping for personas
const PERSONA_ICONS: Record<PersonaCluster, typeof Heart> = {
  pain_sleeper: Heart,
  stress_insomnia: Moon,
  optimizer: Zap,
  recovery_sleeper: Dumbbell,
};

// Color mapping for personas
const PERSONA_COLORS: Record<PersonaCluster, { bg: string; text: string; border: string }> = {
  pain_sleeper: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
  stress_insomnia: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
  },
  optimizer: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  recovery_sleeper: {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
  },
};

const SleepPersonaDebug = () => {
  // Block access in production
  if (import.meta.env.PROD) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Development Only</h2>
            <p className="text-muted-foreground">
              This page is only available in development mode.
            </p>
            <Link to="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clusters = Object.keys(PERSONA_DEFINITIONS) as PersonaCluster[];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="mb-2">DEV ONLY</Badge>
          <h1 className="text-2xl font-bold">Persona Detection Debug</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            This page shows all 4 persona clusters with internal and customer-facing data.
            Use this to verify the persona system is correctly implemented.
          </p>
        </div>

        {/* Warning about internal names */}
        <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Internal Names Warning</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Human names (Jason, Mila, Leo, Riley) are <strong>INTERNAL ONLY</strong> for Klaviyo segmentation.
            They must <strong>NEVER</strong> be displayed in customer-facing UI. Only use cluster labels.
          </AlertDescription>
        </Alert>

        {/* Data structure explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Data Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-foreground">Customer-Facing (UI)</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                  <li><code>cluster</code>: pain_sleeper, stress_insomnia, etc.</li>
                  <li><code>label</code>: "Pain Sleeper", "Sleep Optimizer", etc.</li>
                  <li><code>description</code>: Calm, Scandinavian description</li>
                  <li><code>recommended_modules</code>: [4, 10, 11], etc.</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Internal Only (Klaviyo)</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                  <li><code>name</code>: Jason, Mila, Leo, Riley</li>
                  <li><code>legacyType</code>: jason, mila, leo</li>
                  <li><code>core_need</code>: alignment, environment, optimization, recovery</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Persona Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {clusters.map((cluster) => {
            const def = PERSONA_DEFINITIONS[cluster];
            const humanName = PERSONA_HUMAN_NAMES[cluster];
            const coreNeed = CORE_NEED_MAP[cluster];
            const Icon = PERSONA_ICONS[cluster];
            const colors = PERSONA_COLORS[cluster];

            return (
              <Card key={cluster} className={`${colors.border} ${colors.bg}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center border ${colors.border}`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <span>{def.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {cluster}
                        </Badge>
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description - UI safe */}
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {def.description}
                  </p>

                  {/* Internal data - clearly marked */}
                  <div className="p-3 rounded-lg bg-background/60 border border-dashed border-amber-300 dark:border-amber-700">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      INTERNAL ONLY (not for UI)
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Human Name:</span>
                        <span className="ml-1 font-medium text-foreground">{humanName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Legacy Type:</span>
                        <span className="ml-1 font-mono text-foreground">{def.legacyType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Core Need:</span>
                        <span className="ml-1 font-mono text-foreground">{coreNeed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Modules - UI safe */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Recommended Modules (UI-safe)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {def.recommended_modules.map((moduleNum) => {
                        const moduleInfo = MODULE_DEFINITIONS[moduleNum];
                        return (
                          <Badge 
                            key={moduleNum} 
                            variant="outline"
                            className={`text-xs ${colors.text} ${colors.border}`}
                          >
                            {moduleNum}: {moduleInfo?.name || `Module ${moduleNum}`}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Klaviyo Event Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Klaviyo Event Fields (RBN_SleepQuiz_Completed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto">
              <pre>{`{
  // ===== CUSTOMER-FACING (safe for email templates) =====
  "persona_cluster": "pain_sleeper",           // Use for conditional blocks
  "persona_label": "The Pain Sleeper",         // Use for display
  "persona_description": "A sleeper whose...", // Use for personalization
  "persona_rationale": "Your responses...",    // Why this matches
  "recommended_modules": [4, 10, 11],          // Module IDs
  
  // ===== INTERNAL ONLY (do NOT use in generic emails) =====
  "persona_name": "Jason",                     // ⚠️ INTERNAL ONLY
  "persona_legacy_type": "jason",              // ⚠️ INTERNAL ONLY
  "core_need": "alignment",                    // ⚠️ INTERNAL ONLY (for segmentation)
  
  // ===== LEGACY COMPATIBILITY =====
  "persona_guess": "jason"                     // Deprecated, use persona_cluster
}`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center gap-4">
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <Link to="/sleep-quiz">
            <Button>Take Sleep Assessment</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SleepPersonaDebug;

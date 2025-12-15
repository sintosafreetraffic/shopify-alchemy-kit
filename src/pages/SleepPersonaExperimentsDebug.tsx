/**
 * DEV-ONLY Persona Experiments Debug Page
 * 
 * This page is only available in development mode.
 * Shows all persona clusters with their experiment variant assignments.
 * 
 * Purpose: Verify A/B testing infrastructure is working correctly
 * - Shows variant assignments for each persona × experiment combination
 * - Displays copy variants that would be shown
 * - Clearly marks internal fields as INTERNAL ONLY
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Moon, Zap, Dumbbell, AlertTriangle, Info, FlaskConical, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  type PersonaCluster, 
  PERSONA_DEFINITIONS, 
  PERSONA_HUMAN_NAMES,
  CORE_NEED_MAP,
} from "@/components/sleep-quiz/QuizTypes";
import {
  assignVariant,
  getAllAssignedVariants,
  getCoachHeroCopy,
  getQuizResultsHeroCopy,
  getLpHeroCopy,
  getLpSetupCopy,
  EXPERIMENT_REGISTRY,
  type ExperimentVariant,
} from "@/experiments/personaExperiments";

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

const VARIANT_COLORS: Record<ExperimentVariant, string> = {
  A: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  B: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  C: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
};

const SleepPersonaExperimentsDebug = () => {
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
  const experiments = Object.values(EXPERIMENT_REGISTRY).filter(e => e.active);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="outline">DEV ONLY</Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              A/B Testing
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">Persona Experiments Debug</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            This page shows experiment variant assignments for each persona cluster.
            Use this to verify the A/B testing infrastructure is correctly implemented.
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

        {/* Experiment Registry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Active Experiments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {experiments.map(exp => (
                <div 
                  key={exp.key} 
                  className="p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-sm font-medium">{exp.key}</code>
                    <div className="flex gap-1">
                      {exp.variants.map(v => (
                        <Badge key={v} variant="outline" className={`text-xs ${VARIANT_COLORS[v]}`}>
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{exp.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs defaultValue="matrix" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matrix">Variant Matrix</TabsTrigger>
            <TabsTrigger value="preview">Copy Preview</TabsTrigger>
          </TabsList>

          {/* Variant Matrix Tab */}
          <TabsContent value="matrix" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Experiment × Persona Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Persona</th>
                        {experiments.map(exp => (
                          <th key={exp.key} className="text-center p-2 font-medium">
                            <code className="text-xs">{exp.key}</code>
                          </th>
                        ))}
                        <th className="text-center p-2 font-medium text-amber-600">
                          <span className="flex items-center gap-1 justify-center">
                            <AlertTriangle className="w-3 h-3" />
                            Internal Name
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusters.map(cluster => {
                        const def = PERSONA_DEFINITIONS[cluster];
                        const humanName = PERSONA_HUMAN_NAMES[cluster];
                        const coreNeed = CORE_NEED_MAP[cluster];
                        const Icon = PERSONA_ICONS[cluster];
                        const colors = PERSONA_COLORS[cluster];
                        const variants = getAllAssignedVariants(cluster);

                        return (
                          <tr key={cluster} className="border-b last:border-0">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded ${colors.bg} flex items-center justify-center`}>
                                  <Icon className={`w-3 h-3 ${colors.text}`} />
                                </div>
                                <div>
                                  <span className="font-medium">{def.label}</span>
                                  <span className="text-xs text-muted-foreground block">
                                    {coreNeed}
                                  </span>
                                </div>
                              </div>
                            </td>
                            {experiments.map(exp => (
                              <td key={exp.key} className="text-center p-2">
                                <Badge className={VARIANT_COLORS[variants[exp.key] || "A"]}>
                                  {variants[exp.key] || "A"}
                                </Badge>
                              </td>
                            ))}
                            <td className="text-center p-2">
                              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                                {humanName}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Copy Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            {clusters.map(cluster => {
              const def = PERSONA_DEFINITIONS[cluster];
              const humanName = PERSONA_HUMAN_NAMES[cluster];
              const Icon = PERSONA_ICONS[cluster];
              const colors = PERSONA_COLORS[cluster];
              
              const coachCopy = getCoachHeroCopy(cluster, "coach_hero_v1");
              const quizCopy = getQuizResultsHeroCopy(cluster, "quiz_results_hero_v1");
              const coachVariant = assignVariant(cluster, "coach_hero_v1");
              const quizVariant = assignVariant(cluster, "quiz_results_hero_v1");

              return (
                <Card key={cluster} className={`${colors.border}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center border ${colors.border}`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                          <span>{def.label}</span>
                          <Badge variant="secondary" className="text-xs">{cluster}</Badge>
                        </CardTitle>
                      </div>
                      {/* Internal name badge */}
                      <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">
                        Internal: {humanName}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Coach Hero Preview */}
                    <div className="p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Coach Hero (Variant {coachVariant})</span>
                        <Badge className={`text-xs ${VARIANT_COLORS[coachVariant]}`}>{coachVariant}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{coachCopy.headline}</p>
                        <p className="text-sm text-muted-foreground">{coachCopy.subheadline}</p>
                        <p className="text-sm text-primary/80 italic">{coachCopy.microcopy}</p>
                      </div>
                    </div>

                    {/* Quiz Results Preview */}
                    <div className="p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Quiz Results Hero (Variant {quizVariant})</span>
                        <Badge className={`text-xs ${VARIANT_COLORS[quizVariant]}`}>{quizVariant}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{quizCopy.headline}</p>
                        <p className="text-sm text-muted-foreground">{quizCopy.subheadline}</p>
                        <p className="text-sm text-primary/80 italic">{quizCopy.intro}</p>
                      </div>
                    </div>

                    {/* LP Hero Preview */}
                    {(() => {
                      const lpHeroCopy = getLpHeroCopy(cluster, def.label, "lp_hero_v1");
                      const lpHeroVariant = assignVariant(cluster, "lp_hero_v1");
                      return (
                        <div className="p-4 rounded-lg bg-muted/30 border">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">LP Hero (Variant {lpHeroVariant})</span>
                            <Badge className={`text-xs ${VARIANT_COLORS[lpHeroVariant]}`}>{lpHeroVariant}</Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{lpHeroCopy.headline}</p>
                            <p className="text-sm text-muted-foreground">{lpHeroCopy.subheadline}</p>
                            <p className="text-sm text-primary/80 italic">{lpHeroCopy.tagline}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* LP Setup Preview */}
                    {(() => {
                      const lpSetupCopy = getLpSetupCopy(cluster, "lp_setup_v1");
                      const lpSetupVariant = assignVariant(cluster, "lp_setup_v1");
                      return (
                        <div className="p-4 rounded-lg bg-muted/30 border">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">LP Setup (Variant {lpSetupVariant})</span>
                            <Badge className={`text-xs ${VARIANT_COLORS[lpSetupVariant]}`}>{lpSetupVariant}</Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{lpSetupCopy.sectionTitle}</p>
                            <p className="text-sm text-primary/80 italic">{lpSetupCopy.emphasis}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Klaviyo Payload Example */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Klaviyo Event Payload (with experiment variants)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto">
              <pre>{`{
  // ===== CUSTOMER-FACING (safe for email templates) =====
  "persona_cluster": "pain_sleeper",
  "persona_label": "The Pain Sleeper",
  "core_need": "alignment",
  "persona_confidence": 75,           // v9: Signal strength (0-100)
  
  // ===== v9: EXTENDED METRICS =====
  "energy_potential_score": 68,       // Morning energy potential
  "module_relevance": [               // Weighted module ordering
    { "module_id": 4, "relevance_score": 85 },
    { "module_id": 10, "relevance_score": 70 }
  ],
  
  // ===== EXPERIMENT VARIANTS =====
  "persona_experiment_variants": {
    "coach_hero_v1": "A",
    "quiz_results_hero_v1": "B",
    "lp_hero_v1": "A",        // v9: LP hero experiment
    "lp_setup_v1": "B"        // v9: LP setup experiment
  },
  
  // ===== INTERNAL ONLY (do NOT use in generic emails) =====
  "persona_name": "Jason",      // ⚠️ INTERNAL ONLY - never in customer copy
  "persona_legacy_type": "jason"
}`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center gap-4 flex-wrap">
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <Link to="/sleep-persona-debug">
            <Button variant="outline">Persona Debug</Button>
          </Link>
          <Link to="/sleep-quiz">
            <Button>Take Sleep Assessment</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SleepPersonaExperimentsDebug;

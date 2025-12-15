/**
 * Sleep Quiz Diagnostics Page
 * 
 * Internal QA surface to validate persona detection and value contracts
 * without requiring a terminal or Vitest.
 * 
 * This page replicates the integration tests from:
 * - src/tests/analyze-sleep-quiz.integration.test.ts
 * - src/tests/persona-detection.fixtures.ts
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Play, AlertCircle } from "lucide-react";
import type { QuizPayload, PersonaCluster, SleepAssessment } from "@/components/sleep-quiz/QuizTypes";

// ============ ENVIRONMENT CONFIG ============

const ENVIRONMENTS = {
  production: "https://ofryballwrjrgivokzln.supabase.co",
  staging: "https://ofryballwrjrgivokzln.supabase.co", // Same for now, can be changed
} as const;

type Environment = keyof typeof ENVIRONMENTS;

// ============ TEST FIXTURES (from persona-detection.fixtures.ts) ============

const basePayload: QuizPayload = {
  sleepPosition: "side",
  movesOften: "sometimes",
  pillowCount: "1",
  mattressFirmness: "medium",
  sleepEquipment: [],
  painAreas: [],
  painSeverity: 3,
  nightAwakenings: "rarely",
  sleepTemperature: "neutral",
  roomBrightness: "dark",
  roomNoise: "quiet",
  sleepLatency: "normal",
  sleepHours: "7_8",
  eveningScreenUse: "sometimes",
  sleepClothing: "light",
  coSleeping: [],
  sleepGoals: [],
  snoring: "never",
  triedMethods: [],
  pillowSatisfaction: 5,
};

const FIXTURES: Record<string, {
  payload: QuizPayload;
  name: string;
  persona: string;
  description: string;
  keyInputs: string[];
  expectedClusters: PersonaCluster[];
  minConfidence?: number;
  maxConfidence?: number;
}> = {
  painSleeper: {
    payload: {
      ...basePayload,
      sleepPosition: "side",
      movesOften: "often",
      pillowCount: "1",
      mattressFirmness: "medium",
      painAreas: ["neck", "shoulders", "lower_back"],
      painSeverity: 7,
      pillowSatisfaction: 2,
      sleepGoals: ["reduce_pain", "better_posture", "wake_refreshed"],
      nightAwakenings: "once",
      sleepEquipment: ["regular_pillow"],
      sleepTemperature: "neutral",
      roomBrightness: "dark",
      roomNoise: "quiet",
      sleepLatency: "normal",
      sleepHours: "7_8",
      eveningScreenUse: "sometimes",
    },
    name: "Pain Sleeper (Jason)",
    persona: "Jason",
    description: "Clear alignment/pain archetype with high pain severity and posture goals.",
    keyInputs: ["Pain: neck, shoulders, lower_back", "Severity: 7/10", "Goals: reduce_pain, better_posture"],
    expectedClusters: ["pain_sleeper"],
    minConfidence: 70,
  },
  stressSleeper: {
    payload: {
      ...basePayload,
      sleepPosition: "back",
      movesOften: "often",
      pillowCount: "1",
      mattressFirmness: "medium",
      painAreas: [],
      painSeverity: 1,
      pillowSatisfaction: 5,
      sleepGoals: ["fall_asleep_faster", "stay_asleep", "better_quality"],
      nightAwakenings: "frequently",
      sleepEquipment: [],
      sleepTemperature: "hot",
      roomBrightness: "bright",
      roomNoise: "noisy",
      sleepLatency: "very_slow",
      sleepHours: "5_6",
      eveningScreenUse: "always",
    },
    name: "Stress & Environment Sleeper (Mila)",
    persona: "Mila",
    description: "Clear environment/wind-down archetype with poor sleep environment.",
    keyInputs: ["Bright room, noisy, hot", "Very slow onset", "High screen use", "Frequent awakenings"],
    expectedClusters: ["stress_insomnia"],
    minConfidence: 70,
  },
  recoverySleeper: {
    payload: {
      ...basePayload,
      sleepPosition: "back",
      movesOften: "sometimes",
      pillowCount: "1",
      mattressFirmness: "firm",
      painAreas: [],
      painSeverity: 1,
      pillowSatisfaction: 6,
      sleepGoals: ["faster_recovery", "muscle_repair", "more_energy", "wake_refreshed"],
      nightAwakenings: "rarely",
      sleepEquipment: ["whoop", "oura"],
      sleepTemperature: "neutral",
      roomBrightness: "dark",
      roomNoise: "quiet",
      sleepLatency: "quick",
      sleepHours: "7_8",
      eveningScreenUse: "sometimes",
    },
    name: "Recovery Sleeper (Riley)",
    persona: "Riley",
    description: "Clear performance/recovery archetype with wearables and recovery goals.",
    keyInputs: ["Goals: faster_recovery, muscle_repair", "Uses: whoop, oura", "Quick onset", "Good environment"],
    expectedClusters: ["recovery_sleeper"],
    minConfidence: 70,
  },
  optimizer: {
    payload: {
      ...basePayload,
      sleepPosition: "combination",
      movesOften: "sometimes",
      pillowCount: "1",
      mattressFirmness: "medium",
      painAreas: [],
      painSeverity: 1,
      pillowSatisfaction: 8,
      sleepGoals: ["better_quality", "more_energy", "wake_refreshed", "better_posture"],
      nightAwakenings: "never",
      sleepEquipment: ["fitness_tracker"],
      sleepTemperature: "neutral",
      roomBrightness: "dark",
      roomNoise: "quiet",
      sleepLatency: "quick",
      sleepHours: "7_8",
      eveningScreenUse: "never",
    },
    name: "Optimizer (Leo)",
    persona: "Leo",
    description: "Clear optimization archetype with minimal issues and quality goals.",
    keyInputs: ["High pillow satisfaction: 8", "No awakenings", "Goals: better_quality", "No issues"],
    expectedClusters: ["optimizer"],
    minConfidence: 70,
  },
  mixedSignals: {
    payload: {
      ...basePayload,
      sleepPosition: "side",
      movesOften: "sometimes",
      pillowCount: "1",
      mattressFirmness: "soft",
      painAreas: ["neck"],
      painSeverity: 4,
      pillowSatisfaction: 5,
      sleepGoals: ["reduce_pain", "stay_asleep"],
      nightAwakenings: "twice",
      sleepEquipment: [],
      sleepTemperature: "hot",
      roomBrightness: "dim",
      roomNoise: "some",
      sleepLatency: "slow",
      sleepHours: "6_7",
      eveningScreenUse: "sometimes",
    },
    name: "Mixed Signals",
    persona: "Ambiguous",
    description: "Moderate pain AND moderate environment issues - should result in lower confidence.",
    keyInputs: ["Mild neck pain (4/10)", "Hot room", "Slow onset", "Twice awakenings"],
    expectedClusters: ["pain_sleeper", "stress_insomnia"],
    maxConfidence: 65,
  },
};

// ============ TYPES ============

interface TestResult {
  status: "idle" | "loading" | "success" | "error";
  httpStatus?: number;
  cluster?: PersonaCluster;
  confidence?: number;
  confidenceReasoning?: string;
  primaryProduct?: string;
  bundleRecommended?: boolean;
  error?: string;
  rawResponse?: unknown;
  passed?: boolean;
  failReason?: string;
}

interface EdgeFunctionResponse {
  assessment: SleepAssessment;
  recommendations: Array<{ product: string; reason: string; priority: string }>;
  bundleRecommended: boolean;
  profileCreated?: boolean;
  profileUpdated?: boolean;
}

// ============ COMPONENT ============

export default function SleepQuizDiagnostics() {
  const [environment, setEnvironment] = useState<Environment>("production");
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [customPayload, setCustomPayload] = useState<string>(
    JSON.stringify(basePayload, null, 2)
  );
  const [customResult, setCustomResult] = useState<TestResult>({ status: "idle" });

  const getEdgeFunctionUrl = useCallback(() => {
    return `${ENVIRONMENTS[environment]}/functions/v1/analyze-sleep-quiz`;
  }, [environment]);

  const runTest = useCallback(async (fixtureKey: string) => {
    const fixture = FIXTURES[fixtureKey];
    if (!fixture) return;

    setResults(prev => ({
      ...prev,
      [fixtureKey]: { status: "loading" },
    }));

    try {
      const response = await fetch(getEdgeFunctionUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: fixture.payload,
          email: `test-${fixtureKey}@diagnostics.local`,
          createProfile: false,
        }),
      });

      const httpStatus = response.status;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setResults(prev => ({
          ...prev,
          [fixtureKey]: {
            status: "error",
            httpStatus,
            error: errorData.error || `HTTP ${httpStatus}`,
          },
        }));
        return;
      }

      const data: EdgeFunctionResponse = await response.json();
      const { assessment } = data;

      // Evaluate PASS/FAIL
      let passed = true;
      let failReason = "";

      const cluster = assessment.persona.cluster;
      const confidence = assessment.persona.confidence;

      // Check cluster
      if (!fixture.expectedClusters.includes(cluster)) {
        passed = false;
        failReason = `Expected [${fixture.expectedClusters.join(", ")}], got "${cluster}"`;
      }

      // Check confidence bounds
      if (passed && fixture.minConfidence !== undefined && confidence !== undefined) {
        if (confidence < fixture.minConfidence) {
          passed = false;
          failReason = `Confidence ${confidence}% is below expected ≥${fixture.minConfidence}%`;
        }
      }

      if (passed && fixture.maxConfidence !== undefined && confidence !== undefined) {
        if (confidence > fixture.maxConfidence) {
          passed = false;
          failReason = `Confidence ${confidence}% is above expected ≤${fixture.maxConfidence}%`;
        }
      }

      setResults(prev => ({
        ...prev,
        [fixtureKey]: {
          status: "success",
          httpStatus,
          cluster,
          confidence,
          confidenceReasoning: assessment.persona.confidence_reasoning,
          primaryProduct: assessment.productRecommendations.primary_product,
          bundleRecommended: data.bundleRecommended,
          rawResponse: data,
          passed,
          failReason,
        },
      }));
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [fixtureKey]: {
          status: "error",
          error: err instanceof Error ? err.message : "Network error",
        },
      }));
    }
  }, [getEdgeFunctionUrl]);

  const runCustomTest = useCallback(async () => {
    setCustomResult({ status: "loading" });

    let parsedPayload: QuizPayload;
    try {
      parsedPayload = JSON.parse(customPayload);
    } catch {
      setCustomResult({
        status: "error",
        error: "Invalid JSON in payload",
      });
      return;
    }

    try {
      const response = await fetch(getEdgeFunctionUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: parsedPayload,
          email: "custom-test@diagnostics.local",
          createProfile: false,
        }),
      });

      const httpStatus = response.status;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setCustomResult({
          status: "error",
          httpStatus,
          error: errorData.error || `HTTP ${httpStatus}`,
        });
        return;
      }

      const data: EdgeFunctionResponse = await response.json();
      const { assessment } = data;

      setCustomResult({
        status: "success",
        httpStatus,
        cluster: assessment.persona.cluster,
        confidence: assessment.persona.confidence,
        confidenceReasoning: assessment.persona.confidence_reasoning,
        primaryProduct: assessment.productRecommendations.primary_product,
        bundleRecommended: data.bundleRecommended,
        rawResponse: data,
      });
    } catch (err) {
      setCustomResult({
        status: "error",
        error: err instanceof Error ? err.message : "Network error",
      });
    }
  }, [customPayload, getEdgeFunctionUrl]);

  const runAllTests = useCallback(async () => {
    for (const key of Object.keys(FIXTURES)) {
      await runTest(key);
    }
  }, [runTest]);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-light tracking-wide text-foreground">
            Sleep Assessment Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground">
            Internal QA surface for persona detection validation
          </p>
        </div>

        {/* Environment Selector */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Environment</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Select value={environment} onValueChange={(v) => setEnvironment(v as Environment)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground font-mono truncate flex-1">
              {getEdgeFunctionUrl()}
            </span>
            <Button onClick={runAllTests} variant="outline" size="sm">
              <Play className="w-3 h-3 mr-1" />
              Run All
            </Button>
          </CardContent>
        </Card>

        {/* Fixture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(FIXTURES).map(([key, fixture]) => {
            const result = results[key] || { status: "idle" };
            return (
              <FixtureCard
                key={key}
                fixture={fixture}
                result={result}
                onRun={() => runTest(key)}
              />
            );
          })}
        </div>

        {/* Custom Payload */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium">Custom Payload</CardTitle>
            <CardDescription>
              Test with a custom QuizPayload JSON (no PASS/FAIL evaluation)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              className="font-mono text-xs h-64"
              placeholder="Enter QuizPayload JSON..."
            />
            <div className="flex items-center gap-4">
              <Button onClick={runCustomTest} disabled={customResult.status === "loading"}>
                {customResult.status === "loading" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run Check
              </Button>
              {customResult.status === "success" && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{customResult.cluster}</Badge>
                  {customResult.confidence !== undefined && (
                    <span className="text-muted-foreground">
                      {customResult.confidence}% confidence
                    </span>
                  )}
                </div>
              )}
              {customResult.status === "error" && (
                <span className="text-sm text-destructive">{customResult.error}</span>
              )}
            </div>
            {customResult.status === "success" && customResult.rawResponse && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View raw response
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto max-h-64">
                  {JSON.stringify(customResult.rawResponse, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          This page is for internal diagnostics only. Results validate against the v9 Sleep Assessment contracts.
        </p>
      </div>
    </div>
  );
}

// ============ FIXTURE CARD COMPONENT ============

interface FixtureCardProps {
  fixture: typeof FIXTURES[string];
  result: TestResult;
  onRun: () => void;
}

function FixtureCard({ fixture, result, onRun }: FixtureCardProps) {
  return (
    <Card className="border-border/50 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">{fixture.name}</CardTitle>
          {result.status === "success" && result.passed !== undefined && (
            result.passed ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                PASS
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20">
                <XCircle className="w-3 h-3 mr-1" />
                FAIL
              </Badge>
            )
          )}
        </div>
        <CardDescription className="text-xs">{fixture.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Key Inputs */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Key Inputs:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {fixture.keyInputs.map((input, i) => (
              <li key={i} className="truncate">• {input}</li>
            ))}
          </ul>
        </div>

        {/* Expected */}
        <div className="text-xs space-y-1">
          <p className="font-medium text-muted-foreground">Expected:</p>
          <div className="flex flex-wrap gap-1">
            {fixture.expectedClusters.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs font-normal">
                {c}
              </Badge>
            ))}
            {fixture.minConfidence !== undefined && (
              <span className="text-muted-foreground">≥{fixture.minConfidence}%</span>
            )}
            {fixture.maxConfidence !== undefined && (
              <span className="text-muted-foreground">≤{fixture.maxConfidence}%</span>
            )}
          </div>
        </div>

        {/* Results */}
        {result.status === "loading" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running...
          </div>
        )}

        {result.status === "error" && (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{result.error}</span>
          </div>
        )}

        {result.status === "success" && (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <span className="text-muted-foreground">Status:</span>
              <span>{result.httpStatus}</span>
              <span className="text-muted-foreground">Cluster:</span>
              <span className="font-medium">{result.cluster}</span>
              {result.confidence !== undefined && (
                <>
                  <span className="text-muted-foreground">Confidence:</span>
                  <span>{result.confidence}%</span>
                </>
              )}
              <span className="text-muted-foreground">Primary:</span>
              <span>{result.primaryProduct}</span>
              <span className="text-muted-foreground">Bundle:</span>
              <span>{result.bundleRecommended ? "Yes" : "No"}</span>
            </div>

            {result.failReason && (
              <p className="text-red-600 text-xs">{result.failReason}</p>
            )}

            {result.confidenceReasoning && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Reasoning
                </summary>
                <p className="mt-1 text-muted-foreground italic">
                  {result.confidenceReasoning}
                </p>
              </details>
            )}
          </div>
        )}

        {/* Run Button */}
        <div className="pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRun}
            disabled={result.status === "loading"}
            className="w-full"
          >
            {result.status === "loading" ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Play className="w-3 h-3 mr-1" />
            )}
            Run Check
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types matching the edge function output
export interface EPSRPatternCandidate {
  hypothesis: string;
  why_it_fits: string;
  falsification: string;
  confidence: "LOW" | "MODERATE";
}

export interface EPSREvidenceLink {
  evidence_id: string;
  confidence_level: string;
  relevance: string;
}

export interface EPSRExperiment {
  protocol: string;
  duration_days: number;
  what_to_log: string[];
  success_criteria: string;
  failure_criteria: string;
  decision_rule: string;
}

export interface EPSRFoundationItem {
  action: string;
  evidence_id: string;
  rationale: string;
}

export interface EPSRLedgerWriteback {
  new_hypothesis: string;
  hypothesis_id: string;
  experiment_protocol: string;
  confidence_start: "LOW" | "MODERATE";
  expected_check_in_days: number;
  metrics: string[];
  supporting_evidence: string[];
}

export interface EPSROutput {
  safety_scope: string;
  mode: "cold_start" | "foundation" | "normal" | "clinical_guardrail";
  current_signals: string[];
  pattern_candidates: EPSRPatternCandidate[];
  evidence_links: EPSREvidenceLink[];
  interpretation: string;
  uncertainty_missing: string[];
  experiment?: EPSRExperiment;
  foundation_items?: EPSRFoundationItem[];
  ledger_writeback?: EPSRLedgerWriteback;
  clinical_flags?: string[];
}

export interface EPSRHistoryItem {
  id: string;
  created_at: string;
  user_question: string | null;
  mode: string;
}

export interface UseEPSRReturn {
  output: EPSROutput | null;
  isLoading: boolean;
  error: string | null;
  runReasoning: (question?: string) => Promise<void>;
  clearOutput: () => void;
  history: EPSRHistoryItem[];
  loadingHistory: boolean;
  loadHistoricalRun: (id: string) => Promise<void>;
  selectedHistoryId: string | null;
  refreshHistory: () => Promise<void>;
}

export function useEPSR(): UseEPSRReturn {
  const [output, setOutput] = useState<EPSROutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EPSRHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { data, error: fetchError } = await supabase
        .from("epsr_sessions")
        .select("id, created_at, user_question, mode")
        .eq("email", user.email)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) {
        console.error("Error fetching EPSR history:", fetchError);
        return;
      }

      setHistory(data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const loadHistoricalRun = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("epsr_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        throw new Error("Failed to load historical run");
      }

      // Try to parse the full output from raw_ai_response first (contains all data)
      let parsedOutput: EPSROutput | null = null;
      if (data.raw_ai_response) {
        try {
          // raw_ai_response may be wrapped in markdown code blocks
          let jsonStr = data.raw_ai_response as string;
          const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1];
          }
          parsedOutput = JSON.parse(jsonStr) as EPSROutput;
        } catch (parseErr) {
          console.warn("Failed to parse raw_ai_response, falling back to partial reconstruction:", parseErr);
        }
      }

      // If we successfully parsed the full output, use it
      if (parsedOutput) {
        // Ensure mode matches the stored value
        parsedOutput.mode = data.mode as EPSROutput["mode"];
        setOutput(parsedOutput);
      } else {
        // Fallback: Reconstruct EPSROutput from stored session data (partial)
        const reconstructedOutput: EPSROutput = {
          safety_scope: "educational",
          mode: data.mode as EPSROutput["mode"],
          current_signals: (data.user_signals as Record<string, unknown>)?.sleep_logs 
            ? ((data.user_signals as Record<string, unknown>).sleep_logs as Array<{ date: string; sleep_quality: number; pain_level_morning: number }>)
                .slice(0, 5)
                .map((log) => `${log.date}: Quality ${log.sleep_quality}/5, Pain ${log.pain_level_morning}/5`)
            : [],
          pattern_candidates: (data.pattern_candidates as unknown as EPSRPatternCandidate[]) || [],
          evidence_links: [],
          interpretation: "Historical run loaded from saved session (partial data).",
          uncertainty_missing: [],
          experiment: data.experiment_proposed as unknown as EPSRExperiment | undefined,
          ledger_writeback: data.ledger_writeback as unknown as EPSRLedgerWriteback | undefined,
          clinical_flags: data.clinical_flags || undefined,
        };
        setOutput(reconstructedOutput);
      }

      setSelectedHistoryId(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load run";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runReasoning = useCallback(async (question?: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedHistoryId(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("epsr-reason", {
        body: question ? { question } : {},
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to run EPSR reasoning");
      }

      if (data.error) {
        // Handle specific error cases
        if (data.code === "RATE_LIMIT_EXCEEDED") {
          toast({
            title: "Daily Limit Reached",
            description: data.error,
            variant: "destructive",
          });
        } else if (data.error.includes("Rate limit")) {
          toast({
            title: "Rate Limited",
            description: "Please wait a moment before trying again.",
            variant: "destructive",
          });
        } else if (data.error.includes("credits")) {
          toast({
            title: "Service Unavailable",
            description: "AI service temporarily unavailable.",
            variant: "destructive",
          });
        }
        throw new Error(data.error);
      }

      setOutput(data as EPSROutput);
      // Refresh history after successful run
      await fetchHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("EPSR error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchHistory]);

  const clearOutput = useCallback(() => {
    setOutput(null);
    setError(null);
    setSelectedHistoryId(null);
  }, []);

  return {
    output,
    isLoading,
    error,
    runReasoning,
    clearOutput,
    history,
    loadingHistory,
    loadHistoricalRun,
    selectedHistoryId,
    refreshHistory: fetchHistory,
  };
}

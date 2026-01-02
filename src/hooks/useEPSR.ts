import { useState, useCallback } from "react";
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

export interface UseEPSRReturn {
  output: EPSROutput | null;
  isLoading: boolean;
  error: string | null;
  runReasoning: (question?: string) => Promise<void>;
  clearOutput: () => void;
}

export function useEPSR(): UseEPSRReturn {
  const [output, setOutput] = useState<EPSROutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const runReasoning = useCallback(async (question?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("epsr-reason", {
        body: question ? { question } : {},
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to run EPSR reasoning");
      }

      if (data.error) {
        // Handle specific error cases
        if (data.error.includes("Rate limit")) {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("EPSR error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearOutput = useCallback(() => {
    setOutput(null);
    setError(null);
  }, []);

  return {
    output,
    isLoading,
    error,
    runReasoning,
    clearOutput,
  };
}

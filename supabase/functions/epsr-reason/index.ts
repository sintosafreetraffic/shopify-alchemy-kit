/**
 * EPSR (Evidence-Bound Personal Sleep Reasoner) Edge Function
 * 
 * The core reasoning engine for RiseByNight's science-backed sleep system.
 * Uses a curated evidence corpus + user signals + epistemic ledger to generate
 * structured, uncertainty-explicit reasoning about sleep patterns.
 * 
 * This is NOT a chatbot, therapist, or generic AI coach.
 * It's a structured reasoning system that shows its work.
 * 
 * === EPSR MODEL REQUIREMENTS (FIX #5) ===
 * This function requires an AI model with:
 * - HIGH instruction adherence (strict JSON output, schema compliance)
 * - EPISTEMIC CONSISTENCY (no hallucination of evidence, calibrated confidence)
 * - LOW creativity (evidence-bound, not generative)
 * 
 * DO NOT substitute with ultra-fast/creative model variants.
 * gemini-2.5-flash is selected for its structured output reliability.
 * =========================================
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// TYPES
// ============================================================================

interface EvidenceItem {
  evidence_id: string;
  evidence_version: number;
  title: string;
  source_type: string;
  confidence_level: "HIGH" | "MODERATE" | "EMERGING";
  claim_summary: string;
  population_notes: string | null;
  constraints: string | null;
  topic_tags: string[];
}

interface LedgerEntry {
  hypothesis_id: string;
  hypothesis: string;
  supporting_evidence: string[];
  counter_evidence: string[];
  experiment_protocol: string | null;
  outcome: "pending" | "supported" | "rejected" | "inconclusive" | null;
  confidence_level: "LOW" | "MODERATE" | "HIGH" | null;
  confidence_change: string | null;
  status: string;
  created_at: string;
}

interface UserSignals {
  nights_logged: number;
  quiz_data?: Record<string, unknown>;
  sleep_logs?: Array<{
    date: string;
    sleep_quality: number;
    pain_level_morning: number;
    felt_hot?: boolean;
    felt_stressed?: boolean;
    time_to_sleep_minutes?: number;
    wake_ups_per_night?: number;
    notes?: string;
  }>;
  wearable_data?: {
    avg_sleep_minutes?: number;
    avg_efficiency?: number;
    avg_wake_events?: number;
    hrv_trend?: "up" | "stable" | "down";
    timing_variance_minutes?: number;
    sources?: string[];
  };
  behavioral_signals?: {
    caffeine_after_15?: boolean;
    alcohol_nights_7d?: number;
    exercise_nights_7d?: number;
    stress_level_avg?: number;
  };
  profile?: {
    sleep_position?: string;
    pain_points?: string[];
    temperature_preference?: string;
    chronotype?: string;
  };
  user_question?: string;
}

interface EvidenceRef {
  evidence_id: string;
  evidence_version: number;
}

interface LedgerWriteback {
  new_hypothesis: string;
  hypothesis_id: string;
  experiment_protocol: string;
  confidence_start: "LOW" | "MODERATE";
  expected_check_in_days: number;
  metrics: string[];
  supporting_evidence: string[]; // AI returns plain IDs
  supporting_evidence_versioned?: EvidenceRef[]; // We enrich with versions
}

interface EPSROutput {
  safety_scope: string;
  mode: "cold_start" | "foundation" | "normal" | "clinical_guardrail";
  current_signals: string[];
  pattern_candidates: Array<{
    hypothesis: string;
    why_it_fits: string;
    falsification: string;
    confidence: "LOW" | "MODERATE";
  }>;
  evidence_links: Array<{
    evidence_id: string;
    confidence_level: string;
    relevance: string;
  }>;
  interpretation: string;
  uncertainty_missing: string[];
  experiment?: {
    protocol: string;
    duration_days: number;
    what_to_log: string[];
    success_criteria: string;
    failure_criteria: string;
    decision_rule: string;
  };
  foundation_items?: Array<{
    action: string;
    evidence_id: string;
    rationale: string;
  }>;
  ledger_writeback?: LedgerWriteback;
  clinical_flags?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ============================================================================
// CLINICAL GUARDRAILS
// ============================================================================

const TIER1_HARD_STOP_PATTERNS = [
  /witnessed apnea/i,
  /stop(ped)? breathing/i,
  /suicidal/i,
  /self.?harm/i,
  /want(ing)? to (die|end)/i,
  /severe.*(sleepy|sleepiness|tired).*(driving|operating|work)/i,
  /fell asleep.*(driving|wheel)/i,
];

const TIER2_CAUTION_PATTERNS = [
  /apnea/i,
  /snor(e|ing)/i,
  /insomnia.*(month|year|chronic)/i,
  /can'?t sleep.*(month|week)/i,
  /restless legs/i,
  /kick.*(sleep|bed)/i,
];

function checkClinicalFlags(userQuestion?: string, notes?: string[]): { tier1: boolean; tier2: boolean; flags: string[] } {
  const textToCheck = [userQuestion || "", ...(notes || [])].join(" ").toLowerCase();
  const flags: string[] = [];
  
  let tier1 = false;
  for (const pattern of TIER1_HARD_STOP_PATTERNS) {
    if (pattern.test(textToCheck)) {
      tier1 = true;
      flags.push(`TIER1: ${pattern.toString()}`);
    }
  }
  
  let tier2 = false;
  for (const pattern of TIER2_CAUTION_PATTERNS) {
    if (pattern.test(textToCheck)) {
      tier2 = true;
      flags.push(`TIER2: ${pattern.toString()}`);
    }
  }
  
  return { tier1, tier2, flags };
}

// ============================================================================
// VALIDATION HELPERS (FIX #2 - Evidence ID Validation)
// ============================================================================

interface ValidationResult {
  valid: boolean;
  invalidIds: string[];
  context: string;
}

/**
 * Validates that ALL evidence_ids referenced in EPSR output exist in the corpus.
 * This enforces the "evidence-bound" contract programmatically.
 */
function validateEvidenceIds(
  output: EPSROutput,
  evidenceCorpus: EvidenceItem[]
): ValidationResult {
  const validIds = new Set(evidenceCorpus.map(e => e.evidence_id));
  const invalidIds: string[] = [];
  const context: string[] = [];

  // Check evidence_links
  for (const link of output.evidence_links || []) {
    if (!validIds.has(link.evidence_id)) {
      invalidIds.push(link.evidence_id);
      context.push(`evidence_links: ${link.evidence_id}`);
    }
  }

  // Check foundation_items
  for (const item of output.foundation_items || []) {
    if (!validIds.has(item.evidence_id)) {
      invalidIds.push(item.evidence_id);
      context.push(`foundation_items: ${item.evidence_id}`);
    }
  }

  // Check ledger_writeback.supporting_evidence
  if (output.ledger_writeback?.supporting_evidence) {
    for (const evId of output.ledger_writeback.supporting_evidence) {
      if (!validIds.has(evId)) {
        invalidIds.push(evId);
        context.push(`ledger_writeback.supporting_evidence: ${evId}`);
      }
    }
  }

  return {
    valid: invalidIds.length === 0,
    invalidIds: [...new Set(invalidIds)],
    context: context.join("; "),
  };
}

// ============================================================================
// TIER 2 HARDENING (FIX #3)
// ============================================================================

const REQUIRED_TIER2_FALSIFICATION_PHRASE = "professional evaluation may be appropriate";

/**
 * Applies Tier 2 clinical hardening to EPSR output:
 * - Limits to max 1 pattern candidate
 * - Forces all pattern confidence to LOW
 * - Ensures falsification includes professional evaluation language
 * - Removes non-observational experiments
 */
function applyTier2Hardening(output: EPSROutput): EPSROutput {
  const hardened = { ...output };

  // Limit to 1 pattern candidate
  if (hardened.pattern_candidates && hardened.pattern_candidates.length > 1) {
    console.log("[EPSR-TIER2] Limiting pattern_candidates from", hardened.pattern_candidates.length, "to 1");
    hardened.pattern_candidates = [hardened.pattern_candidates[0]];
  }

  // Force LOW confidence and add professional evaluation to falsification
  if (hardened.pattern_candidates) {
    hardened.pattern_candidates = hardened.pattern_candidates.map(p => ({
      ...p,
      confidence: "LOW" as const,
      falsification: p.falsification.toLowerCase().includes("professional") 
        ? p.falsification 
        : `${p.falsification} Note: ${REQUIRED_TIER2_FALSIFICATION_PHRASE}.`,
    }));
  }

  // Check if experiment is observational (no interventions)
  if (hardened.experiment) {
    const protocol = hardened.experiment.protocol.toLowerCase();
    const interventionKeywords = ["try", "implement", "change", "modify", "adjust", "reduce", "increase", "eliminate", "add"];
    const isObservational = !interventionKeywords.some(kw => protocol.includes(kw));
    
    if (!isObservational) {
      console.log("[EPSR-TIER2] Removing non-observational experiment:", hardened.experiment.protocol);
      delete hardened.experiment;
    }
  }

  // Remove ledger_writeback for Tier 2 (no new hypotheses)
  if (hardened.ledger_writeback) {
    console.log("[EPSR-TIER2] Removing ledger_writeback for clinical caution mode");
    delete hardened.ledger_writeback;
  }

  return hardened;
}

// ============================================================================
// SYSTEM PROMPT (v3 with fixes)
// ============================================================================

function buildEPSRSystemPrompt(evidencePack: EvidenceItem[], ledgerSnapshot: LedgerEntry[]): string {
  return `You are EPSR — Evidence-Bound Personal Sleep Reasoner for RiseByNight.

## IDENTITY & SCOPE (NON-NEGOTIABLE)

You are NOT:
- a chatbot
- a therapist  
- a clinician
- a motivational coach
- a diagnostic system

You ARE:
- a structured reasoning system
- evidence-bound (you may ONLY cite from EVIDENCE_PACK)
- uncertainty-explicit
- experiment-oriented
- epistemically honest

All outputs must be:
- educational (not medical advice)
- probabilistic (use calibrated language: "suggests", "consistent with", "plausible")
- reversible (experiments, not prescriptions)
- transparent about limits

## FORBIDDEN LANGUAGE (never use)
cure, treat, fix, diagnose, optimal, guaranteed, clinically proven, medical advice, you should, you must

## CALIBRATED LANGUAGE (use instead)
observe, suggest, test, evaluate, clarify, consistent with, plausible, uncertain, may, might

## EVIDENCE_PACK (Your ONLY source of evidence)
${JSON.stringify(evidencePack, null, 2)}

## LEDGER_SNAPSHOT (Prior hypotheses for this user)
${ledgerSnapshot.length > 0 ? JSON.stringify(ledgerSnapshot, null, 2) : "No prior hypotheses logged."}

## OPERATING MODES

### Cold-Start Mode (nights_logged < 7)
- Demonstrate reasoning structure
- Avoid false personalization  
- Provide 1 low-confidence hypothesis
- Provide 1 signal-quality experiment
- Include Foundation Mode

### Foundation Mode (cold-start OR insufficient signal quality)
- Only HIGH confidence evidence
- Framed as baseline conditions, not prescriptions
- Maximum 3 items

### Normal Mode (sufficient data)
- Generate ≤3 pattern candidates ranked by signal consistency + evidence confidence
- Full experiment proposal

### Clinical Guardrail Mode
- If TIER1 flags present: HALT reasoning, recommend professional evaluation
- If TIER2 flags present: Proceed cautiously, explicitly note uncertainty

## PATTERN GENERATION RULES
- Never claim causality (correlation only)
- Each pattern must include falsification conditions
- Rank by: signal consistency, evidence confidence, recency

## OUTPUT FORMAT (STRICT JSON)
Return a JSON object with exactly these fields:
{
  "safety_scope": "Educational guidance, not medical advice.",
  "mode": "cold_start | foundation | normal | clinical_guardrail",
  "current_signals": ["Signal 1 (fact only)", "Signal 2"],
  "pattern_candidates": [
    {
      "hypothesis": "Clear hypothesis statement",
      "why_it_fits": "1-2 sentences, correlation language only",
      "falsification": "What would disprove this",
      "confidence": "LOW | MODERATE"
    }
  ],
  "evidence_links": [
    {
      "evidence_id": "E-XXX",
      "confidence_level": "HIGH | MODERATE | EMERGING",
      "relevance": "1 sentence explaining relevance"
    }
  ],
  "interpretation": "2-3 sentences explaining plausible relationships and what is uncertain",
  "uncertainty_missing": ["Missing signal 1", "Confounder 2", "Sample size limit"],
  "experiment": {
    "protocol": "Clear protocol description",
    "duration_days": 5,
    "what_to_log": ["metric1", "metric2"],
    "success_criteria": "Specific measurable outcome",
    "failure_criteria": "What indicates failure",
    "decision_rule": "If X then Y, if Z then W"
  },
  "foundation_items": [
    {
      "action": "Specific baseline action",
      "evidence_id": "E-XXX",
      "rationale": "Brief rationale"
    }
  ],
  "ledger_writeback": {
    "new_hypothesis": "Hypothesis text",
    "hypothesis_id": "H-XXX",
    "experiment_protocol": "Protocol summary",
    "confidence_start": "LOW | MODERATE",
    "expected_check_in_days": 5,
    "metrics": ["metric1", "metric2"],
    "supporting_evidence": ["E-XXX"]
  }
}

## CONFIDENCE DECAY RULE
If a hypothesis in LEDGER_SNAPSHOT is >14 days old with no new outcome, note that confidence should be downgraded.

## ERROR CONDITIONS
- If evidence for a pattern does not exist in EVIDENCE_PACK: explicitly state "INSUFFICIENT EVIDENCE IN CORPUS"
- Never fabricate evidence_ids
- Never infer beyond stated claims in evidence

Return ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchEvidenceCorpus(supabase: SupabaseClient, topicTags?: string[]): Promise<EvidenceItem[]> {
  let query = supabase
    .from("epsr_evidence_corpus")
    .select("evidence_id, evidence_version, title, source_type, confidence_level, claim_summary, population_notes, constraints, topic_tags")
    .eq("is_active", true);
  
  // If topic tags provided, filter (but still include all for context)
  const { data, error } = await query.order("evidence_id");
  
  if (error) {
    console.error("Error fetching evidence corpus:", error);
    return [];
  }
  
  return data || [];
}

async function fetchLedgerSnapshot(supabase: SupabaseClient, email: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("epsr_epistemic_ledger")
    .select("hypothesis_id, hypothesis, supporting_evidence, counter_evidence, experiment_protocol, outcome, confidence_level, confidence_change, status, created_at")
    .eq("email", email)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false })
    .limit(10);
  
  if (error) {
    console.error("Error fetching ledger:", error);
    return [];
  }
  
  return data || [];
}

async function fetchUserSignals(supabase: SupabaseClient, email: string, userId: string): Promise<UserSignals> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
  
  // Parallel fetch all user data
  const [profileResult, logsResult, wearableResult] = await Promise.all([
    supabase
      .from("sleep_profiles")
      .select("sleep_position, pain_points, temperature_preference, stress_level, quiz_data")
      .eq("email", email)
      .single(),
    supabase
      .from("sleep_logs")
      .select("date, sleep_quality, pain_level_morning, felt_hot, felt_stressed, time_to_sleep_minutes, wake_ups_per_night, notes")
      .eq("email", email)
      .gte("date", thirtyDaysAgoStr)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("sleep_nights")
      .select("night_date, total_sleep_minutes, sleep_efficiency, wake_events, source")
      .eq("user_id", userId)
      .eq("is_test", false)
      .gte("night_date", thirtyDaysAgoStr)
      .order("night_date", { ascending: false })
      .limit(30),
  ]);

  const logs = logsResult.data || [];
  const wearableNights = wearableResult.data || [];
  const profile = profileResult.data;

  // Calculate behavioral signals from logs
  const recentLogs = logs.slice(0, 7);
  const caffeineAfter15 = recentLogs.some(l => l.notes?.toLowerCase().includes("caffeine") || l.notes?.toLowerCase().includes("coffee"));
  const alcoholNights = recentLogs.filter(l => l.notes?.toLowerCase().includes("alcohol") || l.notes?.toLowerCase().includes("drink")).length;
  const stressedNights = recentLogs.filter(l => l.felt_stressed).length;
  
  // Calculate wearable metrics
  let wearableData = undefined;
  if (wearableNights.length > 0) {
    const avgSleep = wearableNights.reduce((sum, n) => sum + (n.total_sleep_minutes || 0), 0) / wearableNights.length;
    const avgEfficiency = wearableNights.reduce((sum, n) => sum + (n.sleep_efficiency || 0), 0) / wearableNights.length;
    const avgWakeEvents = wearableNights.reduce((sum, n) => sum + (n.wake_events || 0), 0) / wearableNights.length;
    const sources = [...new Set(wearableNights.map(n => n.source))];
    
    wearableData = {
      avg_sleep_minutes: Math.round(avgSleep),
      avg_efficiency: Math.round(avgEfficiency),
      avg_wake_events: Math.round(avgWakeEvents * 10) / 10,
      sources,
    };
  }

  return {
    nights_logged: logs.length,
    quiz_data: profile?.quiz_data as Record<string, unknown> | undefined,
    sleep_logs: logs,
    wearable_data: wearableData,
    behavioral_signals: {
      caffeine_after_15: caffeineAfter15,
      alcohol_nights_7d: alcoholNights,
      stress_level_avg: stressedNights > 0 ? stressedNights / 7 : undefined,
    },
    profile: profile ? {
      sleep_position: profile.sleep_position,
      pain_points: profile.pain_points,
      temperature_preference: profile.temperature_preference,
    } : undefined,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = user.email;
    const userId = user.id;

    // Parse request
    const body = await req.json().catch(() => ({}));
    const userQuestion = body.question as string | undefined;

    // Service role client for data access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all data in parallel
    const [evidenceCorpus, ledgerSnapshot, userSignals] = await Promise.all([
      fetchEvidenceCorpus(supabase),
      fetchLedgerSnapshot(supabase, email),
      fetchUserSignals(supabase, email, userId),
    ]);

    // Add user question to signals
    if (userQuestion) {
      userSignals.user_question = userQuestion;
    }

    // Check clinical flags
    const logNotes = userSignals.sleep_logs?.map(l => l.notes).filter(Boolean) as string[];
    const clinicalCheck = checkClinicalFlags(userQuestion, logNotes);

    // Determine mode (FIX #1 - Server is the authority)
    let serverComputedMode: EPSROutput["mode"] = "normal";
    if (clinicalCheck.tier1) {
      serverComputedMode = "clinical_guardrail";
    } else if (userSignals.nights_logged < 7) {
      serverComputedMode = "cold_start";
    } else if (userSignals.nights_logged < 14 && (!userSignals.wearable_data || userSignals.wearable_data.sources?.length === 0)) {
      serverComputedMode = "foundation";
    }

    // For tier1 clinical flags, return immediately without AI
    if (serverComputedMode === "clinical_guardrail" && clinicalCheck.tier1) {
      const guardrailResponse: Partial<EPSROutput> = {
        safety_scope: "This system cannot safely reason about this scenario. Please consult a healthcare professional.",
        mode: "clinical_guardrail",
        current_signals: ["Clinical guardrail triggered"],
        pattern_candidates: [],
        evidence_links: [],
        interpretation: "The signals you've described fall outside what this evidence-based reasoning system can responsibly address. A licensed sleep medicine specialist or healthcare provider would be better suited to evaluate these concerns.",
        uncertainty_missing: ["Professional medical evaluation required"],
        clinical_flags: clinicalCheck.flags,
      };

      // Log session
      await supabase.from("epsr_sessions").insert({
        email,
        user_id: userId,
        mode: "clinical_guardrail",
        user_signals: userSignals,
        clinical_flags: clinicalCheck.flags,
      });

      return new Response(
        JSON.stringify(guardrailResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt
    const systemPrompt = buildEPSRSystemPrompt(evidenceCorpus, ledgerSnapshot);
    const userPrompt = `USER_SIGNALS:
${JSON.stringify(userSignals, null, 2)}

MODE: ${serverComputedMode}
${clinicalCheck.tier2 ? `\nCAUTION: Tier 2 clinical flags detected. Proceed with explicit uncertainty. Flags: ${clinicalCheck.flags.join(", ")}` : ""}
${userQuestion ? `\nUSER QUESTION: ${userQuestion}` : ""}

Generate EPSR output following the exact JSON schema specified.`;

    console.log(`[EPSR] Reasoning for ${email}, mode: ${serverComputedMode}, nights: ${userSignals.nights_logged}`);

    // Call Lovable AI
    // FIX #5: EPSR requires high instruction adherence, epistemic consistency, low creativity.
    // gemini-2.5-flash is selected for structured output reliability. Do NOT use creative variants.
    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower for more consistent structured output
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("[EPSR] AI API error:", status, errorText);
      return new Response(
        JSON.stringify({ error: "AI reasoning failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    // FIX #4: STRICT JSON PARSING - Strip markdown code blocks if present
    let epsrOutput: EPSROutput;
    try {
      // Strip markdown code blocks if the model wrapped the JSON
      let jsonContent = rawContent.trim();
      if (jsonContent.startsWith("```")) {
        // Remove opening ```json or ``` and closing ```
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      epsrOutput = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      // FIX #6: Log JSON parse failure for observability
      console.error("[EPSR-INTEGRITY] JSON parse failure:", {
        error: parseError instanceof Error ? parseError.message : "Unknown parse error",
        rawContentLength: rawContent.length,
        rawContentPreview: rawContent.substring(0, 500),
      });
      
      return new Response(
        JSON.stringify({ 
          error: "EPSR reasoning produced malformed output", 
          code: "JSON_PARSE_FAILURE" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX #1: MODE ENFORCEMENT - Server overwrites AI's mode
    if (epsrOutput.mode !== serverComputedMode) {
      console.warn("[EPSR-INTEGRITY] Mode mismatch detected:", {
        aiReturnedMode: epsrOutput.mode,
        serverComputedMode,
        email,
      });
    }
    epsrOutput.mode = serverComputedMode; // Server is ALWAYS the authority

    // FIX #2: EVIDENCE ID VALIDATION
    const validationResult = validateEvidenceIds(epsrOutput, evidenceCorpus);
    if (!validationResult.valid) {
      console.error("[EPSR-INTEGRITY] Invalid/fabricated evidence_ids detected:", {
        invalidIds: validationResult.invalidIds,
        context: validationResult.context,
        rawContentPreview: rawContent.substring(0, 500),
      });
      
      return new Response(
        JSON.stringify({ 
          error: "EPSR output contained invalid evidence references", 
          code: "INVALID_EVIDENCE_IDS",
          invalidIds: validationResult.invalidIds,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX #3: TIER 2 CLINICAL HARDENING
    if (clinicalCheck.tier2) {
      console.log("[EPSR-TIER2] Applying Tier 2 clinical hardening for:", email);
      epsrOutput = applyTier2Hardening(epsrOutput);
      epsrOutput.clinical_flags = clinicalCheck.flags;
    }

    // Log session with integrity markers
    await supabase.from("epsr_sessions").insert({
      email,
      user_id: userId,
      mode: serverComputedMode,
      user_signals: userSignals,
      pattern_candidates: epsrOutput.pattern_candidates,
      experiment_proposed: epsrOutput.experiment,
      ledger_writeback: epsrOutput.ledger_writeback,
      clinical_flags: clinicalCheck.flags.length > 0 ? clinicalCheck.flags : null,
      raw_ai_response: rawContent,
    });

    // If there's a ledger writeback, save it (only if NOT Tier 2)
    if (epsrOutput.ledger_writeback && !clinicalCheck.tier2) {
      const wb = epsrOutput.ledger_writeback;
      
      // Enrich supporting_evidence with version numbers for temporal traceability
      const evidenceVersionMap = new Map(
        evidenceCorpus.map(e => [e.evidence_id, e.evidence_version])
      );
      const versionedEvidence: EvidenceRef[] = wb.supporting_evidence.map(id => ({
        evidence_id: id,
        evidence_version: evidenceVersionMap.get(id) || 1,
      }));
      
      // Store versioned evidence in writeback for session log
      wb.supporting_evidence_versioned = versionedEvidence;
      
      await supabase.from("epsr_epistemic_ledger").upsert({
        email,
        hypothesis_id: wb.hypothesis_id,
        hypothesis: wb.new_hypothesis,
        supporting_evidence: versionedEvidence, // Store as versioned array
        experiment_protocol: wb.experiment_protocol,
        confidence_level: wb.confidence_start,
        metrics_tracked: wb.metrics,
        status: "active",
      }, {
        onConflict: "email,hypothesis_id",
      });
    }

    return new Response(
      JSON.stringify(epsrOutput),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[EPSR] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

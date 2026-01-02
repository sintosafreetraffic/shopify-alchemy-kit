-- =============================================================================
-- EPSR (Evidence-Bound Personal Sleep Reasoner) Tables
-- =============================================================================

-- 1. Evidence Corpus - Curated, versioned sleep science evidence
CREATE TABLE public.epsr_evidence_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id TEXT NOT NULL UNIQUE, -- e.g., "E-001", "E-021"
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('meta_analysis', 'systematic_review', 'consensus', 'rct', 'observational', 'guideline')),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('HIGH', 'MODERATE', 'EMERGING')),
  claim_summary TEXT NOT NULL,
  population_notes TEXT,
  constraints TEXT, -- Known limits / when it may not apply
  topic_tags TEXT[], -- For filtering/matching
  citation TEXT, -- Full citation
  year_published INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Epistemic Ledger - Per-user hypothesis tracking
CREATE TABLE public.epsr_epistemic_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES public.sleep_profiles(email) ON DELETE CASCADE,
  hypothesis_id TEXT NOT NULL, -- Short ID like "H-001"
  hypothesis TEXT NOT NULL,
  supporting_evidence TEXT[], -- Array of evidence_ids
  counter_evidence TEXT[],
  experiment_protocol TEXT,
  experiment_started_at TIMESTAMPTZ,
  experiment_completed_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('pending', 'supported', 'rejected', 'inconclusive', NULL)),
  outcome_notes TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('LOW', 'MODERATE', 'HIGH')),
  confidence_change TEXT, -- e.g., "LOW → MODERATE"
  metrics_tracked TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'retired', 'superseded')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, hypothesis_id)
);

-- 3. EPSR Sessions - Track reasoning interactions
CREATE TABLE public.epsr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES public.sleep_profiles(email) ON DELETE CASCADE,
  user_id UUID,
  mode TEXT NOT NULL CHECK (mode IN ('cold_start', 'foundation', 'normal', 'clinical_guardrail')),
  user_signals JSONB NOT NULL, -- Snapshot of USER_SIGNALS at time of session
  pattern_candidates JSONB, -- Generated patterns
  experiment_proposed JSONB, -- The proposed experiment
  ledger_writeback JSONB, -- What was written to ledger
  clinical_flags TEXT[], -- Any clinical guardrails triggered
  raw_ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.epsr_evidence_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epsr_epistemic_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epsr_sessions ENABLE ROW LEVEL SECURITY;

-- Evidence corpus is readable by authenticated users (it's educational content)
CREATE POLICY "Evidence corpus is readable by authenticated users"
ON public.epsr_evidence_corpus FOR SELECT
TO authenticated
USING (is_active = true);

-- Admin can manage evidence corpus (using existing has_role function)
CREATE POLICY "Admins can manage evidence corpus"
ON public.epsr_evidence_corpus FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can only see their own ledger entries
CREATE POLICY "Users can view their own ledger"
ON public.epsr_epistemic_ledger FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert their own ledger entries"
ON public.epsr_epistemic_ledger FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());

CREATE POLICY "Users can update their own ledger entries"
ON public.epsr_epistemic_ledger FOR UPDATE
TO authenticated
USING (email = public.get_auth_email());

-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.epsr_sessions FOR SELECT
TO authenticated
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert their own sessions"
ON public.epsr_sessions FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());

-- Indexes for performance
CREATE INDEX idx_epsr_evidence_topic ON public.epsr_evidence_corpus USING GIN (topic_tags);
CREATE INDEX idx_epsr_evidence_confidence ON public.epsr_evidence_corpus (confidence_level);
CREATE INDEX idx_epsr_ledger_email ON public.epsr_epistemic_ledger (email);
CREATE INDEX idx_epsr_ledger_status ON public.epsr_epistemic_ledger (email, status);
CREATE INDEX idx_epsr_sessions_email ON public.epsr_sessions (email, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_epsr_evidence_updated_at
BEFORE UPDATE ON public.epsr_evidence_corpus
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_epsr_ledger_updated_at
BEFORE UPDATE ON public.epsr_epistemic_ledger
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Sleep Plan Completion Tracking Tables

-- Track individual action completions per day
CREATE TABLE public.sleep_plan_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL REFERENCES public.sleep_profiles(email) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.coach_plans(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL, -- monday, tuesday, etc.
  action_id TEXT NOT NULL, -- action-0, action-1, etc.
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, plan_id, day_name, action_id)
);

-- Track daily reflections
CREATE TABLE public.sleep_plan_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL REFERENCES public.sleep_profiles(email) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.coach_plans(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL,
  reflection_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, plan_id, day_name)
);

-- Cached adherence metrics per user
CREATE TABLE public.sleep_plan_adherence (
  email TEXT NOT NULL PRIMARY KEY REFERENCES public.sleep_profiles(email) ON DELETE CASCADE,
  current_plan_id UUID REFERENCES public.coach_plans(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL DEFAULT 1,
  adherence_rate NUMERIC(5,2) NOT NULL DEFAULT 0, -- percentage 0-100
  streak_days INTEGER NOT NULL DEFAULT 0,
  total_actions_completed INTEGER NOT NULL DEFAULT 0,
  total_actions_available INTEGER NOT NULL DEFAULT 0,
  last_completion_date DATE,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sleep_plan_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_plan_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_plan_adherence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for completions
CREATE POLICY "Users can view their own completions"
ON public.sleep_plan_completions FOR SELECT
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert their own completions"
ON public.sleep_plan_completions FOR INSERT
WITH CHECK (email = public.get_auth_email());

CREATE POLICY "Users can update their own completions"
ON public.sleep_plan_completions FOR UPDATE
USING (email = public.get_auth_email());

-- RLS Policies for reflections
CREATE POLICY "Users can view their own reflections"
ON public.sleep_plan_reflections FOR SELECT
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert their own reflections"
ON public.sleep_plan_reflections FOR INSERT
WITH CHECK (email = public.get_auth_email());

CREATE POLICY "Users can update their own reflections"
ON public.sleep_plan_reflections FOR UPDATE
USING (email = public.get_auth_email());

-- RLS Policies for adherence
CREATE POLICY "Users can view their own adherence"
ON public.sleep_plan_adherence FOR SELECT
USING (email = public.get_auth_email());

CREATE POLICY "Users can insert their own adherence"
ON public.sleep_plan_adherence FOR INSERT
WITH CHECK (email = public.get_auth_email());

CREATE POLICY "Users can update their own adherence"
ON public.sleep_plan_adherence FOR UPDATE
USING (email = public.get_auth_email());

-- Indexes for performance
CREATE INDEX idx_sleep_plan_completions_email ON public.sleep_plan_completions(email);
CREATE INDEX idx_sleep_plan_completions_plan ON public.sleep_plan_completions(plan_id);
CREATE INDEX idx_sleep_plan_reflections_email ON public.sleep_plan_reflections(email);

-- Trigger for updated_at
CREATE TRIGGER update_sleep_plan_completions_updated_at
BEFORE UPDATE ON public.sleep_plan_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
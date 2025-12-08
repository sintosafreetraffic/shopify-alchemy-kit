-- Add new columns to coach_plans for data snapshots and tracking
ALTER TABLE public.coach_plans 
ADD COLUMN IF NOT EXISTS profile_snapshot jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS logs_snapshot jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS trend_at_generation text DEFAULT 'stable',
ADD COLUMN IF NOT EXISTS generated_reason text DEFAULT 'manual';

-- Add index for email lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_coach_plans_email_generated ON public.coach_plans(email, generated_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.coach_plans.profile_snapshot IS 'Frozen copy of sleep_profiles fields at plan generation time';
COMMENT ON COLUMN public.coach_plans.logs_snapshot IS 'Aggregated metrics from sleep_logs at plan generation time';
COMMENT ON COLUMN public.coach_plans.trend_at_generation IS 'Sleep quality trend when plan was generated: improving, stable, worsening';
COMMENT ON COLUMN public.coach_plans.generated_reason IS 'Why plan was generated: manual, quiz_updated, logs_changed, product_changed, expired';
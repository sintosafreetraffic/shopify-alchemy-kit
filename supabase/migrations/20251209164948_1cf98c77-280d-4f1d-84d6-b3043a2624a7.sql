-- ============================================================
-- Performance indexes for frequently queried tables
-- These indexes optimize the hot paths identified in the diagnostic
-- ============================================================

-- sleep_logs: Queried by email + date range for dashboard
CREATE INDEX IF NOT EXISTS idx_sleep_logs_email_date 
ON public.sleep_logs(email, date DESC);

-- sleep_profiles: Primary lookup by email
CREATE INDEX IF NOT EXISTS idx_sleep_profiles_email 
ON public.sleep_profiles(email);

-- coach_plans: Queried by email with ordering
CREATE INDEX IF NOT EXISTS idx_coach_plans_email_generated 
ON public.coach_plans(email, generated_at DESC);

-- commissions: Queried by affiliate_id with status filtering
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_status 
ON public.commissions(affiliate_id, status, created_at DESC);

-- commissions: Query for fraud detection
CREATE INDEX IF NOT EXISTS idx_commissions_fraud_check 
ON public.commissions(affiliate_id, fraud_flag, created_at DESC);

-- sleep_attributes_state: Primary lookup by email
CREATE INDEX IF NOT EXISTS idx_sleep_attributes_state_email 
ON public.sleep_attributes_state(email);

-- engagement_meta: Lookup by email for engagement tracking
CREATE INDEX IF NOT EXISTS idx_engagement_meta_email 
ON public.engagement_meta(email);

-- affiliate_payouts: Lookup by affiliate with date ordering
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate 
ON public.affiliate_payouts(affiliate_id, processed_at DESC);

-- affiliate_goals: Lookup by affiliate with active period
CREATE INDEX IF NOT EXISTS idx_affiliate_goals_affiliate_period 
ON public.affiliate_goals(affiliate_id, period_start, period_end);
-- =====================================================
-- Security Fix: A/B Testing Tables RLS + Views
-- =====================================================

-- 1. Drop existing overly permissive policies on A/B testing tables
DROP POLICY IF EXISTS "Allow all access to ab_tests" ON public.ab_tests;
DROP POLICY IF EXISTS "Allow all access to ab_events" ON public.ab_events;
DROP POLICY IF EXISTS "Allow all access to ab_intent_events" ON public.ab_intent_events;
DROP POLICY IF EXISTS "Allow all access to ab_test_archive" ON public.ab_test_archive;
DROP POLICY IF EXISTS "Allow all access to ab_auto_stop_log" ON public.ab_auto_stop_log;
DROP POLICY IF EXISTS "Allow all access to ab_preflight_runs" ON public.ab_preflight_runs;

-- 2. Create admin-only policies for ab_tests
CREATE POLICY "Admin read ab_tests" ON public.ab_tests 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert ab_tests" ON public.ab_tests 
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update ab_tests" ON public.ab_tests 
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete ab_tests" ON public.ab_tests 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 3. ab_events needs public INSERT for tracking (edge functions), but admin-only read
CREATE POLICY "Public insert ab_events" ON public.ab_events 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read ab_events" ON public.ab_events 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update ab_events" ON public.ab_events 
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete ab_events" ON public.ab_events 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create admin-only policies for ab_intent_events
CREATE POLICY "Public insert ab_intent_events" ON public.ab_intent_events 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read ab_intent_events" ON public.ab_intent_events 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update ab_intent_events" ON public.ab_intent_events 
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete ab_intent_events" ON public.ab_intent_events 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create admin-only policies for ab_test_archive
CREATE POLICY "Admin read ab_test_archive" ON public.ab_test_archive 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert ab_test_archive" ON public.ab_test_archive 
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update ab_test_archive" ON public.ab_test_archive 
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete ab_test_archive" ON public.ab_test_archive 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 6. Create admin-only policies for ab_auto_stop_log
CREATE POLICY "Admin read ab_auto_stop_log" ON public.ab_auto_stop_log 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert ab_auto_stop_log" ON public.ab_auto_stop_log 
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update ab_auto_stop_log" ON public.ab_auto_stop_log 
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete ab_auto_stop_log" ON public.ab_auto_stop_log 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 7. Create admin-only policies for ab_preflight_runs
CREATE POLICY "Admin read ab_preflight_runs" ON public.ab_preflight_runs 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert ab_preflight_runs" ON public.ab_preflight_runs 
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update ab_preflight_runs" ON public.ab_preflight_runs 
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete ab_preflight_runs" ON public.ab_preflight_runs 
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 8. Fix Security Definer Views - recreate with security_invoker=true
DROP VIEW IF EXISTS public.ab_funnel_comparison;
DROP VIEW IF EXISTS public.ab_quality_metrics;

-- Recreate ab_funnel_comparison with security_invoker
CREATE VIEW public.ab_funnel_comparison WITH (security_invoker = true) AS
SELECT 
  ab_variant,
  COUNT(DISTINCT session_id) AS total_sessions,
  COUNT(*) FILTER (WHERE event_name = 'add_to_cart') AS atc_count,
  COUNT(*) FILTER (WHERE event_name = 'begin_checkout') AS checkout_count,
  COUNT(*) FILTER (WHERE event_name = 'purchase') AS purchase_count,
  SUM(COALESCE(revenue, 0)) FILTER (WHERE event_name = 'purchase') AS total_revenue
FROM public.ab_events
GROUP BY ab_variant
ORDER BY ab_variant;

-- Recreate ab_quality_metrics with security_invoker
CREATE VIEW public.ab_quality_metrics WITH (security_invoker = true) AS
SELECT 
  ab_variant,
  COUNT(*) FILTER (WHERE event_type = 'refund') AS refund_count,
  COUNT(*) FILTER (WHERE event_type = 'chargeback') AS chargeback_count,
  SUM(COALESCE(amount, 0)) FILTER (WHERE event_type = 'refund') AS refund_amount,
  SUM(COALESCE(amount, 0)) FILTER (WHERE event_type = 'chargeback') AS chargeback_amount
FROM public.quality_events
GROUP BY ab_variant
ORDER BY ab_variant;
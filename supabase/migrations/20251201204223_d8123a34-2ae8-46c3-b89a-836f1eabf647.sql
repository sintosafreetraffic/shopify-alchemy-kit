-- RLS Policies for affiliates table
-- Users can view their own affiliate record
CREATE POLICY "Users can view own affiliate record"
ON public.affiliates
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own affiliate record
CREATE POLICY "Users can insert own affiliate record"
ON public.affiliates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own affiliate record
CREATE POLICY "Users can update own affiliate record"
ON public.affiliates
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for commissions table
-- Users can view commissions for their affiliate
CREATE POLICY "Users can view own commissions"
ON public.commissions
FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- RLS Policies for referrals table
-- Users can view referrals for their affiliate
CREATE POLICY "Users can view own referrals"
ON public.referrals
FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Users can insert referrals (for tracking when someone uses their code)
CREATE POLICY "Users can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);
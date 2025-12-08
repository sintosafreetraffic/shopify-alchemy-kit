-- Create affiliate_goals table for goal tracking
CREATE TABLE public.affiliate_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.affiliate_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Affiliates can view their own goals
CREATE POLICY "Affiliates can view own goals"
ON public.affiliate_goals
FOR SELECT
USING (affiliate_id IN (
  SELECT id FROM public.affiliates WHERE user_id = auth.uid()
));

-- Affiliates can insert their own goals
CREATE POLICY "Affiliates can insert own goals"
ON public.affiliate_goals
FOR INSERT
WITH CHECK (affiliate_id IN (
  SELECT id FROM public.affiliates WHERE user_id = auth.uid()
));

-- Affiliates can update their own goals
CREATE POLICY "Affiliates can update own goals"
ON public.affiliate_goals
FOR UPDATE
USING (affiliate_id IN (
  SELECT id FROM public.affiliates WHERE user_id = auth.uid()
));

-- Affiliates can delete their own goals
CREATE POLICY "Affiliates can delete own goals"
ON public.affiliate_goals
FOR DELETE
USING (affiliate_id IN (
  SELECT id FROM public.affiliates WHERE user_id = auth.uid()
));

-- Admins can view all goals
CREATE POLICY "Admins can view all goals"
ON public.affiliate_goals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_affiliate_goals_updated_at
BEFORE UPDATE ON public.affiliate_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
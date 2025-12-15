-- Create table for quiz reveal analytics
CREATE TABLE public.quiz_reveal_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('pre_reveal_viewed', 'full_reveal_unlocked')),
  persona_cluster TEXT,
  insight_count INTEGER,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT
);

-- Enable RLS
ALTER TABLE public.quiz_reveal_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anonymous tracking)
CREATE POLICY "Allow public inserts for analytics"
ON public.quiz_reveal_analytics
FOR INSERT
WITH CHECK (true);

-- Only admins can read analytics data
CREATE POLICY "Admins can read analytics"
ON public.quiz_reveal_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for efficient querying
CREATE INDEX idx_quiz_reveal_analytics_created_at ON public.quiz_reveal_analytics(created_at DESC);
CREATE INDEX idx_quiz_reveal_analytics_event_type ON public.quiz_reveal_analytics(event_type);
CREATE INDEX idx_quiz_reveal_analytics_session_id ON public.quiz_reveal_analytics(session_id);
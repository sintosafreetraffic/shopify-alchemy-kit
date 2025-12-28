-- Remove the restrictive CHECK constraint to allow email popup events
ALTER TABLE public.quiz_reveal_analytics 
DROP CONSTRAINT IF EXISTS quiz_reveal_analytics_event_type_check;

-- Add new CHECK constraint that includes popup events
ALTER TABLE public.quiz_reveal_analytics 
ADD CONSTRAINT quiz_reveal_analytics_event_type_check 
CHECK (event_type IN ('pre_reveal_viewed', 'full_reveal_unlocked', 'email_popup_viewed', 'email_popup_submitted'));
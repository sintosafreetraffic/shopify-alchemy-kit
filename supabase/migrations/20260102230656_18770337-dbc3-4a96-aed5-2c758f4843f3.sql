-- Add user_question column to epsr_sessions to store the question asked
ALTER TABLE public.epsr_sessions 
ADD COLUMN IF NOT EXISTS user_question TEXT;

-- Create index for faster history lookups by user
CREATE INDEX IF NOT EXISTS idx_epsr_sessions_email_created 
ON public.epsr_sessions(email, created_at DESC);
-- Create sleep_attributes_state table for storing user sleep attributes
CREATE TABLE public.sleep_attributes_state (
  email TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sleep_attributes_state ENABLE ROW LEVEL SECURITY;

-- Users can read their own attributes
CREATE POLICY "Users can read own sleep attributes"
ON public.sleep_attributes_state
FOR SELECT
USING (email = get_auth_email());

-- Users can insert their own attributes
CREATE POLICY "Users can insert own sleep attributes"
ON public.sleep_attributes_state
FOR INSERT
WITH CHECK (email = get_auth_email());

-- Users can update their own attributes
CREATE POLICY "Users can update own sleep attributes"
ON public.sleep_attributes_state
FOR UPDATE
USING (email = get_auth_email());

-- Optional: Create history table for tracking attribute changes over time
CREATE TABLE public.sleep_attributes_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on history table
ALTER TABLE public.sleep_attributes_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own history
CREATE POLICY "Users can read own sleep attributes history"
ON public.sleep_attributes_history
FOR SELECT
USING (email = get_auth_email());

-- Create index for faster lookups
CREATE INDEX idx_sleep_attributes_history_email ON public.sleep_attributes_history(email);
CREATE INDEX idx_sleep_attributes_history_created_at ON public.sleep_attributes_history(created_at DESC);
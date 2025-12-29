-- Create table to store Pinterest OAuth tokens
CREATE TABLE public.pinterest_oauth_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'bearer',
    expires_at TIMESTAMPTZ,
    scopes TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pinterest_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write tokens
CREATE POLICY "Admins can manage pinterest tokens"
ON public.pinterest_oauth_tokens
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_pinterest_oauth_tokens_updated_at
BEFORE UPDATE ON public.pinterest_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
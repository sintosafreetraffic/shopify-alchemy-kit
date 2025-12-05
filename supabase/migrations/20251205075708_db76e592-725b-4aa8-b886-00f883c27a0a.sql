-- Add WhatsApp opt-in column to sleep_profiles
ALTER TABLE public.sleep_profiles 
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_phone text;
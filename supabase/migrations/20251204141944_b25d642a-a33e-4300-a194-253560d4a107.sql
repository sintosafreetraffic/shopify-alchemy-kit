-- Create update timestamp trigger function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create enums
CREATE TYPE log_source AS ENUM ('manual', 'whatsapp');
CREATE TYPE sleep_position AS ENUM ('side', 'back', 'stomach', 'mixed');
CREATE TYPE stress_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE temperature_preference AS ENUM ('cold', 'neutral', 'warm');
CREATE TYPE wake_up_condition AS ENUM ('energized', 'neutral', 'tired', 'stiff');

-- Sleep Profiles table
CREATE TABLE public.sleep_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  sleep_position sleep_position NOT NULL DEFAULT 'side',
  pain_points TEXT[] DEFAULT '{}',
  temperature_preference temperature_preference DEFAULT 'neutral',
  stress_level stress_level DEFAULT 'medium',
  wake_up_condition wake_up_condition DEFAULT 'neutral',
  delivery_date DATE,
  purchase_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sleep Logs table
CREATE TABLE public.sleep_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL REFERENCES public.sleep_profiles(email) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_quality INTEGER NOT NULL CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  pain_level_morning INTEGER NOT NULL CHECK (pain_level_morning >= 0 AND pain_level_morning <= 10),
  time_to_sleep_minutes INTEGER,
  wake_ups_per_night INTEGER,
  felt_hot BOOLEAN DEFAULT false,
  felt_stressed BOOLEAN DEFAULT false,
  notes TEXT,
  source log_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coach Plans table
CREATE TABLE public.coach_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL REFERENCES public.sleep_profiles(email) ON DELETE CASCADE,
  plan_type TEXT DEFAULT 'initial',
  sleep_plan JSONB DEFAULT '{}',
  encouragement_message TEXT,
  main_focus_this_week TEXT[] DEFAULT '{}',
  recommended_pdfs TEXT[] DEFAULT '{}',
  recommended_actions_today JSONB DEFAULT '[]',
  whatsapp_messages TEXT[] DEFAULT '{}',
  klaviyo_events JSONB DEFAULT '[]',
  spine_health_score INTEGER,
  raw_ai_response TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Engagement Meta table
CREATE TABLE public.engagement_meta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  last_whatsapp_nudge_at TIMESTAMPTZ,
  last_evaluation_at TIMESTAMPTZ,
  last_reminder_type TEXT,
  total_streak_days INTEGER DEFAULT 0,
  inactivity_detected BOOLEAN DEFAULT false,
  decline_detected BOOLEAN DEFAULT false,
  improvement_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp User Links table
CREATE TABLE public.whatsapp_user_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL REFERENCES public.sleep_profiles(email) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email, phone_number)
);

-- WhatsApp Message Logs table
CREATE TABLE public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sleep_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sleep_profiles
CREATE POLICY "Allow public read access to profiles" ON public.sleep_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to profiles" ON public.sleep_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to profiles" ON public.sleep_profiles FOR UPDATE USING (true);

-- RLS Policies for sleep_logs
CREATE POLICY "Allow public read access to logs" ON public.sleep_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to logs" ON public.sleep_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to logs" ON public.sleep_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to logs" ON public.sleep_logs FOR DELETE USING (true);

-- RLS Policies for coach_plans
CREATE POLICY "Allow public read access to plans" ON public.coach_plans FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to plans" ON public.coach_plans FOR INSERT WITH CHECK (true);

-- RLS Policies for engagement_meta
CREATE POLICY "Allow public read access to engagement_meta" ON public.engagement_meta FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to engagement_meta" ON public.engagement_meta FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to engagement_meta" ON public.engagement_meta FOR UPDATE USING (true);

-- RLS Policies for whatsapp_user_links
CREATE POLICY "Allow public read access to whatsapp_user_links" ON public.whatsapp_user_links FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to whatsapp_user_links" ON public.whatsapp_user_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to whatsapp_user_links" ON public.whatsapp_user_links FOR UPDATE USING (true);

-- RLS Policies for whatsapp_message_logs
CREATE POLICY "Allow public read access to whatsapp_message_logs" ON public.whatsapp_message_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to whatsapp_message_logs" ON public.whatsapp_message_logs FOR INSERT WITH CHECK (true);

-- Apply triggers for updated_at
CREATE TRIGGER update_sleep_profiles_updated_at BEFORE UPDATE ON public.sleep_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagement_meta_updated_at BEFORE UPDATE ON public.engagement_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
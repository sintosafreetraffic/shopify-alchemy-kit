import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuizData {
  sleepPosition?: string;
  movesOften?: string;
  pillowCount?: string;
  mattressFirmness?: string;
  sleepEquipment?: string[];
  painAreas?: string[];
  painPoints?: string[];
  painSeverity?: number;
  nightAwakenings?: string;
  sleepTemperature?: string;
  roomBrightness?: string;
  roomNoise?: string;
  sleepLatency?: string;
  sleepHours?: string;
  eveningScreenUse?: string;
  ageGroup?: string;
  gender?: string;
  sleepClothing?: string;
  coSleeping?: string[];
  sleepGoals?: string[];
  snoring?: string;
  triedMethods?: string[];
  pillowSatisfaction?: number;
  pillowIssues?: string[];
}

export interface SleepAssessment {
  assessment?: string;
  expertSummary?: string;
  detectedIssues?: string[];
  alignmentInsights?: string[];
  scores?: {
    alignmentScore: number;
    environmentScore: number;
    consistencyScore: number;
  };
  recommendations?: Array<{
    product: string;
    reason: string;
    priority: string;
  }>;
  bundleRecommended?: boolean;
  bundleReason?: string;
}

export interface SleepProfile {
  id: string;
  email: string;
  sleep_position: 'side' | 'back' | 'stomach' | 'mixed';
  pain_points: string[];
  temperature_preference: 'cold' | 'neutral' | 'warm';
  stress_level: 'low' | 'medium' | 'high';
  wake_up_condition: 'energized' | 'neutral' | 'tired' | 'stiff';
  delivery_date: string | null;
  purchase_count: number;
  products_owned: string[];
  whatsapp_enabled: boolean;
  whatsapp_phone: string | null;
  quiz_data?: QuizData;
  sleep_assessment?: SleepAssessment;
  created_at: string;
  updated_at: string;
  // Layer 2: Semi-static environment fields
  mattress_thickness?: string;
  mattress_firmness?: string;
  bed_height?: string;
  co_sleeping?: string;
  bedding_material?: string;
  pillow_type?: string;
  environment_updated_at?: string;
}

export interface SleepLog {
  id: string;
  email: string;
  date: string;
  sleep_quality: number;
  pain_level_morning: number;
  time_to_sleep_minutes: number | null;
  wake_ups_per_night: number | null;
  felt_hot: boolean;
  felt_stressed: boolean;
  notes: string | null;
  source: 'manual' | 'whatsapp';
  created_at: string;
}

export interface CoachPlan {
  id: string;
  email: string;
  plan_type: string;
  sleep_plan: any;
  encouragement_message: string;
  main_focus_this_week: string[];
  recommended_pdfs: string[];
  recommended_actions_today: any[];
  whatsapp_messages: string[];
  klaviyo_events: any[];
  spine_health_score: number;
  generated_at: string;
  valid_until: string;
}

export interface TrendData {
  avgSleepQuality: number;
  avgPain: number;
  trend: 'improving' | 'stable' | 'worsening';
  hotNights: number;
  stressedNights: number;
  goodNights: number;
  poorNights: number;
}

export function useSleepApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (email: string): Promise<SleepProfile | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('sleep_profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (err) throw err;
      return data as SleepProfile | null;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateProfile = async (profile: Partial<SleepProfile> & { email: string }): Promise<SleepProfile | null> => {
    setLoading(true);
    setError(null);
    try {
      // Convert to database-compatible format (exclude custom fields that aren't in DB schema)
      const dbProfile: Record<string, any> = { ...profile };
      
      const { data, error: err } = await supabase
        .from('sleep_profiles')
        .upsert(dbProfile as any, { onConflict: 'email' })
        .select()
        .single();
      
      if (err) throw err;
      return data as unknown as SleepProfile;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (email: string, days = 30): Promise<{ logs: SleepLog[]; trends: TrendData } | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('email', email)
        .order('date', { ascending: false })
        .limit(days);
      
      if (err) throw err;
      
      const logs = (data || []) as SleepLog[];
      const trends = calculateTrends(logs);
      return { logs, trends };
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkDateExists = async (email: string, date: string, excludeId?: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('sleep_logs')
        .select('id')
        .eq('email', email)
        .eq('date', date);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data } = await query;
      return (data?.length || 0) > 0;
    } catch {
      return false;
    }
  };

  const addLog = async (log: Partial<SleepLog>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Check for duplicate date
      if (log.email && log.date) {
        const exists = await checkDateExists(log.email, log.date);
        if (exists) {
          setError('A sleep log already exists for this date. Please edit the existing entry instead.');
          return false;
        }
      }
      
      const { error: err } = await supabase.from('sleep_logs').insert(log as any);
      if (err) throw err;

      // Trigger Sleep Sync after successful log submission
      if (log.email) {
        try {
          await supabase.functions.invoke('sleep-attributes-sync', {
            body: { source: 'sleep_log_submission' },
          });
        } catch (syncErr) {
          console.error('Sleep Sync error:', syncErr);
          // Non-blocking
        }
      }

      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateLog = async (id: string, log: Partial<SleepLog>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Check for duplicate date (excluding current log)
      if (log.email && log.date) {
        const exists = await checkDateExists(log.email, log.date, id);
        if (exists) {
          setError('A sleep log already exists for this date.');
          return false;
        }
      }
      
      const { error: err } = await supabase
        .from('sleep_logs')
        .update(log)
        .eq('id', id);
      if (err) throw err;
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('sleep_logs')
        .delete()
        .eq('id', id);
      if (err) throw err;
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateCoachPlan = async (email: string, planType = 'initial', reason = 'manual'): Promise<CoachPlan | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('coach-generate-sleep-plan', {
        body: { email, planType, reason },
      });
      
      if (err) throw err;
      return data.plan;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkPlanRefresh = async (): Promise<{ shouldRegenerate: boolean; reason: string } | null> => {
    try {
      const { data, error: err } = await supabase.functions.invoke('check-plan-refresh', {
        body: {},
      });
      
      if (err) throw err;
      return data;
    } catch (e: any) {
      console.error('checkPlanRefresh error:', e);
      return null;
    }
  };

  const fetchCoachPlan = async (email: string): Promise<CoachPlan | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('coach_plans')
        .select('*')
        .eq('email', email)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (err) throw err;
      return data as CoachPlan | null;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppMessage = async (email: string): Promise<{ message: string; messageType: string } | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('whatsapp-coach-simulate', {
        body: { email },
      });
      
      if (err) throw err;
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const evaluateEngagement = async (email: string): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('engagement-evaluate', {
        body: { email },
      });
      
      if (err) throw err;
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchProfile,
    createOrUpdateProfile,
    fetchLogs,
    addLog,
    updateLog,
    deleteLog,
    checkDateExists,
    generateCoachPlan,
    fetchCoachPlan,
    checkPlanRefresh,
    getWhatsAppMessage,
    evaluateEngagement,
  };
}

function calculateTrends(logs: SleepLog[]): TrendData {
  if (logs.length === 0) {
    return { avgSleepQuality: 0, avgPain: 0, trend: 'stable', hotNights: 0, stressedNights: 0, goodNights: 0, poorNights: 0 };
  }

  const avgSleepQuality = logs.reduce((sum, l) => sum + l.sleep_quality, 0) / logs.length;
  const avgPain = logs.reduce((sum, l) => sum + l.pain_level_morning, 0) / logs.length;
  const hotNights = logs.filter(l => l.felt_hot).length;
  const stressedNights = logs.filter(l => l.felt_stressed).length;
  const goodNights = logs.filter(l => l.sleep_quality >= 7).length;
  const poorNights = logs.filter(l => l.sleep_quality <= 4).length;

  const recent = logs.slice(0, 7);
  const older = logs.slice(7, 14);
  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  
  if (older.length >= 3) {
    const recentAvg = recent.reduce((s, l) => s + l.sleep_quality, 0) / recent.length;
    const olderAvg = older.reduce((s, l) => s + l.sleep_quality, 0) / older.length;
    if (recentAvg - olderAvg > 1) trend = 'improving';
    else if (olderAvg - recentAvg > 1) trend = 'worsening';
  }

  return { avgSleepQuality, avgPain, trend, hotNights, stressedNights, goodNights, poorNights };
}

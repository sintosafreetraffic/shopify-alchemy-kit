// Shared types for Rise By Night Sleep Coach System
// Schema version 2 - Three-layer personalization engine

export const SCHEMA_VERSION = 2;

export type Level3 = "low" | "medium" | "high";
export type Trend3 = "improving" | "stable" | "worsening" | "unknown";
export type PurchaseStatus = "not_bought" | "bought_once" | "repeat_buyer";
export type AppUsageType = "none" | "quiz_only" | "sleep_log_user" | "dashboard_user" | "full_user";
export type ChannelPreference = "email" | "whatsapp" | "both" | "unknown";

// Semi-static environment types
export type MattressThickness = "thin" | "medium" | "thick";
export type MattressFirmness = "soft" | "medium" | "firm";
export type BedHeight = "low" | "standard" | "high";
export type CoSleeping = "alone" | "partner" | "pet" | "both";
export type BeddingMaterial = "cotton" | "bamboo" | "silk" | "synthetic";
export type PillowType = "standard" | "memory_foam" | "contour" | "down";

/**
 * SleepSyncSource - The trigger source for sync events
 */
export type SleepSyncSource = 
  | "sleep_log" 
  | "sleep_log_submission"
  | "quiz_completion" 
  | "shopify_order" 
  | "setup_update" 
  | "dashboard_visit"
  | "sleep_plan_generated"
  | "manual"
  | "daily_cron"
  | "email_signup"
  | "internal"
  | "quiz"
  | "shopify"
  | "sleep_plan";

/**
 * EnvironmentProfile - Semi-static sleep setup fields
 * User-editable, updated infrequently
 */
export interface EnvironmentProfile {
  mattress_thickness: MattressThickness;
  mattress_firmness: MattressFirmness;
  bed_height: BedHeight;
  co_sleeping: CoSleeping;
  bedding_material: BeddingMaterial;
  pillow_type: PillowType;
  room_brightness: string; // from quiz
  room_noise?: string;
  environment_updated_at?: string;
}

/**
 * StaticIdentity - Core profile that rarely changes
 * Set during quiz, updated only via profile edit
 */
export interface StaticIdentity {
  email: string;
  sleep_position: string;
  pain_points: string[];
  temperature_preference: string;
  stress_level: string;
  wake_up_condition: string;
  products_owned: string[];
  quiz_completed: boolean;
  quiz_completed_at?: string;
}

/**
 * SleepAttributes - The canonical shape for all sleep sync data
 * All fields are required and have sensible defaults
 * schema_version tracks the data structure version for future migrations
 * 
 * THREE LAYERS:
 * 1. Static Identity - who the sleeper is
 * 2. Semi-Static Environment - their sleep setup
 * 3. Dynamic State - how their sleep behaves over time
 */
export interface SleepAttributes {
  // Schema versioning
  schema_version: number;
  email: string;
  generated_at: string;
  source: SleepSyncSource;
  
  // === LAYER 1: STATIC IDENTITY ===
  sleep_position: string;
  pain_points: string[];
  temperature_preference: string;
  stress_level: string;
  wake_up_condition: string;
  products_owned: string[];
  quiz_completed: boolean;
  
  // === LAYER 2: SEMI-STATIC ENVIRONMENT ===
  mattress_thickness: MattressThickness;
  mattress_firmness: MattressFirmness;
  bed_height: BedHeight;
  co_sleeping: CoSleeping;
  bedding_material: BeddingMaterial;
  pillow_type: PillowType;
  room_brightness: string;
  room_noise: string;
  environment_updated_at: string | null;

  // === LAYER 3: DYNAMIC SLEEP STATE ===
  // Sleep condition & trends
  sleep_stress_level: Level3;
  sleep_trend: Trend3;
  pain_trend: Trend3;
  avg_sleep_quality_7d: number | null;
  avg_sleep_quality_14d: number | null;
  avg_pain_7d: number | null;
  avg_pain_14d: number | null;
  hot_nights_7d: number;
  hot_nights_14d: number;
  stressed_nights_7d: number;
  stressed_nights_14d: number;
  streak_days: number;
  last_log_days_ago: number | null;
  log_consistency_score: number;
  temperature_sensitive: boolean;

  // Engagement / behavior
  engagement_level: Level3;
  last_dashboard_visit_days_ago: number | null;
  last_whatsapp_interaction_days_ago: number | null;
  ai_coach_engagement_level: Level3;
  pdf_opens_last_30d: number;
  email_opens_last_30d: number;
  whatsapp_enabled: boolean;

  // Purchase behavior / lifecycle
  purchase_status: PurchaseStatus;
  orders_count: number;
  days_since_first_order: number | null;
  days_since_last_order: number | null;
  is_new_customer: boolean;
  has_returned_pillow: boolean;
  refund_risk_flag: boolean;
  complaint_flag: boolean;

  // App usage / feature adoption
  app_usage_type: AppUsageType;
  used_sleep_quiz: boolean;
  used_sleep_plan: boolean;
  used_pillow_wizard: boolean;
  deep_sleep_supported: boolean;
  wearable_connected: boolean;

  // Opportunity / risk scoring
  risk_level: Level3;
  upsell_score: number;
  churn_risk_score: number;
  affiliate_potential_score: number;

  // Channel preferences
  prefers_channel: ChannelPreference;
  
  // Plan tracking
  last_plan_generated_at: string | null;
  days_since_last_plan: number | null;
  total_plans_generated: number;
}

export interface SleepLog {
  id: string;
  email: string;
  date: string;
  sleep_quality: number;
  pain_level_morning: number;
  felt_hot: boolean;
  felt_stressed: boolean;
  time_to_sleep_minutes: number | null;
  wake_ups_per_night: number | null;
  notes: string | null;
  created_at: string;
  source: "manual" | "whatsapp";
}

export interface SleepProfile {
  email: string;
  sleep_position: string;
  pain_points: string[];
  stress_level: string;
  temperature_preference: string;
  wake_up_condition: string;
  products_owned: string[];
  whatsapp_enabled: boolean;
  whatsapp_phone: string | null;
  purchase_count: number;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
  quiz_completed?: boolean;
  quiz_completed_at?: string;
  quiz_data?: any;
  sleep_assessment?: any;
  // Environment fields
  mattress_thickness?: string;
  mattress_firmness?: string;
  bed_height?: string;
  co_sleeping?: string;
  bedding_material?: string;
  pillow_type?: string;
  environment_updated_at?: string;
}

export interface EngagementMeta {
  email: string;
  last_seen_at: string | null;
  last_whatsapp_nudge_at: string | null;
  total_streak_days: number;
  inactivity_detected: boolean;
  decline_detected: boolean;
  improvement_detected: boolean;
  last_evaluation_at: string | null;
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

/**
 * Sleep Sync Event payload for Klaviyo
 */
export interface SleepSyncEvent {
  eventName: string;
  payload: Record<string, any>;
}

/**
 * WhatsApp Event Types for Klaviyo
 */
export type WhatsAppEventType = 
  | "RBN_WhatsApp_MorningCheckIn"
  | "RBN_WhatsApp_MicroTip"
  | "RBN_WhatsApp_Celebration"
  | "RBN_WhatsApp_StreakReminder"
  | "RBN_WhatsApp_InactivityNudge"
  | "RBN_WhatsApp_WeeklySummary";

/**
 * AI Brain Input for all AI calls
 */
export interface SleepCoachPromptInput {
  mode: "sleep_plan" | "weekly_summary" | "whatsapp_tip" | "pdf_context";
  userProfile: SleepProfile | null;
  attributes: SleepAttributes | null;
  logs: SleepLog[];
  context?: Record<string, any>;
}

/**
 * AI Brain Output
 */
export interface SleepCoachOutput {
  text: string;
  structured?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Get default SleepAttributes with schema version
 */
export function getDefaultSleepAttributes(email: string, source: SleepSyncSource = "manual"): SleepAttributes {
  return {
    schema_version: SCHEMA_VERSION,
    email,
    generated_at: new Date().toISOString(),
    source,
    
    // Layer 1: Static Identity
    sleep_position: "side",
    pain_points: [],
    temperature_preference: "neutral",
    stress_level: "medium",
    wake_up_condition: "neutral",
    products_owned: [],
    quiz_completed: false,
    
    // Layer 2: Semi-Static Environment
    mattress_thickness: "medium",
    mattress_firmness: "medium",
    bed_height: "standard",
    co_sleeping: "alone",
    bedding_material: "cotton",
    pillow_type: "standard",
    room_brightness: "dark",
    room_noise: "quiet",
    environment_updated_at: null,

    // Layer 3: Dynamic State
    sleep_stress_level: "low",
    sleep_trend: "unknown",
    pain_trend: "unknown",
    avg_sleep_quality_7d: null,
    avg_sleep_quality_14d: null,
    avg_pain_7d: null,
    avg_pain_14d: null,
    hot_nights_7d: 0,
    hot_nights_14d: 0,
    stressed_nights_7d: 0,
    stressed_nights_14d: 0,
    streak_days: 0,
    last_log_days_ago: null,
    log_consistency_score: 0,
    temperature_sensitive: false,

    // Engagement / behavior
    engagement_level: "low",
    last_dashboard_visit_days_ago: null,
    last_whatsapp_interaction_days_ago: null,
    ai_coach_engagement_level: "low",
    pdf_opens_last_30d: 0,
    email_opens_last_30d: 0,
    whatsapp_enabled: false,

    // Purchase behavior / lifecycle
    purchase_status: "not_bought",
    orders_count: 0,
    days_since_first_order: null,
    days_since_last_order: null,
    is_new_customer: false,
    has_returned_pillow: false,
    refund_risk_flag: false,
    complaint_flag: false,

    // App usage / feature adoption
    app_usage_type: "none",
    used_sleep_quiz: false,
    used_sleep_plan: false,
    used_pillow_wizard: false,
    deep_sleep_supported: false,
    wearable_connected: false,

    // Opportunity / risk scoring
    risk_level: "low",
    upsell_score: 0,
    churn_risk_score: 0,
    affiliate_potential_score: 0,

    // Channel preferences
    prefers_channel: "unknown",
    
    // Plan tracking
    last_plan_generated_at: null,
    days_since_last_plan: null,
    total_plans_generated: 0,
  };
}

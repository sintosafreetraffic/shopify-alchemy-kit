export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      affiliates: {
        Row: {
          created_at: string | null
          id: string
          level: number | null
          parent_affiliate_id: string | null
          referral_code: string
          status: string | null
          total_commissions: number | null
          total_referrals: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number | null
          parent_affiliate_id?: string | null
          referral_code: string
          status?: string | null
          total_commissions?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number | null
          parent_affiliate_id?: string | null
          referral_code?: string
          status?: string | null
          total_commissions?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_plans: {
        Row: {
          created_at: string
          email: string
          encouragement_message: string | null
          generated_at: string
          generated_reason: string | null
          id: string
          klaviyo_events: Json | null
          logs_snapshot: Json | null
          main_focus_this_week: string[] | null
          plan_type: string | null
          profile_snapshot: Json | null
          raw_ai_response: string | null
          recommended_actions_today: Json | null
          recommended_pdfs: string[] | null
          sleep_plan: Json | null
          spine_health_score: number | null
          trend_at_generation: string | null
          valid_until: string | null
          whatsapp_messages: string[] | null
        }
        Insert: {
          created_at?: string
          email: string
          encouragement_message?: string | null
          generated_at?: string
          generated_reason?: string | null
          id?: string
          klaviyo_events?: Json | null
          logs_snapshot?: Json | null
          main_focus_this_week?: string[] | null
          plan_type?: string | null
          profile_snapshot?: Json | null
          raw_ai_response?: string | null
          recommended_actions_today?: Json | null
          recommended_pdfs?: string[] | null
          sleep_plan?: Json | null
          spine_health_score?: number | null
          trend_at_generation?: string | null
          valid_until?: string | null
          whatsapp_messages?: string[] | null
        }
        Update: {
          created_at?: string
          email?: string
          encouragement_message?: string | null
          generated_at?: string
          generated_reason?: string | null
          id?: string
          klaviyo_events?: Json | null
          logs_snapshot?: Json | null
          main_focus_this_week?: string[] | null
          plan_type?: string | null
          profile_snapshot?: Json | null
          raw_ai_response?: string | null
          recommended_actions_today?: Json | null
          recommended_pdfs?: string[] | null
          sleep_plan?: Json | null
          spine_health_score?: number | null
          trend_at_generation?: string | null
          valid_until?: string | null
          whatsapp_messages?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_plans_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "sleep_profiles"
            referencedColumns: ["email"]
          },
        ]
      }
      commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          id: string
          level: number
          order_id: string
          referral_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string | null
          id?: string
          level: number
          order_id: string
          referral_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          level?: number
          order_id?: string
          referral_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_meta: {
        Row: {
          created_at: string
          decline_detected: boolean | null
          email: string
          id: string
          improvement_detected: boolean | null
          inactivity_detected: boolean | null
          last_evaluation_at: string | null
          last_reminder_type: string | null
          last_seen_at: string | null
          last_whatsapp_nudge_at: string | null
          total_streak_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decline_detected?: boolean | null
          email: string
          id?: string
          improvement_detected?: boolean | null
          inactivity_detected?: boolean | null
          last_evaluation_at?: string | null
          last_reminder_type?: string | null
          last_seen_at?: string | null
          last_whatsapp_nudge_at?: string | null
          total_streak_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decline_detected?: boolean | null
          email?: string
          id?: string
          improvement_detected?: boolean | null
          inactivity_detected?: boolean | null
          last_evaluation_at?: string | null
          last_reminder_type?: string | null
          last_seen_at?: string | null
          last_whatsapp_nudge_at?: string | null
          total_streak_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          affiliate_id: string
          created_at: string | null
          id: string
          referral_code: string
          referred_user_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          id?: string
          referral_code: string
          referred_user_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_attributes_history: {
        Row: {
          created_at: string
          data: Json
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          data: Json
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          email?: string
          id?: string
        }
        Relationships: []
      }
      sleep_attributes_state: {
        Row: {
          created_at: string
          data: Json
          email: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          email: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          email?: string
          updated_at?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          created_at: string
          date: string
          email: string
          felt_hot: boolean | null
          felt_stressed: boolean | null
          id: string
          notes: string | null
          pain_level_morning: number
          sleep_quality: number
          source: Database["public"]["Enums"]["log_source"]
          time_to_sleep_minutes: number | null
          wake_ups_per_night: number | null
        }
        Insert: {
          created_at?: string
          date: string
          email: string
          felt_hot?: boolean | null
          felt_stressed?: boolean | null
          id?: string
          notes?: string | null
          pain_level_morning: number
          sleep_quality: number
          source?: Database["public"]["Enums"]["log_source"]
          time_to_sleep_minutes?: number | null
          wake_ups_per_night?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          email?: string
          felt_hot?: boolean | null
          felt_stressed?: boolean | null
          id?: string
          notes?: string | null
          pain_level_morning?: number
          sleep_quality?: number
          source?: Database["public"]["Enums"]["log_source"]
          time_to_sleep_minutes?: number | null
          wake_ups_per_night?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sleep_logs_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "sleep_profiles"
            referencedColumns: ["email"]
          },
        ]
      }
      sleep_profiles: {
        Row: {
          bed_height: string | null
          bedding_material: string | null
          co_sleeping: string | null
          created_at: string
          delivery_date: string | null
          email: string
          environment_updated_at: string | null
          id: string
          mattress_firmness: string | null
          mattress_thickness: string | null
          pain_points: string[] | null
          pillow_type: string | null
          products_owned: string[] | null
          purchase_count: number | null
          quiz_completed: boolean | null
          quiz_completed_at: string | null
          quiz_data: Json | null
          sleep_assessment: Json | null
          sleep_position: Database["public"]["Enums"]["sleep_position"]
          stress_level: Database["public"]["Enums"]["stress_level"] | null
          temperature_preference:
            | Database["public"]["Enums"]["temperature_preference"]
            | null
          updated_at: string
          wake_up_condition:
            | Database["public"]["Enums"]["wake_up_condition"]
            | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          bed_height?: string | null
          bedding_material?: string | null
          co_sleeping?: string | null
          created_at?: string
          delivery_date?: string | null
          email: string
          environment_updated_at?: string | null
          id?: string
          mattress_firmness?: string | null
          mattress_thickness?: string | null
          pain_points?: string[] | null
          pillow_type?: string | null
          products_owned?: string[] | null
          purchase_count?: number | null
          quiz_completed?: boolean | null
          quiz_completed_at?: string | null
          quiz_data?: Json | null
          sleep_assessment?: Json | null
          sleep_position?: Database["public"]["Enums"]["sleep_position"]
          stress_level?: Database["public"]["Enums"]["stress_level"] | null
          temperature_preference?:
            | Database["public"]["Enums"]["temperature_preference"]
            | null
          updated_at?: string
          wake_up_condition?:
            | Database["public"]["Enums"]["wake_up_condition"]
            | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          bed_height?: string | null
          bedding_material?: string | null
          co_sleeping?: string | null
          created_at?: string
          delivery_date?: string | null
          email?: string
          environment_updated_at?: string | null
          id?: string
          mattress_firmness?: string | null
          mattress_thickness?: string | null
          pain_points?: string[] | null
          pillow_type?: string | null
          products_owned?: string[] | null
          purchase_count?: number | null
          quiz_completed?: boolean | null
          quiz_completed_at?: string | null
          quiz_data?: Json | null
          sleep_assessment?: Json | null
          sleep_position?: Database["public"]["Enums"]["sleep_position"]
          stress_level?: Database["public"]["Enums"]["stress_level"] | null
          temperature_preference?:
            | Database["public"]["Enums"]["temperature_preference"]
            | null
          updated_at?: string
          wake_up_condition?:
            | Database["public"]["Enums"]["wake_up_condition"]
            | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          created_at: string
          direction: string
          email: string
          id: string
          message: string
          message_type: string | null
          phone_number: string
        }
        Insert: {
          created_at?: string
          direction: string
          email: string
          id?: string
          message: string
          message_type?: string | null
          phone_number: string
        }
        Update: {
          created_at?: string
          direction?: string
          email?: string
          id?: string
          message?: string
          message_type?: string | null
          phone_number?: string
        }
        Relationships: []
      }
      whatsapp_user_links: {
        Row: {
          created_at: string
          email: string
          id: string
          last_interaction_at: string | null
          phone_number: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_interaction_at?: string | null
          phone_number: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_interaction_at?: string | null
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_user_links_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "sleep_profiles"
            referencedColumns: ["email"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_email: { Args: never; Returns: string }
    }
    Enums: {
      log_source: "manual" | "whatsapp"
      sleep_position: "side" | "back" | "stomach" | "mixed"
      stress_level: "low" | "medium" | "high"
      temperature_preference: "cold" | "neutral" | "warm"
      wake_up_condition: "energized" | "neutral" | "tired" | "stiff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      log_source: ["manual", "whatsapp"],
      sleep_position: ["side", "back", "stomach", "mixed"],
      stress_level: ["low", "medium", "high"],
      temperature_preference: ["cold", "neutral", "warm"],
      wake_up_condition: ["energized", "neutral", "tired", "stiff"],
    },
  },
} as const

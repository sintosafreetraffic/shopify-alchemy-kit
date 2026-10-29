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
      ab_auto_stop_log: {
        Row: {
          action_taken: string
          created_at: string
          id: string
          metrics_at_trigger: Json
          rule_triggered: string
          test_id: string | null
        }
        Insert: {
          action_taken: string
          created_at?: string
          id?: string
          metrics_at_trigger: Json
          rule_triggered: string
          test_id?: string | null
        }
        Update: {
          action_taken?: string
          created_at?: string
          id?: string
          metrics_at_trigger?: Json
          rule_triggered?: string
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_auto_stop_log_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_events: {
        Row: {
          ab_variant: string
          created_at: string
          event_name: string
          id: string
          payload: Json | null
          revenue: number | null
          session_id: string
          timestamp: string
        }
        Insert: {
          ab_variant: string
          created_at?: string
          event_name: string
          id?: string
          payload?: Json | null
          revenue?: number | null
          session_id: string
          timestamp?: string
        }
        Update: {
          ab_variant?: string
          created_at?: string
          event_name?: string
          id?: string
          payload?: Json | null
          revenue?: number | null
          session_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      ab_intent_events: {
        Row: {
          ab_variant: string
          created_at: string
          element_type: string
          event_type: string
          id: string
          led_to_atc: boolean | null
          led_to_checkout: boolean | null
          page_path: string | null
          session_id: string
          test_id: string | null
          timestamp: string
        }
        Insert: {
          ab_variant: string
          created_at?: string
          element_type: string
          event_type: string
          id?: string
          led_to_atc?: boolean | null
          led_to_checkout?: boolean | null
          page_path?: string | null
          session_id: string
          test_id?: string | null
          timestamp?: string
        }
        Update: {
          ab_variant?: string
          created_at?: string
          element_type?: string
          event_type?: string
          id?: string
          led_to_atc?: boolean | null
          led_to_checkout?: boolean | null
          page_path?: string | null
          session_id?: string
          test_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_intent_events_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_preflight_runs: {
        Row: {
          checks_json: Json
          commit_sha: string | null
          completed_at: string | null
          created_at: string
          id: string
          run_at: string
          status: string
          summary: string | null
          test_id: string
          traffic_after: number | null
          traffic_before: number | null
          trigger_type: string
          variant: string
        }
        Insert: {
          checks_json?: Json
          commit_sha?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          run_at?: string
          status?: string
          summary?: string | null
          test_id: string
          traffic_after?: number | null
          traffic_before?: number | null
          trigger_type: string
          variant?: string
        }
        Update: {
          checks_json?: Json
          commit_sha?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          run_at?: string
          status?: string
          summary?: string | null
          test_id?: string
          traffic_after?: number | null
          traffic_before?: number | null
          trigger_type?: string
          variant?: string
        }
        Relationships: []
      }
      ab_test_archive: {
        Row: {
          archived_at: string
          archived_by: string | null
          id: string
          is_restorable: boolean | null
          learning_template: Json | null
          lift_percent: number | null
          metrics_summary: Json
          snapshot_json: Json
          test_id: string
          test_name: string
          total_revenue: number | null
          total_sessions: number | null
          winner: string | null
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          id?: string
          is_restorable?: boolean | null
          learning_template?: Json | null
          lift_percent?: number | null
          metrics_summary?: Json
          snapshot_json: Json
          test_id: string
          test_name: string
          total_revenue?: number | null
          total_sessions?: number | null
          winner?: string | null
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          id?: string
          is_restorable?: boolean | null
          learning_template?: Json | null
          lift_percent?: number | null
          metrics_summary?: Json
          snapshot_json?: Json
          test_id?: string
          test_name?: string
          total_revenue?: number | null
          total_sessions?: number | null
          winner?: string | null
        }
        Relationships: []
      }
      ab_tests: {
        Row: {
          aov_a: number | null
          aov_b: number | null
          auto_stop_reason: string | null
          auto_stop_rule: string | null
          auto_stopped: boolean | null
          bis_final_a: number | null
          bis_final_b: number | null
          bis_raw_a: number | null
          bis_raw_b: number | null
          confidence_adjuster_a: number | null
          confidence_adjuster_b: number | null
          conversions_a: number | null
          conversions_b: number | null
          created_at: string
          cvr_a: number | null
          cvr_b: number | null
          description: string | null
          ended_at: string | null
          id: string
          impact_zone: string
          min_sample_size: number
          name: string
          power_zone_weight: number | null
          projected_annual_impact: number | null
          revenue_a: number | null
          revenue_b: number | null
          sessions_a: number | null
          sessions_b: number | null
          significance_method: string
          significance_threshold: number
          started_at: string | null
          status: string
          traffic_split: number
          variant_a_config: Json
          variant_b_config: Json
          winner_declared_at: string | null
          winner_reason: string | null
          winner_variant: string | null
        }
        Insert: {
          aov_a?: number | null
          aov_b?: number | null
          auto_stop_reason?: string | null
          auto_stop_rule?: string | null
          auto_stopped?: boolean | null
          bis_final_a?: number | null
          bis_final_b?: number | null
          bis_raw_a?: number | null
          bis_raw_b?: number | null
          confidence_adjuster_a?: number | null
          confidence_adjuster_b?: number | null
          conversions_a?: number | null
          conversions_b?: number | null
          created_at?: string
          cvr_a?: number | null
          cvr_b?: number | null
          description?: string | null
          ended_at?: string | null
          id?: string
          impact_zone: string
          min_sample_size?: number
          name: string
          power_zone_weight?: number | null
          projected_annual_impact?: number | null
          revenue_a?: number | null
          revenue_b?: number | null
          sessions_a?: number | null
          sessions_b?: number | null
          significance_method?: string
          significance_threshold?: number
          started_at?: string | null
          status?: string
          traffic_split?: number
          variant_a_config?: Json
          variant_b_config?: Json
          winner_declared_at?: string | null
          winner_reason?: string | null
          winner_variant?: string | null
        }
        Update: {
          aov_a?: number | null
          aov_b?: number | null
          auto_stop_reason?: string | null
          auto_stop_rule?: string | null
          auto_stopped?: boolean | null
          bis_final_a?: number | null
          bis_final_b?: number | null
          bis_raw_a?: number | null
          bis_raw_b?: number | null
          confidence_adjuster_a?: number | null
          confidence_adjuster_b?: number | null
          conversions_a?: number | null
          conversions_b?: number | null
          created_at?: string
          cvr_a?: number | null
          cvr_b?: number | null
          description?: string | null
          ended_at?: string | null
          id?: string
          impact_zone?: string
          min_sample_size?: number
          name?: string
          power_zone_weight?: number | null
          projected_annual_impact?: number | null
          revenue_a?: number | null
          revenue_b?: number | null
          sessions_a?: number | null
          sessions_b?: number | null
          significance_method?: string
          significance_threshold?: number
          started_at?: string | null
          status?: string
          traffic_split?: number
          variant_a_config?: Json
          variant_b_config?: Json
          winner_declared_at?: string | null
          winner_reason?: string | null
          winner_variant?: string | null
        }
        Relationships: []
      }
      add_to_cart_analytics: {
        Row: {
          created_at: string
          currency: string
          device_type: string | null
          id: string
          page_path: string | null
          price: number
          product_id: string
          product_title: string
          quantity: number
          referrer: string | null
          session_id: string
          tbls_page_id: string | null
          tbls_pin_id: string | null
          tbls_template: string | null
          variant_id: string
          variant_title: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          device_type?: string | null
          id?: string
          page_path?: string | null
          price: number
          product_id: string
          product_title: string
          quantity?: number
          referrer?: string | null
          session_id: string
          tbls_page_id?: string | null
          tbls_pin_id?: string | null
          tbls_template?: string | null
          variant_id: string
          variant_title?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          device_type?: string | null
          id?: string
          page_path?: string | null
          price?: number
          product_id?: string
          product_title?: string
          quantity?: number
          referrer?: string | null
          session_id?: string
          tbls_page_id?: string | null
          tbls_pin_id?: string | null
          tbls_template?: string | null
          variant_id?: string
          variant_title?: string | null
        }
        Relationships: []
      }
      ads_decision_insights: {
        Row: {
          created_at: string
          data_hash: string
          date_range_end: string
          date_range_start: string
          eqs_score: number | null
          granularity: string
          id: string
          insights: Json
          level: string
          summary: string | null
          totals_snapshot: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_hash: string
          date_range_end: string
          date_range_start: string
          eqs_score?: number | null
          granularity: string
          id?: string
          insights: Json
          level: string
          summary?: string | null
          totals_snapshot?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_hash?: string
          date_range_end?: string
          date_range_start?: string
          eqs_score?: number | null
          granularity?: string
          id?: string
          insights?: Json
          level?: string
          summary?: string | null
          totals_snapshot?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_campaign_variants: {
        Row: {
          affiliate_id: string
          assigned_at: string
          campaign_id: string
          conversion_value: number | null
          converted: boolean | null
          converted_at: string | null
          id: string
          variant_key: string
        }
        Insert: {
          affiliate_id: string
          assigned_at?: string
          campaign_id: string
          conversion_value?: number | null
          converted?: boolean | null
          converted_at?: string | null
          id?: string
          variant_key: string
        }
        Update: {
          affiliate_id?: string
          assigned_at?: string
          campaign_id?: string
          conversion_value?: number | null
          converted?: boolean | null
          converted_at?: string | null
          id?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_campaign_variants_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_campaign_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "affiliate_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_campaigns: {
        Row: {
          ab_test_enabled: boolean | null
          ab_variants: Json | null
          bg_color: string | null
          bonus_rate: number
          campaign_key: string
          created_at: string
          description: string | null
          eligible_tiers: string[] | null
          end_date: string
          icon_color: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          ab_test_enabled?: boolean | null
          ab_variants?: Json | null
          bg_color?: string | null
          bonus_rate?: number
          campaign_key: string
          created_at?: string
          description?: string | null
          eligible_tiers?: string[] | null
          end_date: string
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          ab_test_enabled?: boolean | null
          ab_variants?: Json | null
          bg_color?: string | null
          bonus_rate?: number
          campaign_key?: string
          created_at?: string
          description?: string | null
          eligible_tiers?: string[] | null
          end_date?: string
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_discount_codes: {
        Row: {
          affiliate_id: string
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          starts_at: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          affiliate_id: string
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          affiliate_id?: string
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_discount_codes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_goals: {
        Row: {
          affiliate_id: string
          created_at: string
          currency: string
          goal_type: string
          id: string
          period_end: string
          period_start: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          currency?: string
          goal_type: string
          id?: string
          period_end: string
          period_start: string
          target_amount: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          currency?: string
          goal_type?: string
          id?: string
          period_end?: string
          period_start?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          currency: string
          id: string
          method: string
          note: string | null
          processed_at: string
          processed_by_user_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          note?: string | null
          processed_at?: string
          processed_by_user_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          note?: string | null
          processed_at?: string
          processed_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_resources: {
        Row: {
          badge: string | null
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          link_label: string | null
          link_url: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_storefronts: {
        Row: {
          accent_color: string | null
          affiliate_id: string
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          click_count: number | null
          created_at: string
          custom_slug: string | null
          display_name: string | null
          featured_products: string[] | null
          id: string
          is_published: boolean | null
          social_links: Json | null
          testimonial: string | null
          theme_color: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          accent_color?: string | null
          affiliate_id: string
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          click_count?: number | null
          created_at?: string
          custom_slug?: string | null
          display_name?: string | null
          featured_products?: string[] | null
          id?: string
          is_published?: boolean | null
          social_links?: Json | null
          testimonial?: string | null
          theme_color?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          accent_color?: string | null
          affiliate_id?: string
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          click_count?: number | null
          created_at?: string
          custom_slug?: string | null
          display_name?: string | null
          featured_products?: string[] | null
          id?: string
          is_published?: boolean | null
          social_links?: Json | null
          testimonial?: string | null
          theme_color?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_storefronts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: true
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          best_streak_days: number | null
          created_at: string | null
          current_streak_days: number | null
          first_sale_at: string | null
          id: string
          last_payout_at: string | null
          last_sale_date: string | null
          level: number | null
          monthly_revenue_generated: number | null
          monthly_sales_count: number | null
          parent_affiliate_id: string | null
          payout_threshold: number | null
          pending_payout_amount: number | null
          referral_code: string
          status: string | null
          tier: string | null
          tier_expires_at: string | null
          total_commissions: number | null
          total_referrals: number | null
          track: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_streak_days?: number | null
          created_at?: string | null
          current_streak_days?: number | null
          first_sale_at?: string | null
          id?: string
          last_payout_at?: string | null
          last_sale_date?: string | null
          level?: number | null
          monthly_revenue_generated?: number | null
          monthly_sales_count?: number | null
          parent_affiliate_id?: string | null
          payout_threshold?: number | null
          pending_payout_amount?: number | null
          referral_code: string
          status?: string | null
          tier?: string | null
          tier_expires_at?: string | null
          total_commissions?: number | null
          total_referrals?: number | null
          track?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_streak_days?: number | null
          created_at?: string | null
          current_streak_days?: number | null
          first_sale_at?: string | null
          id?: string
          last_payout_at?: string | null
          last_sale_date?: string | null
          level?: number | null
          monthly_revenue_generated?: number | null
          monthly_sales_count?: number | null
          parent_affiliate_id?: string | null
          payout_threshold?: number | null
          pending_payout_amount?: number | null
          referral_code?: string
          status?: string | null
          tier?: string | null
          tier_expires_at?: string | null
          total_commissions?: number | null
          total_referrals?: number | null
          track?: string | null
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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      checkout_analytics: {
        Row: {
          cart_item_count: number | null
          cart_total: number | null
          created_at: string
          device_type: string | null
          duration_ms: number | null
          error_message: string | null
          event_type: string
          id: string
          retry_count: number | null
          session_id: string
          tbls_page_id: string | null
          tbls_pin_id: string | null
          tbls_template: string | null
          user_agent: string | null
        }
        Insert: {
          cart_item_count?: number | null
          cart_total?: number | null
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          retry_count?: number | null
          session_id: string
          tbls_page_id?: string | null
          tbls_pin_id?: string | null
          tbls_template?: string | null
          user_agent?: string | null
        }
        Update: {
          cart_item_count?: number | null
          cart_total?: number | null
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          retry_count?: number | null
          session_id?: string
          tbls_page_id?: string | null
          tbls_pin_id?: string | null
          tbls_template?: string | null
          user_agent?: string | null
        }
        Relationships: []
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
      coach_preview_plans: {
        Row: {
          created_at: string
          email: string
          id: string
          preview_plan: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          preview_plan: Json
          session_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          preview_plan?: Json
          session_id?: string
        }
        Relationships: []
      }
      collective_applications: {
        Row: {
          affiliate_id: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          preferred_tier: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          social_handles: string | null
          status: string
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          preferred_tier: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_handles?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          preferred_tier?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_handles?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collective_applications_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          customer_email: string | null
          customer_ip: string | null
          discount_code: string | null
          fraud_flag: boolean | null
          fraud_reason: string | null
          id: string
          level: number
          order_amount: number | null
          order_id: string
          referral_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string | null
          customer_email?: string | null
          customer_ip?: string | null
          discount_code?: string | null
          fraud_flag?: boolean | null
          fraud_reason?: string | null
          id?: string
          level: number
          order_amount?: number | null
          order_id: string
          referral_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          customer_email?: string | null
          customer_ip?: string | null
          discount_code?: string | null
          fraud_flag?: boolean | null
          fraud_reason?: string | null
          id?: string
          level?: number
          order_amount?: number | null
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
          coach_onboarding_completed_at: string | null
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
          coach_onboarding_completed_at?: string | null
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
          coach_onboarding_completed_at?: string | null
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
      epsr_epistemic_ledger: {
        Row: {
          confidence_change: string | null
          confidence_level: string | null
          counter_evidence: string[] | null
          created_at: string | null
          email: string
          experiment_completed_at: string | null
          experiment_protocol: string | null
          experiment_started_at: string | null
          hypothesis: string
          hypothesis_id: string
          id: string
          metrics_tracked: string[] | null
          outcome: string | null
          outcome_notes: string | null
          status: string | null
          supporting_evidence: string[] | null
          updated_at: string | null
        }
        Insert: {
          confidence_change?: string | null
          confidence_level?: string | null
          counter_evidence?: string[] | null
          created_at?: string | null
          email: string
          experiment_completed_at?: string | null
          experiment_protocol?: string | null
          experiment_started_at?: string | null
          hypothesis: string
          hypothesis_id: string
          id?: string
          metrics_tracked?: string[] | null
          outcome?: string | null
          outcome_notes?: string | null
          status?: string | null
          supporting_evidence?: string[] | null
          updated_at?: string | null
        }
        Update: {
          confidence_change?: string | null
          confidence_level?: string | null
          counter_evidence?: string[] | null
          created_at?: string | null
          email?: string
          experiment_completed_at?: string | null
          experiment_protocol?: string | null
          experiment_started_at?: string | null
          hypothesis?: string
          hypothesis_id?: string
          id?: string
          metrics_tracked?: string[] | null
          outcome?: string | null
          outcome_notes?: string | null
          status?: string | null
          supporting_evidence?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epsr_epistemic_ledger_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "sleep_profiles"
            referencedColumns: ["email"]
          },
        ]
      }
      epsr_evidence_corpus: {
        Row: {
          citation: string | null
          claim_summary: string
          confidence_level: string
          constraints: string | null
          created_at: string | null
          evidence_id: string
          evidence_version: number | null
          id: string
          is_active: boolean | null
          population_notes: string | null
          source_type: string
          title: string
          topic_tags: string[] | null
          updated_at: string | null
          year_published: number | null
        }
        Insert: {
          citation?: string | null
          claim_summary: string
          confidence_level: string
          constraints?: string | null
          created_at?: string | null
          evidence_id: string
          evidence_version?: number | null
          id?: string
          is_active?: boolean | null
          population_notes?: string | null
          source_type: string
          title: string
          topic_tags?: string[] | null
          updated_at?: string | null
          year_published?: number | null
        }
        Update: {
          citation?: string | null
          claim_summary?: string
          confidence_level?: string
          constraints?: string | null
          created_at?: string | null
          evidence_id?: string
          evidence_version?: number | null
          id?: string
          is_active?: boolean | null
          population_notes?: string | null
          source_type?: string
          title?: string
          topic_tags?: string[] | null
          updated_at?: string | null
          year_published?: number | null
        }
        Relationships: []
      }
      epsr_sessions: {
        Row: {
          clinical_flags: string[] | null
          created_at: string | null
          email: string
          experiment_proposed: Json | null
          id: string
          ledger_writeback: Json | null
          mode: string
          pattern_candidates: Json | null
          raw_ai_response: string | null
          user_id: string | null
          user_question: string | null
          user_signals: Json
        }
        Insert: {
          clinical_flags?: string[] | null
          created_at?: string | null
          email: string
          experiment_proposed?: Json | null
          id?: string
          ledger_writeback?: Json | null
          mode: string
          pattern_candidates?: Json | null
          raw_ai_response?: string | null
          user_id?: string | null
          user_question?: string | null
          user_signals: Json
        }
        Update: {
          clinical_flags?: string[] | null
          created_at?: string | null
          email?: string
          experiment_proposed?: Json | null
          id?: string
          ledger_writeback?: Json | null
          mode?: string
          pattern_candidates?: Json | null
          raw_ai_response?: string | null
          user_id?: string | null
          user_question?: string | null
          user_signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "epsr_sessions_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "sleep_profiles"
            referencedColumns: ["email"]
          },
        ]
      }
      garmin_activity_details: {
        Row: {
          activity_id: string | null
          created_at: string
          duration_seconds: number | null
          garmin_user_id: string
          has_samples: boolean
          id: string
          lap_count: number | null
          raw_event_id: string | null
          samples_count: number | null
          start_time_seconds: number
          summary_id: string
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          garmin_user_id: string
          has_samples?: boolean
          id?: string
          lap_count?: number | null
          raw_event_id?: string | null
          samples_count?: number | null
          start_time_seconds: number
          summary_id: string
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          garmin_user_id?: string
          has_samples?: boolean
          id?: string
          lap_count?: number | null
          raw_event_id?: string | null
          samples_count?: number | null
          start_time_seconds?: number
          summary_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garmin_activity_details_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "garmin_events_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      garmin_activity_files: {
        Row: {
          activity_id: string | null
          activity_name: string | null
          activity_type: string | null
          callback_expires_at: string | null
          callback_url_hash: string | null
          created_at: string
          device_name: string | null
          download_status: string
          downloaded_at: string | null
          file_type: string | null
          garmin_user_id: string
          id: string
          is_manual: boolean
          raw_event_id: string | null
          start_time_seconds: number | null
          storage_path: string | null
          summary_id: string
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          activity_name?: string | null
          activity_type?: string | null
          callback_expires_at?: string | null
          callback_url_hash?: string | null
          created_at?: string
          device_name?: string | null
          download_status?: string
          downloaded_at?: string | null
          file_type?: string | null
          garmin_user_id: string
          id?: string
          is_manual?: boolean
          raw_event_id?: string | null
          start_time_seconds?: number | null
          storage_path?: string | null
          summary_id: string
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          activity_name?: string | null
          activity_type?: string | null
          callback_expires_at?: string | null
          callback_url_hash?: string | null
          created_at?: string
          device_name?: string | null
          download_status?: string
          downloaded_at?: string | null
          file_type?: string | null
          garmin_user_id?: string
          id?: string
          is_manual?: boolean
          raw_event_id?: string | null
          start_time_seconds?: number | null
          storage_path?: string | null
          summary_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garmin_activity_files_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "garmin_events_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      garmin_activity_summaries: {
        Row: {
          active_kilocalories: number | null
          activity_name: string | null
          activity_type: string | null
          avg_heart_rate_bpm: number | null
          created_at: string
          device_name: string | null
          distance_meters: number | null
          duration_seconds: number | null
          garmin_user_id: string
          id: string
          is_manual: boolean
          is_web_upload: boolean
          max_heart_rate_bpm: number | null
          raw_event_id: string | null
          start_time_offset_seconds: number | null
          start_time_seconds: number
          summary_id: string
          user_id: string | null
        }
        Insert: {
          active_kilocalories?: number | null
          activity_name?: string | null
          activity_type?: string | null
          avg_heart_rate_bpm?: number | null
          created_at?: string
          device_name?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          garmin_user_id: string
          id?: string
          is_manual?: boolean
          is_web_upload?: boolean
          max_heart_rate_bpm?: number | null
          raw_event_id?: string | null
          start_time_offset_seconds?: number | null
          start_time_seconds: number
          summary_id: string
          user_id?: string | null
        }
        Update: {
          active_kilocalories?: number | null
          activity_name?: string | null
          activity_type?: string | null
          avg_heart_rate_bpm?: number | null
          created_at?: string
          device_name?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          garmin_user_id?: string
          id?: string
          is_manual?: boolean
          is_web_upload?: boolean
          max_heart_rate_bpm?: number | null
          raw_event_id?: string | null
          start_time_offset_seconds?: number | null
          start_time_seconds?: number
          summary_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garmin_activity_summaries_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "garmin_events_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      garmin_backfill_jobs: {
        Row: {
          attempt_count: number
          created_at: string
          end_seconds: number
          id: string
          last_error_message: string | null
          last_http_status: number | null
          last_response_kind: string | null
          next_attempt_at: string | null
          start_seconds: number
          status: string
          summary_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          end_seconds: number
          id?: string
          last_error_message?: string | null
          last_http_status?: number | null
          last_response_kind?: string | null
          next_attempt_at?: string | null
          start_seconds: number
          status?: string
          summary_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          end_seconds?: number
          id?: string
          last_error_message?: string | null
          last_http_status?: number | null
          last_response_kind?: string | null
          next_attempt_at?: string | null
          start_seconds?: number
          status?: string
          summary_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      garmin_dailies: {
        Row: {
          active_seconds: number | null
          calendar_date: string
          created_at: string
          duration_seconds: number | null
          floors_climbed: number | null
          garmin_user_id: string
          id: string
          intensity_minutes_goal: number | null
          raw_event_id: string | null
          start_time_seconds: number
          steps: number | null
          summary_id: string
          updated_at: string
          user_id: string | null
          vigorous_activity_seconds: number | null
        }
        Insert: {
          active_seconds?: number | null
          calendar_date: string
          created_at?: string
          duration_seconds?: number | null
          floors_climbed?: number | null
          garmin_user_id: string
          id?: string
          intensity_minutes_goal?: number | null
          raw_event_id?: string | null
          start_time_seconds: number
          steps?: number | null
          summary_id: string
          updated_at?: string
          user_id?: string | null
          vigorous_activity_seconds?: number | null
        }
        Update: {
          active_seconds?: number | null
          calendar_date?: string
          created_at?: string
          duration_seconds?: number | null
          floors_climbed?: number | null
          garmin_user_id?: string
          id?: string
          intensity_minutes_goal?: number | null
          raw_event_id?: string | null
          start_time_seconds?: number
          steps?: number | null
          summary_id?: string
          updated_at?: string
          user_id?: string | null
          vigorous_activity_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "garmin_dailies_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "garmin_events_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      garmin_events_raw: {
        Row: {
          domain: string
          garmin_user_id: string
          id: string
          payload: Json
          payload_hash: string
          received_at: string
          summary_id: string | null
          summary_type: string
          upload_window_end: number | null
          upload_window_start: number | null
        }
        Insert: {
          domain?: string
          garmin_user_id: string
          id?: string
          payload: Json
          payload_hash: string
          received_at?: string
          summary_id?: string | null
          summary_type: string
          upload_window_end?: number | null
          upload_window_start?: number | null
        }
        Update: {
          domain?: string
          garmin_user_id?: string
          id?: string
          payload?: Json
          payload_hash?: string
          received_at?: string
          summary_id?: string | null
          summary_type?: string
          upload_window_end?: number | null
          upload_window_start?: number | null
        }
        Relationships: []
      }
      garmin_moveiq_events: {
        Row: {
          activity_subtype: string | null
          activity_type: string | null
          calendar_date: string
          created_at: string
          duration_seconds: number | null
          garmin_user_id: string
          id: string
          offset_seconds: number | null
          raw_event_id: string | null
          start_time_seconds: number
          summary_id: string
          user_id: string | null
        }
        Insert: {
          activity_subtype?: string | null
          activity_type?: string | null
          calendar_date: string
          created_at?: string
          duration_seconds?: number | null
          garmin_user_id: string
          id?: string
          offset_seconds?: number | null
          raw_event_id?: string | null
          start_time_seconds: number
          summary_id: string
          user_id?: string | null
        }
        Update: {
          activity_subtype?: string | null
          activity_type?: string | null
          calendar_date?: string
          created_at?: string
          duration_seconds?: number | null
          garmin_user_id?: string
          id?: string
          offset_seconds?: number | null
          raw_event_id?: string | null
          start_time_seconds?: number
          summary_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garmin_moveiq_events_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "garmin_events_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      garmin_sleeps: {
        Row: {
          awake_seconds: number | null
          calendar_date: string
          created_at: string
          deep_seconds: number | null
          duration_sleep_seconds: number | null
          garmin_user_id: string
          id: string
          light_seconds: number | null
          raw_event_id: string | null
          rem_seconds: number | null
          start_time_seconds: number
          summary_id: string
          updated_at: string
          user_id: string | null
          validation: string | null
        }
        Insert: {
          awake_seconds?: number | null
          calendar_date: string
          created_at?: string
          deep_seconds?: number | null
          duration_sleep_seconds?: number | null
          garmin_user_id: string
          id?: string
          light_seconds?: number | null
          raw_event_id?: string | null
          rem_seconds?: number | null
          start_time_seconds: number
          summary_id: string
          updated_at?: string
          user_id?: string | null
          validation?: string | null
        }
        Update: {
          awake_seconds?: number | null
          calendar_date?: string
          created_at?: string
          deep_seconds?: number | null
          duration_sleep_seconds?: number | null
          garmin_user_id?: string
          id?: string
          light_seconds?: number | null
          raw_event_id?: string | null
          rem_seconds?: number | null
          start_time_seconds?: number
          summary_id?: string
          updated_at?: string
          user_id?: string | null
          validation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garmin_sleeps_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "garmin_events_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      google_purchase_events: {
        Row: {
          attribution_source: string | null
          created_at: string
          currency: string
          email_hash: string | null
          error_message: string | null
          event_id: string
          gclid: string | null
          id: string
          order_id: string
          phone_hash: string | null
          response_status: number | null
          send_status: string
          value: number
        }
        Insert: {
          attribution_source?: string | null
          created_at?: string
          currency?: string
          email_hash?: string | null
          error_message?: string | null
          event_id: string
          gclid?: string | null
          id?: string
          order_id: string
          phone_hash?: string | null
          response_status?: number | null
          send_status?: string
          value: number
        }
        Update: {
          attribution_source?: string | null
          created_at?: string
          currency?: string
          email_hash?: string | null
          error_message?: string | null
          event_id?: string
          gclid?: string | null
          id?: string
          order_id?: string
          phone_hash?: string | null
          response_status?: number | null
          send_status?: string
          value?: number
        }
        Relationships: []
      }
      klaviyo_form_events: {
        Row: {
          created_at: string
          event_type: string
          form_id: string | null
          form_version: string | null
          id: string
          meta: Json | null
          page_path: string
          session_id: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          form_id?: string | null
          form_version?: string | null
          id?: string
          meta?: Json | null
          page_path: string
          session_id: string
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          form_id?: string | null
          form_version?: string | null
          id?: string
          meta?: Json | null
          page_path?: string
          session_id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      meta_purchase_events: {
        Row: {
          attribution_source: string | null
          created_at: string
          currency: string
          error_message: string | null
          event_id: string
          events_received: number | null
          fbc: string | null
          fbp: string | null
          id: string
          order_id: string
          response_status: number | null
          send_status: string
          value: number
        }
        Insert: {
          attribution_source?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          event_id: string
          events_received?: number | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          order_id: string
          response_status?: number | null
          send_status?: string
          value: number
        }
        Update: {
          attribution_source?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          event_id?: string
          events_received?: number | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          order_id?: string
          response_status?: number | null
          send_status?: string
          value?: number
        }
        Relationships: []
      }
      missing_purchase_events: {
        Row: {
          detected_at: string
          id: string
          notes: string | null
          order_created_at: string
          order_id: string
          status: string
          window_end: string
          window_start: string
        }
        Insert: {
          detected_at?: string
          id?: string
          notes?: string | null
          order_created_at: string
          order_id: string
          status?: string
          window_end: string
          window_start: string
        }
        Update: {
          detected_at?: string
          id?: string
          notes?: string | null
          order_created_at?: string
          order_id?: string
          status?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      order_tracking: {
        Row: {
          carrier_code: string | null
          carrier_name: string | null
          created_at: string
          delivered_at: string | null
          destination_country: string | null
          email: string
          estimated_delivery: string | null
          id: string
          last_event: string | null
          last_event_time: string | null
          order_number: string
          origin_country: string | null
          status: string
          sub_status: string | null
          track17_data: Json | null
          tracking_number: string
          updated_at: string
        }
        Insert: {
          carrier_code?: string | null
          carrier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_country?: string | null
          email: string
          estimated_delivery?: string | null
          id?: string
          last_event?: string | null
          last_event_time?: string | null
          order_number: string
          origin_country?: string | null
          status?: string
          sub_status?: string | null
          track17_data?: Json | null
          tracking_number: string
          updated_at?: string
        }
        Update: {
          carrier_code?: string | null
          carrier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_country?: string | null
          email?: string
          estimated_delivery?: string | null
          id?: string
          last_event?: string | null
          last_event_time?: string | null
          order_number?: string
          origin_country?: string | null
          status?: string
          sub_status?: string | null
          track17_data?: Json | null
          tracking_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string
          tbls_page_id: string | null
          tbls_pin_id: string | null
          tbls_template: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id: string
          tbls_page_id?: string | null
          tbls_pin_id?: string | null
          tbls_template?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
          tbls_page_id?: string | null
          tbls_pin_id?: string | null
          tbls_template?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      partner_ugc_submissions: {
        Row: {
          admin_notes: string | null
          affiliate_id: string
          content_type: string
          content_url: string
          created_at: string
          description: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affiliate_id: string
          content_type: string
          content_url: string
          created_at?: string
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affiliate_id?: string
          content_type?: string
          content_url?: string
          created_at?: string
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_ugc_submissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      pinterest_ads_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string
          id: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at: string
          id?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      pinterest_context: {
        Row: {
          client_ip_address: string | null
          client_user_agent: string | null
          consent_status: string
          context_id: string
          created_at: string
          email_hash: string | null
          epik: string | null
          expires_at: string
          id: string
          landing_page: string | null
          meta_fbc: string | null
          meta_fbp: string | null
          phone_hash: string | null
          referrer: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          client_ip_address?: string | null
          client_user_agent?: string | null
          consent_status: string
          context_id: string
          created_at?: string
          email_hash?: string | null
          epik?: string | null
          expires_at: string
          id?: string
          landing_page?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          phone_hash?: string | null
          referrer?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          client_ip_address?: string | null
          client_user_agent?: string | null
          consent_status?: string
          context_id?: string
          created_at?: string
          email_hash?: string | null
          epik?: string | null
          expires_at?: string
          id?: string
          landing_page?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          phone_hash?: string | null
          referrer?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      pinterest_eqs_snapshots: {
        Row: {
          ad_account_id: string
          api_error_message: string | null
          api_response_status: number | null
          blocking_issues: Json | null
          coverage_click_id: number | null
          coverage_email: number | null
          coverage_external_id: number | null
          coverage_order_id: number | null
          created_at: string
          id: string
          ingestion_source: string
          lookback_period: string
          overall_status: string
          quality_components: Json
          source_platform: string
        }
        Insert: {
          ad_account_id: string
          api_error_message?: string | null
          api_response_status?: number | null
          blocking_issues?: Json | null
          coverage_click_id?: number | null
          coverage_email?: number | null
          coverage_external_id?: number | null
          coverage_order_id?: number | null
          created_at?: string
          id?: string
          ingestion_source?: string
          lookback_period?: string
          overall_status: string
          quality_components?: Json
          source_platform?: string
        }
        Update: {
          ad_account_id?: string
          api_error_message?: string | null
          api_response_status?: number | null
          blocking_issues?: Json | null
          coverage_click_id?: number | null
          coverage_email?: number | null
          coverage_external_id?: number | null
          coverage_order_id?: number | null
          created_at?: string
          id?: string
          ingestion_source?: string
          lookback_period?: string
          overall_status?: string
          quality_components?: Json
          source_platform?: string
        }
        Relationships: []
      }
      pinterest_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          scopes: string[] | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pinterest_purchase_events: {
        Row: {
          attribution_confidence: string | null
          attribution_reason: string | null
          attribution_source: string | null
          created_at: string
          currency: string
          delivery_state: string | null
          epik: string | null
          event_id: string | null
          id: string
          is_test: boolean
          landing_page: string | null
          order_id: string
          render_response: Json | null
          render_status: string
          send_mode: string | null
          send_status: string
          send_status_reason: string | null
          source: string
          store_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number
        }
        Insert: {
          attribution_confidence?: string | null
          attribution_reason?: string | null
          attribution_source?: string | null
          created_at?: string
          currency?: string
          delivery_state?: string | null
          epik?: string | null
          event_id?: string | null
          id?: string
          is_test?: boolean
          landing_page?: string | null
          order_id: string
          render_response?: Json | null
          render_status: string
          send_mode?: string | null
          send_status?: string
          send_status_reason?: string | null
          source?: string
          store_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value: number
        }
        Update: {
          attribution_confidence?: string | null
          attribution_reason?: string | null
          attribution_source?: string | null
          created_at?: string
          currency?: string
          delivery_state?: string | null
          epik?: string | null
          event_id?: string | null
          id?: string
          is_test?: boolean
          landing_page?: string | null
          order_id?: string
          render_response?: Json | null
          render_status?: string
          send_mode?: string | null
          send_status?: string
          send_status_reason?: string | null
          source?: string
          store_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number
        }
        Relationships: []
      }
      processed_webhook_ids: {
        Row: {
          id: string
          processed_at: string
          source: string
          webhook_id: string
        }
        Insert: {
          id?: string
          processed_at?: string
          source: string
          webhook_id: string
        }
        Update: {
          id?: string
          processed_at?: string
          source?: string
          webhook_id?: string
        }
        Relationships: []
      }
      product_cost_prices: {
        Row: {
          cost_bulk: number
          cost_single: number
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          product_handle: string
          product_title: string
        }
        Insert: {
          cost_bulk: number
          cost_single: number
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          product_handle: string
          product_title: string
        }
        Update: {
          cost_bulk?: number
          cost_single?: number
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          product_handle?: string
          product_title?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          admin_notes: string | null
          admin_reply: string | null
          body: string
          created_at: string
          customer_email: string
          customer_name: string
          helpful_count: number | null
          id: string
          is_verified_purchase: boolean | null
          product_handle: string
          rating: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string | null
          variant_title: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_reply?: string | null
          body: string
          created_at?: string
          customer_email: string
          customer_name: string
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          product_handle: string
          rating: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string | null
          variant_title?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_reply?: string | null
          body?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          product_handle?: string
          rating?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string | null
          variant_title?: string | null
        }
        Relationships: []
      }
      quality_events: {
        Row: {
          ab_variant: string
          amount: number | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          order_id: string
          reason: string | null
        }
        Insert: {
          ab_variant: string
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          order_id: string
          reason?: string | null
        }
        Update: {
          ab_variant?: string
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          order_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      quiz_reveal_analytics: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          insight_count: number | null
          persona_cluster: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          insight_count?: number | null
          persona_cluster?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          insight_count?: number | null
          persona_cluster?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      recovery_dead_letters: {
        Row: {
          created_at: string
          final_status: string
          id: string
          last_attempt_no: number
          last_error_code: string | null
          last_error_message: string | null
          order_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          final_status?: string
          id?: string
          last_attempt_no: number
          last_error_code?: string | null
          last_error_message?: string | null
          order_id: string
          reason: string
        }
        Update: {
          created_at?: string
          final_status?: string
          id?: string
          last_attempt_no?: number
          last_error_code?: string | null
          last_error_message?: string | null
          order_id?: string
          reason?: string
        }
        Relationships: []
      }
      recovery_purchase_attempts: {
        Row: {
          attempt_no: number
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          http_status: number | null
          id: string
          method: string
          order_id: string
          outcome: string
          payload_fingerprint: string
          response_json: Json | null
        }
        Insert: {
          attempt_no: number
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          method: string
          order_id: string
          outcome: string
          payload_fingerprint: string
          response_json?: Json | null
        }
        Update: {
          attempt_no?: number
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          method?: string
          order_id?: string
          outcome?: string
          payload_fingerprint?: string
          response_json?: Json | null
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
      review_helpful_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_media: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          media_type: string
          review_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          media_type: string
          review_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          media_type?: string
          review_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_media_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_notifications: {
        Row: {
          channel: string
          created_at: string
          id: string
          order_id: string
          provider: string
          reason: string | null
          sent_at: string | null
          status: string
          status_state: string
          tracking_number: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          order_id: string
          provider?: string
          reason?: string | null
          sent_at?: string | null
          status: string
          status_state: string
          tracking_number: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          order_id?: string
          provider?: string
          reason?: string | null
          sent_at?: string | null
          status?: string
          status_state?: string
          tracking_number?: string
        }
        Relationships: []
      }
      shipment_tracking_events: {
        Row: {
          id: string
          occurred_at: string
          order_id: string
          payload_hash: string | null
          received_at: string
          status: string
          status_detail: Json
          tracking_number: string
        }
        Insert: {
          id?: string
          occurred_at: string
          order_id: string
          payload_hash?: string | null
          received_at?: string
          status: string
          status_detail?: Json
          tracking_number: string
        }
        Update: {
          id?: string
          occurred_at?: string
          order_id?: string
          payload_hash?: string | null
          received_at?: string
          status?: string
          status_detail?: Json
          tracking_number?: string
        }
        Relationships: []
      }
      shipment_trackings: {
        Row: {
          carrier: string | null
          created_at: string
          current_status: string
          email: string
          id: string
          last_status_at: string | null
          order_id: string
          tracking_number: string
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          current_status?: string
          email: string
          id?: string
          last_status_at?: string | null
          order_id: string
          tracking_number: string
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          current_status?: string
          email?: string
          id?: string
          last_status_at?: string | null
          order_id?: string
          tracking_number?: string
          updated_at?: string
        }
        Relationships: []
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
      sleep_coach_activity_signals_daily: {
        Row: {
          baseline_workouts_count_30d: number | null
          computed_at: string
          date: string
          id: string
          late_workout_days_7d: number | null
          late_workout_flag: boolean
          most_common_activity_type: string | null
          signal_freshness: string
          training_load_label: string
          user_id: string
          workouts_count_7d: number | null
        }
        Insert: {
          baseline_workouts_count_30d?: number | null
          computed_at?: string
          date: string
          id?: string
          late_workout_days_7d?: number | null
          late_workout_flag?: boolean
          most_common_activity_type?: string | null
          signal_freshness?: string
          training_load_label?: string
          user_id: string
          workouts_count_7d?: number | null
        }
        Update: {
          baseline_workouts_count_30d?: number | null
          computed_at?: string
          date?: string
          id?: string
          late_workout_days_7d?: number | null
          late_workout_flag?: boolean
          most_common_activity_type?: string | null
          signal_freshness?: string
          training_load_label?: string
          user_id?: string
          workouts_count_7d?: number | null
        }
        Relationships: []
      }
      sleep_coach_metrics_daily: {
        Row: {
          calendar_date: string
          computed_at: string
          data_sources: string[]
          id: string
          signal_key: string
          signal_value: string
          user_id: string
        }
        Insert: {
          calendar_date: string
          computed_at?: string
          data_sources?: string[]
          id?: string
          signal_key: string
          signal_value: string
          user_id: string
        }
        Update: {
          calendar_date?: string
          computed_at?: string
          data_sources?: string[]
          id?: string
          signal_key?: string
          signal_value?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_intake_rate_limits: {
        Row: {
          id: string
          request_count: number
          source: string
          user_id: string
          window_start: string
        }
        Insert: {
          id?: string
          request_count?: number
          source: string
          user_id: string
          window_start?: string
        }
        Update: {
          id?: string
          request_count?: number
          source?: string
          user_id?: string
          window_start?: string
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
          sleep_night_id: string | null
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
          sleep_night_id?: string | null
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
          sleep_night_id?: string | null
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
          {
            foreignKeyName: "sleep_logs_sleep_night_id_fkey"
            columns: ["sleep_night_id"]
            isOneToOne: false
            referencedRelation: "sleep_nights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_logs_sleep_night_id_fkey"
            columns: ["sleep_night_id"]
            isOneToOne: false
            referencedRelation: "sleep_nights_live"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_nights: {
        Row: {
          created_at: string
          data_origin: Database["public"]["Enums"]["sleep_data_origin"] | null
          device_model: string | null
          end_time: string
          id: string
          ingested_at: string | null
          is_split_segment: boolean | null
          is_test: boolean
          night_date: string
          normalization_version: number
          raw_event_id: string | null
          sleep_efficiency: number | null
          source: string
          start_time: string
          timezone_offset_seconds: number | null
          total_sleep_minutes: number | null
          user_id: string
          wake_events: number | null
        }
        Insert: {
          created_at?: string
          data_origin?: Database["public"]["Enums"]["sleep_data_origin"] | null
          device_model?: string | null
          end_time: string
          id?: string
          ingested_at?: string | null
          is_split_segment?: boolean | null
          is_test?: boolean
          night_date: string
          normalization_version?: number
          raw_event_id?: string | null
          sleep_efficiency?: number | null
          source: string
          start_time: string
          timezone_offset_seconds?: number | null
          total_sleep_minutes?: number | null
          user_id: string
          wake_events?: number | null
        }
        Update: {
          created_at?: string
          data_origin?: Database["public"]["Enums"]["sleep_data_origin"] | null
          device_model?: string | null
          end_time?: string
          id?: string
          ingested_at?: string | null
          is_split_segment?: boolean | null
          is_test?: boolean
          night_date?: string
          normalization_version?: number
          raw_event_id?: string | null
          sleep_efficiency?: number | null
          source?: string
          start_time?: string
          timezone_offset_seconds?: number | null
          total_sleep_minutes?: number | null
          user_id?: string
          wake_events?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sleep_nights_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "sleep_raw_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_nights_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "sleep_raw_events_live"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_plan_adherence: {
        Row: {
          adherence_rate: number
          created_at: string
          current_plan_id: string | null
          email: string
          last_completion_date: string | null
          last_updated: string
          streak_days: number
          total_actions_available: number
          total_actions_completed: number
          week_number: number
        }
        Insert: {
          adherence_rate?: number
          created_at?: string
          current_plan_id?: string | null
          email: string
          last_completion_date?: string | null
          last_updated?: string
          streak_days?: number
          total_actions_available?: number
          total_actions_completed?: number
          week_number?: number
        }
        Update: {
          adherence_rate?: number
          created_at?: string
          current_plan_id?: string | null
          email?: string
          last_completion_date?: string | null
          last_updated?: string
          streak_days?: number
          total_actions_available?: number
          total_actions_completed?: number
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sleep_plan_adherence_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "coach_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_plan_adherence_email_fkey"
            columns: ["email"]
            isOneToOne: true
            referencedRelation: "sleep_profiles"
            referencedColumns: ["email"]
          },
        ]
      }
      sleep_plan_completions: {
        Row: {
          action_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          day_name: string
          email: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          action_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_name: string
          email: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          action_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_name?: string
          email?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_plan_completions_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "sleep_profiles"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "sleep_plan_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "coach_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_plan_reflections: {
        Row: {
          created_at: string
          day_name: string
          email: string
          id: string
          plan_id: string
          reflection_text: string
        }
        Insert: {
          created_at?: string
          day_name: string
          email: string
          id?: string
          plan_id: string
          reflection_text: string
        }
        Update: {
          created_at?: string
          day_name?: string
          email?: string
          id?: string
          plan_id?: string
          reflection_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_plan_reflections_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "sleep_profiles"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "sleep_plan_reflections_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "coach_plans"
            referencedColumns: ["id"]
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
          last_shopify_sync: string | null
          mattress_firmness: string | null
          mattress_thickness: string | null
          pain_points: string[] | null
          persona_cluster: Database["public"]["Enums"]["persona_cluster"] | null
          persona_label: string | null
          persona_rationale: string | null
          persona_recommended_modules: number[] | null
          pillow_type: string | null
          products_owned: string[] | null
          purchase_count: number | null
          quiz_completed: boolean | null
          quiz_completed_at: string | null
          quiz_data: Json | null
          session_id: string | null
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
          last_shopify_sync?: string | null
          mattress_firmness?: string | null
          mattress_thickness?: string | null
          pain_points?: string[] | null
          persona_cluster?:
            | Database["public"]["Enums"]["persona_cluster"]
            | null
          persona_label?: string | null
          persona_rationale?: string | null
          persona_recommended_modules?: number[] | null
          pillow_type?: string | null
          products_owned?: string[] | null
          purchase_count?: number | null
          quiz_completed?: boolean | null
          quiz_completed_at?: string | null
          quiz_data?: Json | null
          session_id?: string | null
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
          last_shopify_sync?: string | null
          mattress_firmness?: string | null
          mattress_thickness?: string | null
          pain_points?: string[] | null
          persona_cluster?:
            | Database["public"]["Enums"]["persona_cluster"]
            | null
          persona_label?: string | null
          persona_rationale?: string | null
          persona_recommended_modules?: number[] | null
          pillow_type?: string | null
          products_owned?: string[] | null
          purchase_count?: number | null
          quiz_completed?: boolean | null
          quiz_completed_at?: string | null
          quiz_data?: Json | null
          session_id?: string | null
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
      sleep_raw_events: {
        Row: {
          dedupe_key: string
          device_model: string | null
          end_time: string
          external_night_id: string | null
          id: string
          is_test: boolean
          raw_payload: Json | null
          received_at: string
          source: string
          stages: Json | null
          start_time: string
          timezone_offset_seconds: number | null
          user_id: string
        }
        Insert: {
          dedupe_key: string
          device_model?: string | null
          end_time: string
          external_night_id?: string | null
          id?: string
          is_test?: boolean
          raw_payload?: Json | null
          received_at?: string
          source: string
          stages?: Json | null
          start_time: string
          timezone_offset_seconds?: number | null
          user_id: string
        }
        Update: {
          dedupe_key?: string
          device_model?: string | null
          end_time?: string
          external_night_id?: string | null
          id?: string
          is_test?: boolean
          raw_payload?: Json | null
          received_at?: string
          source?: string
          stages?: Json | null
          start_time?: string
          timezone_offset_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      sleep_sources: {
        Row: {
          activity_error_code: string | null
          activity_error_message: string | null
          activity_last_sync_at: string | null
          activity_status: string
          backfill_completed_at: string | null
          backfill_days: number | null
          backfill_error: string | null
          backfill_nights_count: number | null
          backfill_requested_at: string | null
          backfill_status: string | null
          connected_at: string | null
          consent_granted_at: string | null
          consent_version: string | null
          created_at: string
          domains: string[]
          garmin_token_hash: string | null
          garmin_token_hash_updated_at: string | null
          health_last_sync_at: string | null
          id: string
          last_sync_at: string | null
          metadata: Json | null
          on_hold: boolean
          revoked_at: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
          user_timezone: string | null
        }
        Insert: {
          activity_error_code?: string | null
          activity_error_message?: string | null
          activity_last_sync_at?: string | null
          activity_status?: string
          backfill_completed_at?: string | null
          backfill_days?: number | null
          backfill_error?: string | null
          backfill_nights_count?: number | null
          backfill_requested_at?: string | null
          backfill_status?: string | null
          connected_at?: string | null
          consent_granted_at?: string | null
          consent_version?: string | null
          created_at?: string
          domains?: string[]
          garmin_token_hash?: string | null
          garmin_token_hash_updated_at?: string | null
          health_last_sync_at?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          on_hold?: boolean
          revoked_at?: string | null
          source: string
          status?: string
          updated_at?: string
          user_id: string
          user_timezone?: string | null
        }
        Update: {
          activity_error_code?: string | null
          activity_error_message?: string | null
          activity_last_sync_at?: string | null
          activity_status?: string
          backfill_completed_at?: string | null
          backfill_days?: number | null
          backfill_error?: string | null
          backfill_nights_count?: number | null
          backfill_requested_at?: string | null
          backfill_status?: string | null
          connected_at?: string | null
          consent_granted_at?: string | null
          consent_version?: string | null
          created_at?: string
          domains?: string[]
          garmin_token_hash?: string | null
          garmin_token_hash_updated_at?: string | null
          health_last_sync_at?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          on_hold?: boolean
          revoked_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_timezone?: string | null
        }
        Relationships: []
      }
      tbls_purchase_attribution: {
        Row: {
          created_at: string
          currency: string
          customer_email_hash: string | null
          id: string
          landing_page: string | null
          order_id: string
          order_number: string | null
          order_value: number
          session_id: string | null
          tbls_category: string | null
          tbls_page_id: string | null
          tbls_pin_id: string | null
          tbls_subdomain: string | null
          tbls_template: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_email_hash?: string | null
          id?: string
          landing_page?: string | null
          order_id: string
          order_number?: string | null
          order_value: number
          session_id?: string | null
          tbls_category?: string | null
          tbls_page_id?: string | null
          tbls_pin_id?: string | null
          tbls_subdomain?: string | null
          tbls_template?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          customer_email_hash?: string | null
          id?: string
          landing_page?: string | null
          order_id?: string
          order_number?: string | null
          order_value?: number
          session_id?: string | null
          tbls_category?: string | null
          tbls_page_id?: string | null
          tbls_pin_id?: string | null
          tbls_subdomain?: string | null
          tbls_template?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      tracking_alerts: {
        Row: {
          acknowledged_at: string | null
          context: Json | null
          created_at: string
          day: string
          id: string
          message: string
          severity: string
          status: string
          type: string
        }
        Insert: {
          acknowledged_at?: string | null
          context?: Json | null
          created_at?: string
          day: string
          id?: string
          message: string
          severity: string
          status?: string
          type: string
        }
        Update: {
          acknowledged_at?: string | null
          context?: Json | null
          created_at?: string
          day?: string
          id?: string
          message?: string
          severity?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          created_at: string
          description: string | null
          event_time: string | null
          id: string
          location: string | null
          status: string
          tracking_number: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_time?: string | null
          id?: string
          location?: string | null
          status: string
          tracking_number: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_time?: string | null
          id?: string
          location?: string | null
          status?: string
          tracking_number?: string
        }
        Relationships: []
      }
      tracking_health_daily: {
        Row: {
          consent_granted: number
          consent_rate: number
          context_rows: number
          created_at: string
          day: string
          epik_rate: number
          error_count: number
          error_rate: number
          ip_rate: number
          orders_seen: number
          pending_count: number
          reconciliation_mismatches: number
          success_count: number
          success_rate: number
          total_value_eur: number
          ua_rate: number
          unknown_status: number
          updated_at: string
          window_end: string
          window_start: string
          with_epik: number
          with_ip: number
          with_ua: number
        }
        Insert: {
          consent_granted?: number
          consent_rate?: number
          context_rows?: number
          created_at?: string
          day: string
          epik_rate?: number
          error_count?: number
          error_rate?: number
          ip_rate?: number
          orders_seen?: number
          pending_count?: number
          reconciliation_mismatches?: number
          success_count?: number
          success_rate?: number
          total_value_eur?: number
          ua_rate?: number
          unknown_status?: number
          updated_at?: string
          window_end: string
          window_start: string
          with_epik?: number
          with_ip?: number
          with_ua?: number
        }
        Update: {
          consent_granted?: number
          consent_rate?: number
          context_rows?: number
          created_at?: string
          day?: string
          epik_rate?: number
          error_count?: number
          error_rate?: number
          ip_rate?: number
          orders_seen?: number
          pending_count?: number
          reconciliation_mismatches?: number
          success_count?: number
          success_rate?: number
          total_value_eur?: number
          ua_rate?: number
          unknown_status?: number
          updated_at?: string
          window_end?: string
          window_start?: string
          with_epik?: number
          with_ip?: number
          with_ua?: number
        }
        Relationships: []
      }
      tracking_jobs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          job_name: string
          stats: Json | null
          success: boolean
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          job_name: string
          stats?: Json | null
          success?: boolean
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          job_name?: string
          stats?: Json | null
          success?: boolean
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      tracking_requests: {
        Row: {
          first_request_at: string
          id: string
          ip_hash: string
          last_request_at: string
          request_count: number
          tracking_lookup_key: string
        }
        Insert: {
          first_request_at?: string
          id?: string
          ip_hash: string
          last_request_at?: string
          request_count?: number
          tracking_lookup_key: string
        }
        Update: {
          first_request_at?: string
          id?: string
          ip_hash?: string
          last_request_at?: string
          request_count?: number
          tracking_lookup_key?: string
        }
        Relationships: []
      }
      user_product_ownership: {
        Row: {
          acquired_at: string
          created_at: string
          email: string
          id: string
          product_slug: string
          shopify_order_id: string | null
          synced_at: string
        }
        Insert: {
          acquired_at?: string
          created_at?: string
          email: string
          id?: string
          product_slug: string
          shopify_order_id?: string | null
          synced_at?: string
        }
        Update: {
          acquired_at?: string
          created_at?: string
          email?: string
          id?: string
          product_slug?: string
          shopify_order_id?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      ab_funnel_comparison: {
        Row: {
          ab_variant: string | null
          add_to_carts: number | null
          atc_rate: number | null
          ic_rate: number | null
          initiates: number | null
          page_views: number | null
          purchase_rate: number | null
          purchases: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      ab_performance_overview: {
        Row: {
          ab_variant: string | null
          avg_revenue_per_conversion: number | null
          event_count: number | null
          event_name: string | null
          total_revenue: number | null
          unique_sessions: number | null
        }
        Relationships: []
      }
      ab_quality_metrics: {
        Row: {
          ab_variant: string | null
          chargeback_amount: number | null
          chargeback_count: number | null
          refund_amount: number | null
          refund_count: number | null
        }
        Relationships: []
      }
      ab_revenue_split: {
        Row: {
          ab_variant: string | null
          avg_order_value: number | null
          total_orders: number | null
          total_revenue: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
      sleep_nights_live: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string | null
          is_split_segment: boolean | null
          is_test: boolean | null
          night_date: string | null
          normalization_version: number | null
          raw_event_id: string | null
          sleep_efficiency: number | null
          source: string | null
          start_time: string | null
          total_sleep_minutes: number | null
          user_id: string | null
          wake_events: number | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          is_split_segment?: boolean | null
          is_test?: boolean | null
          night_date?: string | null
          normalization_version?: number | null
          raw_event_id?: string | null
          sleep_efficiency?: number | null
          source?: string | null
          start_time?: string | null
          total_sleep_minutes?: number | null
          user_id?: string | null
          wake_events?: number | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          is_split_segment?: boolean | null
          is_test?: boolean | null
          night_date?: string | null
          normalization_version?: number | null
          raw_event_id?: string | null
          sleep_efficiency?: number | null
          source?: string | null
          start_time?: string | null
          total_sleep_minutes?: number | null
          user_id?: string | null
          wake_events?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sleep_nights_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "sleep_raw_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_nights_raw_event_id_fkey"
            columns: ["raw_event_id"]
            isOneToOne: false
            referencedRelation: "sleep_raw_events_live"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_raw_events_live: {
        Row: {
          dedupe_key: string | null
          end_time: string | null
          external_night_id: string | null
          id: string | null
          is_test: boolean | null
          received_at: string | null
          source: string | null
          stages: Json | null
          start_time: string | null
          user_id: string | null
        }
        Insert: {
          dedupe_key?: string | null
          end_time?: string | null
          external_night_id?: string | null
          id?: string | null
          is_test?: boolean | null
          received_at?: string | null
          source?: string | null
          stages?: Json | null
          start_time?: string | null
          user_id?: string | null
        }
        Update: {
          dedupe_key?: string | null
          end_time?: string | null
          external_night_id?: string | null
          id?: string | null
          is_test?: boolean | null
          received_at?: string | null
          source?: string | null
          stages?: Json | null
          start_time?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decay_stale_hypotheses: {
        Args: { stale_days?: number }
        Returns: {
          email: string
          hypothesis_id: string
          new_confidence: string
          old_confidence: string
        }[]
      }
      get_affiliate_commissions_masked: {
        Args: { p_affiliate_id: string }
        Returns: {
          affiliate_id: string
          amount: number
          created_at: string
          fraud_flag: boolean
          id: string
          level: number
          order_amount: number
          order_id: string
          referral_id: string
          status: string
        }[]
      }
      get_affiliate_commissions_safe: {
        Args: { p_affiliate_id: string }
        Returns: {
          affiliate_id: string
          amount: number
          created_at: string
          fraud_flag: boolean
          fraud_reason: string
          id: string
          level: number
          order_amount: number
          order_id: string
          referral_id: string
          status: string
        }[]
      }
      get_auth_email: { Args: never; Returns: string }
      get_page_visits_stats: {
        Args: { start_date: string }
        Returns: {
          total_pageviews: number
          unique_sessions: number
        }[]
      }
      get_tier_commission_rate: { Args: { tier_name: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      log_source:
        | "manual"
        | "whatsapp"
        | "wearable_apple_health"
        | "wearable_garmin"
      persona_cluster: "pain_sleeper" | "stress_insomnia" | "optimizer"
      sleep_data_origin: "webhook" | "backfill"
      sleep_position: "side" | "back" | "stomach" | "mixed"
      sleep_source: "apple_health" | "garmin"
      sleep_stage: "awake" | "light" | "deep" | "rem"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
      log_source: [
        "manual",
        "whatsapp",
        "wearable_apple_health",
        "wearable_garmin",
      ],
      persona_cluster: ["pain_sleeper", "stress_insomnia", "optimizer"],
      sleep_data_origin: ["webhook", "backfill"],
      sleep_position: ["side", "back", "stomach", "mixed"],
      sleep_source: ["apple_health", "garmin"],
      sleep_stage: ["awake", "light", "deep", "rem"],
      stress_level: ["low", "medium", "high"],
      temperature_preference: ["cold", "neutral", "warm"],
      wake_up_condition: ["energized", "neutral", "tired", "stiff"],
    },
  },
} as const

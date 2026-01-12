/**
 * useCampaignVariant
 * 
 * A/B testing hook for affiliate campaigns.
 * Assigns affiliates to campaign variants and tracks conversions.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CampaignVariant {
  key: string;
  name: string;
  bonus_rate: number;
  config?: Record<string, any>;
}

interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  ab_test_enabled: boolean;
  ab_variants: CampaignVariant[];
  bonus_rate: number;
}

interface VariantAssignment {
  campaign_id: string;
  campaign_key: string;
  variant_key: string;
  variant: CampaignVariant | null;
  effective_bonus_rate: number;
  isControl: boolean;
}

interface UseCampaignVariantReturn {
  assignment: VariantAssignment | null;
  loading: boolean;
  error: string | null;
  trackConversion: (value: number) => Promise<void>;
}

/**
 * Deterministically assign variant based on affiliate ID
 * Uses simple hash for consistent assignment
 */
function assignVariant(affiliateId: string, variants: CampaignVariant[]): CampaignVariant {
  if (variants.length === 0) return { key: 'control', name: 'Control', bonus_rate: 0 };
  
  // Simple hash of affiliate ID
  let hash = 0;
  for (let i = 0; i < affiliateId.length; i++) {
    const char = affiliateId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % variants.length;
  return variants[index];
}

export function useCampaignVariant(
  affiliateId: string | null,
  campaignKey: string
): UseCampaignVariantReturn {
  const [assignment, setAssignment] = useState<VariantAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrAssignVariant() {
      if (!affiliateId || !campaignKey) {
        setLoading(false);
        return;
      }

      try {
        // Get campaign details
        const { data: campaign, error: campError } = await supabase
          .from('affiliate_campaigns')
          .select('*')
          .eq('campaign_key', campaignKey)
          .eq('is_active', true)
          .maybeSingle();

        if (campError) throw campError;

        if (!campaign) {
          setAssignment(null);
          setLoading(false);
          return;
        }

        // If A/B testing not enabled, return default
        if (!campaign.ab_test_enabled || !(campaign.ab_variants as any[])?.length) {
          setAssignment({
            campaign_id: campaign.id,
            campaign_key: campaign.campaign_key,
            variant_key: 'default',
            variant: null,
            effective_bonus_rate: campaign.bonus_rate,
            isControl: true,
          });
          setLoading(false);
          return;
        }

        const variants = (campaign.ab_variants as unknown as CampaignVariant[]) || [];

        // Check for existing assignment
        const { data: existing } = await supabase
          .from('affiliate_campaign_variants')
          .select('variant_key')
          .eq('campaign_id', campaign.id)
          .eq('affiliate_id', affiliateId)
          .maybeSingle();

        let variantKey: string;
        let variant: CampaignVariant;

        if (existing) {
          // Use existing assignment
          variantKey = existing.variant_key;
          variant = variants.find(v => v.key === variantKey) || variants[0];
        } else {
          // Assign new variant
          variant = assignVariant(affiliateId, variants);
          variantKey = variant.key;

          // Store assignment
          await supabase
            .from('affiliate_campaign_variants')
            .insert({
              campaign_id: campaign.id,
              affiliate_id: affiliateId,
              variant_key: variantKey,
            });
        }

        setAssignment({
          campaign_id: campaign.id,
          campaign_key: campaign.campaign_key,
          variant_key: variantKey,
          variant,
          effective_bonus_rate: variant.bonus_rate,
          isControl: variantKey === 'control',
        });
      } catch (err: any) {
        console.error('[useCampaignVariant] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrAssignVariant();
  }, [affiliateId, campaignKey]);

  const trackConversion = useCallback(async (value: number) => {
    if (!assignment || !affiliateId) return;

    try {
      await supabase
        .from('affiliate_campaign_variants')
        .update({
          converted: true,
          converted_at: new Date().toISOString(),
          conversion_value: value,
        })
        .eq('campaign_id', assignment.campaign_id)
        .eq('affiliate_id', affiliateId);

      console.log(`[useCampaignVariant] Conversion tracked: ${assignment.variant_key} - $${value}`);
    } catch (err) {
      console.error('[useCampaignVariant] Error tracking conversion:', err);
    }
  }, [assignment, affiliateId]);

  return { assignment, loading, error, trackConversion };
}

/**
 * Hook to get A/B test results for admin reporting
 */
export function useCampaignTestResults(campaignId: string) {
  const [results, setResults] = useState<{
    variant_key: string;
    total_assigned: number;
    total_converted: number;
    conversion_rate: number;
    total_value: number;
    avg_value: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      if (!campaignId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('affiliate_campaign_variants')
          .select('variant_key, converted, conversion_value')
          .eq('campaign_id', campaignId);

        if (error) throw error;

        // Aggregate by variant
        const grouped: Record<string, {
          total_assigned: number;
          total_converted: number;
          total_value: number;
        }> = {};

        data?.forEach((row) => {
          if (!grouped[row.variant_key]) {
            grouped[row.variant_key] = { total_assigned: 0, total_converted: 0, total_value: 0 };
          }
          grouped[row.variant_key].total_assigned++;
          if (row.converted) {
            grouped[row.variant_key].total_converted++;
            grouped[row.variant_key].total_value += Number(row.conversion_value) || 0;
          }
        });

        const aggregated = Object.entries(grouped).map(([key, stats]) => ({
          variant_key: key,
          total_assigned: stats.total_assigned,
          total_converted: stats.total_converted,
          conversion_rate: stats.total_assigned > 0 
            ? (stats.total_converted / stats.total_assigned) * 100 
            : 0,
          total_value: stats.total_value,
          avg_value: stats.total_converted > 0 
            ? stats.total_value / stats.total_converted 
            : 0,
        }));

        setResults(aggregated);
      } catch (err) {
        console.error('[useCampaignTestResults] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [campaignId]);

  return { results, loading };
}

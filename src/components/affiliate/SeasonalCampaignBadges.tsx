/**
 * SeasonalCampaignBadges Component
 * 
 * Database-driven display of seasonal campaigns with boosted commissions.
 * Features:
 * - Fetches campaigns from affiliate_campaigns table
 * - Active campaign indicators
 * - Countdown timers
 * - Boosted commission rates
 * - Seasonal celebration badges
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, Snowflake, Sun, Leaf, Heart, Zap, Clock, Sparkles, Star, 
  Loader2, PartyPopper, Flame, Moon, CloudSun 
} from "lucide-react";
import { differenceInDays, differenceInHours, isPast, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Icon mapping from database icon_name to component
const ICON_MAP: Record<string, React.ElementType> = {
  Gift,
  Snowflake,
  Sun,
  Leaf,
  Heart,
  Zap,
  Sparkles,
  Star,
  PartyPopper,
  Flame,
  Moon,
  CloudSun,
};

interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  icon_color: string | null;
  bg_color: string | null;
  start_date: string;
  end_date: string;
  bonus_rate: number;
  eligible_tiers: string[] | null;
}

interface SeasonalCampaignBadgesProps {
  currentTierRate: number;
  currentTier?: string;
  className?: string;
}

function CampaignCountdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function updateCountdown() {
      const end = parseISO(endDate);
      const now = new Date();
      
      if (isPast(end)) {
        setTimeLeft('Ended');
        return;
      }

      const daysLeft = differenceInDays(end, now);
      const hoursLeft = differenceInHours(end, now) % 24;

      if (daysLeft > 0) {
        setTimeLeft(`${daysLeft}d ${hoursLeft}h left`);
      } else if (hoursLeft > 0) {
        setTimeLeft(`${hoursLeft}h left`);
      } else {
        setTimeLeft('Ending soon');
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{timeLeft}</span>
    </div>
  );
}

export function SeasonalCampaignBadges({ 
  currentTierRate, 
  currentTier = 'bronze',
  className 
}: SeasonalCampaignBadgesProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const { data, error } = await supabase
          .from('affiliate_campaigns')
          .select('*')
          .eq('is_active', true)
          .order('start_date', { ascending: true });

        if (error) throw error;
        setCampaigns(data || []);
      } catch (err) {
        console.error('[SeasonalCampaigns] Error fetching:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, []);

  if (loading) {
    return (
      <Card className={`border border-border/50 ${className}`}>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  
  // Filter campaigns based on date and tier eligibility
  const activeCampaigns = campaigns.filter(campaign => {
    const start = parseISO(campaign.start_date);
    const end = parseISO(campaign.end_date);
    const isInDateRange = now >= start && now <= end;
    const isEligible = !campaign.eligible_tiers || campaign.eligible_tiers.includes(currentTier);
    return isInDateRange && isEligible;
  });

  // Get upcoming campaigns (next 30 days)
  const upcomingCampaigns = campaigns.filter(campaign => {
    const start = parseISO(campaign.start_date);
    const daysUntilStart = differenceInDays(start, now);
    const isEligible = !campaign.eligible_tiers || campaign.eligible_tiers.includes(currentTier);
    return daysUntilStart > 0 && daysUntilStart <= 30 && isEligible;
  }).slice(0, 2);

  if (activeCampaigns.length === 0 && upcomingCampaigns.length === 0) {
    return null;
  }

  return (
    <Card className={`border border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Zap className="h-5 w-5 text-amber-500" />
          Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Campaigns */}
        {activeCampaigns.map(campaign => {
          const CampaignIcon = ICON_MAP[campaign.icon_name || 'Sparkles'] || Sparkles;
          const iconColor = campaign.icon_color || 'text-purple-500';
          const bgColor = campaign.bg_color || 'bg-purple-50';
          const boostedRate = currentTierRate + Number(campaign.bonus_rate);
          
          return (
            <div 
              key={campaign.id}
              className={`p-4 rounded-xl ${bgColor} border border-border/30`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <CampaignIcon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{campaign.name}</span>
                    <Badge variant="secondary" className="text-[10px] bg-white/80">
                      ACTIVE
                    </Badge>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">
                        +{campaign.bonus_rate}% bonus = {boostedRate}% total
                      </span>
                    </div>
                    <CampaignCountdown endDate={campaign.end_date} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Upcoming Campaigns */}
        {upcomingCampaigns.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Coming Soon
            </p>
            <div className="space-y-2">
              {upcomingCampaigns.map(campaign => {
                const CampaignIcon = ICON_MAP[campaign.icon_name || 'Sparkles'] || Sparkles;
                const iconColor = campaign.icon_color || 'text-purple-500';
                const bgColor = campaign.bg_color || 'bg-purple-50';
                const daysUntil = differenceInDays(parseISO(campaign.start_date), now);
                
                return (
                  <div 
                    key={campaign.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}>
                      <CampaignIcon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{campaign.name}</span>
                      <p className="text-xs text-muted-foreground">
                        +{campaign.bonus_rate}% bonus • Starts in {daysUntil} days
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SeasonalCampaignBadges;

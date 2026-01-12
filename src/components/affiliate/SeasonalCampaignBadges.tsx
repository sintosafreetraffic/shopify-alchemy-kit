/**
 * SeasonalCampaignBadges Component
 * 
 * Displays limited-time campaign badges and boosted commission periods.
 * Features:
 * - Active campaign indicators
 * - Countdown timers
 * - Boosted commission rates
 * - Seasonal celebration badges
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gift, Snowflake, Sun, Leaf, Heart, Zap, Clock, Sparkles, Star } from "lucide-react";
import { differenceInDays, differenceInHours, format, isPast, parseISO } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  description: string;
  Icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  startDate: string;
  endDate: string;
  bonusRate: number; // Additional % on top of tier rate
  isActive: boolean;
}

interface SeasonalCampaignBadgesProps {
  currentTierRate: number;
  className?: string;
}

// Define active campaigns (in production, these would come from database)
const CAMPAIGNS: Campaign[] = [
  {
    id: 'new_year_2026',
    name: 'New Year Boost',
    description: 'Celebrate the new year with boosted commissions',
    Icon: Sparkles,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50',
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-01-31T23:59:59Z',
    bonusRate: 5,
    isActive: true,
  },
  {
    id: 'valentines_2026',
    name: "Valentine's Special",
    description: 'Share the love of better sleep',
    Icon: Heart,
    iconColor: 'text-rose-500',
    bgColor: 'bg-rose-50',
    startDate: '2026-02-01T00:00:00Z',
    endDate: '2026-02-14T23:59:59Z',
    bonusRate: 10,
    isActive: false,
  },
  {
    id: 'spring_sleep',
    name: 'Spring Renewal',
    description: 'Fresh season, fresh sleep habits',
    Icon: Leaf,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    startDate: '2026-03-20T00:00:00Z',
    endDate: '2026-04-20T23:59:59Z',
    bonusRate: 5,
    isActive: false,
  },
  {
    id: 'summer_nights',
    name: 'Summer Nights',
    description: 'Cool sleep during hot nights',
    Icon: Sun,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    startDate: '2026-06-01T00:00:00Z',
    endDate: '2026-08-31T23:59:59Z',
    bonusRate: 5,
    isActive: false,
  },
  {
    id: 'holiday_2026',
    name: 'Holiday Season',
    description: 'Give the gift of better sleep',
    Icon: Gift,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    startDate: '2026-11-15T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    bonusRate: 15,
    isActive: false,
  },
];

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
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{timeLeft}</span>
    </div>
  );
}

export function SeasonalCampaignBadges({ currentTierRate, className }: SeasonalCampaignBadgesProps) {
  // Filter to only active campaigns (based on current date)
  const now = new Date();
  const activeCampaigns = CAMPAIGNS.filter(campaign => {
    const start = parseISO(campaign.startDate);
    const end = parseISO(campaign.endDate);
    return now >= start && now <= end;
  });

  // Get upcoming campaigns (next 30 days)
  const upcomingCampaigns = CAMPAIGNS.filter(campaign => {
    const start = parseISO(campaign.startDate);
    const daysUntilStart = differenceInDays(start, now);
    return daysUntilStart > 0 && daysUntilStart <= 30;
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
          const CampaignIcon = campaign.Icon;
          const boostedRate = currentTierRate + campaign.bonusRate;
          
          return (
            <div 
              key={campaign.id}
              className={`p-4 rounded-xl ${campaign.bgColor} border border-border/30`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm`}>
                  <CampaignIcon className={`h-5 w-5 ${campaign.iconColor}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{campaign.name}</span>
                    <Badge variant="secondary" className="text-[10px] bg-white/80">
                      ACTIVE
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {campaign.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">
                        +{campaign.bonusRate}% bonus = {boostedRate}% total
                      </span>
                    </div>
                    <CampaignCountdown endDate={campaign.endDate} />
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
                const CampaignIcon = campaign.Icon;
                const daysUntil = differenceInDays(parseISO(campaign.startDate), now);
                
                return (
                  <div 
                    key={campaign.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <div className={`w-8 h-8 rounded-full ${campaign.bgColor} flex items-center justify-center`}>
                      <CampaignIcon className={`h-4 w-4 ${campaign.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{campaign.name}</span>
                      <p className="text-xs text-muted-foreground">
                        +{campaign.bonusRate}% bonus • Starts in {daysUntil} days
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

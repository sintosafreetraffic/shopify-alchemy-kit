/**
 * ActivityStreak Component
 * 
 * Displays the affiliate's current sales streak:
 * - Consecutive days with at least one sale
 * - Visual flame indicator with intensity
 * - Milestone celebrations
 * - Streak record tracking
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, startOfDay, isSameDay } from "date-fns";

interface ActivityStreakProps {
  affiliateId: string;
  className?: string;
}

interface StreakMilestone {
  days: number;
  label: string;
  emoji: string;
}

const MILESTONES: StreakMilestone[] = [
  { days: 3, label: "Warming Up", emoji: "🔥" },
  { days: 7, label: "On Fire", emoji: "⚡" },
  { days: 14, label: "Blazing", emoji: "🚀" },
  { days: 30, label: "Unstoppable", emoji: "👑" },
];

export function ActivityStreak({ affiliateId, className }: ActivityStreakProps) {
  const [streakDays, setStreakDays] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!affiliateId) return;
    
    async function calculateStreak() {
      try {
        // Fetch commissions for the last 60 days
        const sixtyDaysAgo = subDays(new Date(), 60).toISOString();
        
        const { data: commissions, error } = await supabase
          .from('commissions')
          .select('created_at')
          .eq('affiliate_id', affiliateId)
          .eq('level', 1) // Only direct sales count
          .eq('fraud_flag', false)
          .gte('created_at', sixtyDaysAgo)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!commissions || commissions.length === 0) {
          setStreakDays(0);
          setBestStreak(0);
          setLoading(false);
          return;
        }

        // Get unique dates with sales
        const saleDates = new Set<string>();
        commissions.forEach(c => {
          const date = format(parseISO(c.created_at), 'yyyy-MM-dd');
          saleDates.add(date);
        });

        // Calculate current streak
        let currentStreak = 0;
        let checkDate = startOfDay(new Date());
        
        // Check if today has a sale, if not start from yesterday
        const todayStr = format(checkDate, 'yyyy-MM-dd');
        if (!saleDates.has(todayStr)) {
          checkDate = subDays(checkDate, 1);
        }

        // Count consecutive days
        while (true) {
          const dateStr = format(checkDate, 'yyyy-MM-dd');
          if (saleDates.has(dateStr)) {
            currentStreak++;
            checkDate = subDays(checkDate, 1);
          } else {
            break;
          }
        }

        // Calculate best streak (simplified - just use current for now)
        // In production, this would be stored in the database
        const best = Math.max(currentStreak, 0);

        setStreakDays(currentStreak);
        setBestStreak(best);
        setLoading(false);
      } catch (error) {
        console.error('[ActivityStreak] Error:', error);
        setLoading(false);
      }
    }

    calculateStreak();
  }, [affiliateId]);

  if (loading) {
    return null;
  }

  // Find current and next milestone
  const currentMilestone = MILESTONES.filter(m => streakDays >= m.days).pop();
  const nextMilestone = MILESTONES.find(m => streakDays < m.days);
  const progressToNext = nextMilestone 
    ? ((streakDays - (currentMilestone?.days || 0)) / (nextMilestone.days - (currentMilestone?.days || 0))) * 100
    : 100;

  // Don't show if no streak
  if (streakDays === 0) {
    return null;
  }

  // Flame intensity based on streak length
  const flameIntensity = 
    streakDays >= 14 ? 'text-orange-500 animate-pulse' :
    streakDays >= 7 ? 'text-orange-400' :
    streakDays >= 3 ? 'text-amber-500' : 'text-yellow-500';

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Flame icon with glow effect */}
          <div className="relative">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center`}>
              <Flame className={`h-6 w-6 ${flameIntensity}`} />
            </div>
            {streakDays >= 7 && (
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold">{streakDays}</span>
              <span className="text-sm text-muted-foreground">day streak</span>
              {currentMilestone && (
                <span className="text-sm">{currentMilestone.emoji}</span>
              )}
            </div>

            {nextMilestone && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{nextMilestone.days - streakDays} days to "{nextMilestone.label}"</span>
                  <span>{nextMilestone.emoji}</span>
                </div>
                <Progress value={progressToNext} className="h-1.5" />
              </div>
            )}

            {!nextMilestone && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Trophy className="h-3 w-3" />
                <span>Maximum streak achieved!</span>
              </div>
            )}
          </div>
        </div>

        {/* Best streak indicator */}
        {bestStreak > 0 && bestStreak > streakDays && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>Personal best</span>
            <span className="font-medium">{bestStreak} days</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityStreak;

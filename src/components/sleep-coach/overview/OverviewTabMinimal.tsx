/**
 * OverviewTabMinimal - Redesigned Overview tab with Scandinavian aesthetics
 * 
 * A narrative dashboard that guides users through:
 * - Who they are (persona)
 * - What matters most (modules)
 * - Their biggest opportunity (scores)
 * - Coach's direction this week
 * - Long-term progression markers
 * 
 * Design: Apple Health × Scandinavian Spa × Behavioral Science
 */

import { type SleepProfile, type SleepLog } from "@/hooks/useSleepApi";
import { type PersonaCluster } from "@/components/sleep-quiz/QuizTypes";

import { SleepDirectionHero } from "./SleepDirectionHero";
import { PersonaBlockMinimal } from "./PersonaBlockMinimal";
import { ModuleHighlight } from "./ModuleHighlight";
import { ScoreInsights } from "./ScoreInsights";
import { SleepProfileMinimal } from "./SleepProfileMinimal";
import { SleepTrendsMinimal } from "./SleepTrendsMinimal";
import { LoggingStreakMinimal } from "./LoggingStreakMinimal";
import { DiscoverPersonaCTA } from "./DiscoverPersonaCTA";

interface TrendData {
  avgSleepQuality: number;
  avgPain: number;
  goodNights: number;
  poorNights: number;
  hotNights: number;
  stressedNights: number;
  trend: 'improving' | 'worsening' | 'stable';
}

interface OverviewTabMinimalProps {
  profile: SleepProfile | null;
  logs: SleepLog[];
  trends: TrendData;
  streak: number;
  onUpdateAssessment?: () => void;
}

export function OverviewTabMinimal({
  profile,
  logs,
  trends,
  streak,
  onUpdateAssessment,
}: OverviewTabMinimalProps) {
  // No profile yet - show discover CTA
  if (!profile) {
    return (
      <div className="space-y-8">
        <DiscoverPersonaCTA />
      </div>
    );
  }

  // Extract persona data from profile
  const profilePersona = (profile as any)?.persona_cluster as PersonaCluster | undefined;
  const assessmentPersona = (profile.sleep_assessment as any)?.persona?.cluster as PersonaCluster | undefined;
  const cluster = profilePersona || assessmentPersona;
  
  // No persona - show discover CTA
  if (!cluster) {
    return (
      <div className="space-y-8">
        <DiscoverPersonaCTA />
      </div>
    );
  }

  // Extract assessment data
  const assessment = profile.sleep_assessment as any;
  const personaLabel = (profile as any)?.persona_label || assessment?.persona?.label;
  const personaDescription = assessment?.persona?.description;
  const personaRationale = (profile as any)?.persona_rationale || assessment?.persona?.rationale;
  const recommendedModules = (profile as any)?.persona_recommended_modules || assessment?.persona?.recommended_modules || [];
  const topRiskDrivers = assessment?.top_risk_drivers || [];
  const scores = assessment?.scores;

  return (
    <div 
      className="space-y-7 pb-8"
      style={{ maxWidth: '720px', margin: '0 auto' }}
    >
      {/* SECTION 1: Sleep Direction Hero */}
      <SleepDirectionHero
        personaCluster={cluster}
        personaLabel={personaLabel}
        recommendedModules={recommendedModules}
        topRiskDrivers={topRiskDrivers}
      />

      {/* SECTION 2: Persona Block */}
      <PersonaBlockMinimal
        cluster={cluster}
        label={personaLabel}
        description={personaDescription}
        rationale={personaRationale}
        topRiskDrivers={topRiskDrivers}
      />

      {/* SECTION 3: Module Highlight */}
      {recommendedModules.length > 0 && (
        <ModuleHighlight
          recommendedModules={recommendedModules}
          personaLabel={personaLabel}
        />
      )}

      {/* SECTION 4: Score Insights */}
      {scores && (
        <ScoreInsights scores={scores} />
      )}

      {/* SECTION 5: Sleep Profile */}
      <SleepProfileMinimal
        position={profile.sleep_position}
        temperature={profile.temperature_preference || undefined}
        stress={profile.stress_level || undefined}
        wakeCondition={profile.wake_up_condition || undefined}
        painPoints={profile.pain_points || []}
        onUpdateAssessment={onUpdateAssessment}
      />

      {/* SECTION 6: Sleep Trends */}
      <SleepTrendsMinimal
        trends={trends}
        logsCount={logs.length}
      />

      {/* SECTION 7: Logging Streak */}
      <LoggingStreakMinimal
        streak={streak}
        totalLogs={logs.length}
      />
    </div>
  );
}

/**
 * PlanHero - Premium hero block for adaptive sleep plan
 * 
 * Scandinavian calm + science-backed sleep performance
 * Shows plan headline, spine score, phase, and weekly focus
 */

import { useMemo } from "react";

interface PlanHeroProps {
  planHeadline?: string;
  weekFocus?: string;
  spineScore?: number;
  spineScoreHint?: string;
  phase?: "foundation" | "stabilization" | "optimization" | "resilience";
  weekNumber?: number;
  adaptiveSummary?: string;
}

const PHASE_CONFIG: Record<string, { label: string; description: string }> = {
  foundation: { label: "Foundation", description: "Building core sleep habits through gentle, consistent micro-adjustments" },
  stabilization: { label: "Stabilization", description: "Reinforcing patterns to support lasting sleep improvements" },
  optimization: { label: "Optimization", description: "Fine-tuning your environment and routines for deeper rest" },
  resilience: { label: "Resilience", description: "Maintaining long-term gains and adapting to life changes" },
};

// Score color using brand blue scale (no traffic-light colors)
function getScoreColor(score: number): string {
  if (score >= 70) return "rgba(60, 131, 246, 0.9)"; // Strong brand blue
  if (score >= 50) return "rgba(60, 131, 246, 0.7)"; // Medium brand blue
  return "rgba(167, 180, 194, 0.85)"; // Dusty blue for lower scores
}

export function PlanHero({
  planHeadline,
  weekFocus,
  spineScore,
  spineScoreHint,
  phase = "foundation",
  weekNumber = 1,
  adaptiveSummary,
}: PlanHeroProps) {
  const phaseInfo = PHASE_CONFIG[phase] || PHASE_CONFIG.foundation;
  const scoreColor = useMemo(() => spineScore !== undefined ? getScoreColor(spineScore) : "#A7B4C2", [spineScore]);

  return (
    <section 
      className="relative overflow-hidden rounded-3xl"
      style={{ backgroundColor: '#F7F7F6' }}
    >
      {/* Cervical curve / spine illustration - subtle background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='520' height='320' viewBox='0 0 520 320' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 200 C100 140 180 110 280 130 Q380 150 440 120 C500 90 520 110 520 150' fill='none' stroke='%238E98A3' stroke-width='1.5' opacity='0.06'/%3E%3Cpath d='M80 240 Q160 170 260 195 T400 165 T520 200' fill='none' stroke='%238E98A3' stroke-width='1' opacity='0.05'/%3E%3Cellipse cx='320' cy='200' rx='140' ry='50' fill='none' stroke='%238E98A3' stroke-width='0.75' opacity='0.04'/%3E%3Cpath d='M0 280 Q100 240 200 255 T360 235 T520 260' fill='none' stroke='%238E98A3' stroke-width='0.5' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize: '520px 320px',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      <div className="relative px-8 py-10 md:px-12 md:py-14">
        {/* Eyebrow */}
        <p 
          className="text-xs font-semibold tracking-widest uppercase mb-4"
          style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
        >
          Your 7-Night Sleep Plan
        </p>
        
        {/* Main headline */}
        <h1 
          className="text-2xl md:text-3xl leading-snug mb-6 max-w-2xl"
          style={{ color: '#2D2B29', fontWeight: 500, lineHeight: 1.35 }}
        >
          {planHeadline || "Your personalized plan supports better rest"}
        </h1>

        {/* Phase + Score row */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Phase badge */}
          <div 
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
            style={{ 
              backgroundColor: 'rgba(167, 180, 194, 0.12)',
              border: '1px solid rgba(167, 180, 194, 0.2)',
            }}
          >
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'rgba(60, 131, 246, 0.7)' }}
            />
            <span 
              className="text-sm font-medium"
              style={{ color: '#3D3B38' }}
            >
              {phaseInfo.label}
            </span>
            <span 
              className="text-xs"
              style={{ color: '#6F6A66' }}
            >
              Week {weekNumber}
            </span>
          </div>

          {/* Spine score badge */}
          {spineScore !== undefined && (
            <div 
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(167, 180, 194, 0.2)',
              }}
            >
              {/* Score circle */}
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ 
                  backgroundColor: scoreColor,
                  color: '#FFFFFF',
                }}
              >
                {spineScore}
              </div>
              <span 
                className="text-sm"
                style={{ color: '#3D3B38' }}
              >
                Spine Score
              </span>
            </div>
          )}
        </div>
        
        {/* Phase description */}
        <p 
          className="text-sm mb-5"
          style={{ color: '#6F6A66' }}
        >
          {phaseInfo.description}
        </p>

        {/* Week focus */}
        {weekFocus && (
          <p 
            className="text-base md:text-lg leading-relaxed max-w-xl mb-4"
            style={{ color: '#2D2B29', lineHeight: 1.6, fontWeight: 450 }}
          >
            {weekFocus}
          </p>
        )}

        {/* Spine score hint */}
        {spineScoreHint && (
          <p 
            className="text-sm leading-relaxed max-w-lg"
            style={{ color: '#6F6A66', lineHeight: 1.55 }}
          >
            {spineScoreHint}
          </p>
        )}

        {/* Adaptive summary - "Adjusted this week based on..." */}
        {adaptiveSummary && (
          <div 
            className="mt-6 pt-5 border-t"
            style={{ borderColor: 'rgba(167, 180, 194, 0.2)' }}
          >
            <p 
              className="text-xs leading-relaxed"
              style={{ color: '#A7A29C', lineHeight: 1.55 }}
            >
              {adaptiveSummary}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

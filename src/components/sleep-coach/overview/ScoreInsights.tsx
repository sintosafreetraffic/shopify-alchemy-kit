/**
 * ScoreInsights - Interpretive score display with warm neutrals
 * 
 * Premium scientific framing with subtle diagram illustration
 * Brand blue (#3C83F6) at 85% opacity for primary progress
 * "Your Biggest Opportunity" with strong visual hierarchy
 */

import { useMemo } from "react";

interface ScoreInsightsProps {
  scores?: {
    alignment_risk_score?: number;
    sleep_stability_score?: number;
    environment_score?: number;
    neck_support_score?: number;
    [key: string]: number | undefined;
  };
}

interface OpportunityArea {
  key: string;
  label: string;
  score: number;       // normalized 0-100 where higher is better
  description: string;
  insight: string;
}

const SCORE_CONFIGS: Record<string, { label: string; description: string; insight: string; invert?: boolean }> = {
  alignment_risk_score: {
    label: "Alignment",
    description: "Spinal and cervical positioning",
    insight: "Focus on pillow height and sleeping posture",
    invert: true, // Lower risk = higher opportunity score
  },
  sleep_stability_score: {
    label: "Sleep Stability",
    description: "Continuity through the night",
    insight: "Reduce factors causing fragmented sleep",
  },
  environment_score: {
    label: "Environment",
    description: "Light, temperature, and comfort",
    insight: "Optimize your sleep environment conditions",
  },
  neck_support_score: {
    label: "Neck Support",
    description: "Cervical spine alignment",
    insight: "Improve neck positioning during sleep",
  },
};

export function ScoreInsights({ scores }: ScoreInsightsProps) {
  // Calculate opportunity areas
  const opportunities = useMemo(() => {
    if (!scores) return [];

    const areas: OpportunityArea[] = [];
    
    Object.entries(SCORE_CONFIGS).forEach(([key, config]) => {
      const rawScore = scores[key];
      if (rawScore === undefined) return;
      
      // Normalize: for inverted scores, higher raw = lower opportunity
      const normalizedScore = config.invert ? (100 - rawScore) : rawScore;
      
      areas.push({
        key,
        label: config.label,
        score: normalizedScore,
        description: config.description,
        insight: config.insight,
      });
    });

    // Sort by score (lowest = biggest opportunity)
    return areas.sort((a, b) => a.score - b.score);
  }, [scores]);

  if (opportunities.length === 0) return null;

  const primary = opportunities[0];
  const secondary = opportunities.slice(1, 3);

  // Get color based on score - muted natural Scandinavian colors
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#7CB99D'; // soft sage green
    if (score >= 45) return '#E8B86D'; // soft warm amber
    return '#D4A5A5';                  // soft dusty rose
  };

  return (
    <section className="space-y-6">
      {/* Section header with subtle abstract curve */}
      <div className="flex items-center justify-between px-1">
        <p 
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#A7B4C2', letterSpacing: '0.12em' }}
        >
          Sleep Insights
        </p>
        {/* Abstract performance curve */}
        <svg width="60" height="20" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.6 }}>
          <path d="M2 17C11 8 22 5 30 10C38 15 50 12 58 3" stroke="#8E98A3" strokeWidth="1.25" strokeLinecap="round" fill="none" opacity="0.7"/>
        </svg>
      </div>

      {/* Primary opportunity - strong visual hierarchy */}
      <div
        className="relative rounded-3xl p-8 md:p-10 overflow-hidden"
        style={{
          backgroundColor: '#FAFAF8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Subtle airflow contour illustration - 5% opacity */}
        <div 
          className="absolute top-0 right-0 w-56 h-40 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='220' height='160' viewBox='0 0 220 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 100 Q60 50 110 70 T210 50' fill='none' stroke='%238E98A3' stroke-width='0.75' opacity='0.06'/%3E%3Cpath d='M20 120 Q70 70 120 90 T220 70' fill='none' stroke='%238E98A3' stroke-width='0.5' opacity='0.05'/%3E%3Cpath d='M30 140 Q80 90 130 110 T230 90' fill='none' stroke='%238E98A3' stroke-width='0.4' opacity='0.04'/%3E%3C/svg%3E")`,
            backgroundSize: 'contain',
            backgroundPosition: 'top right',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        <div className="relative mb-7">
          <p 
            className="text-sm font-semibold mb-2"
            style={{ color: 'rgba(60, 131, 246, 0.75)' }}
          >
            Your Biggest Opportunity
          </p>
          <h4 
            className="text-2xl font-semibold tracking-tight"
            style={{ color: '#2D2B29' }}
          >
            {primary.label}
          </h4>
        </div>

        {/* Progress bar - thicker, brand blue at 85% opacity */}
        <div className="relative mb-6">
          <div 
            className="h-3.5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#E6E4DE' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ 
                width: `${primary.score}%`,
                backgroundColor: 'rgba(60, 131, 246, 0.85)',
              }}
            />
          </div>
          <div className="flex justify-between mt-3">
            <span 
              className="text-sm"
              style={{ color: '#6F6A66' }}
            >
              {primary.description}
            </span>
            <span 
              className="text-sm font-semibold"
              style={{ color: '#2D2B29' }}
            >
              {primary.score}%
            </span>
          </div>
        </div>

        {/* Insight */}
        <p 
          className="text-base leading-relaxed"
          style={{ color: '#4A4844', lineHeight: 1.6 }}
        >
          {primary.insight}
        </p>
      </div>

      {/* Secondary indicators - smaller, subtler */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {secondary.map((area) => (
            <div
              key={area.key}
              className="rounded-2xl px-6 py-5"
              style={{
                backgroundColor: '#FAFAF8',
              }}
            >
              <p 
                className="text-sm font-medium mb-3"
                style={{ color: '#2D2B29' }}
              >
                {area.label}
              </p>
              <div className="flex items-center gap-3">
                <div 
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: '#E6E4DE' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ 
                      width: `${area.score}%`,
                      backgroundColor: getScoreColor(area.score),
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span 
                  className="text-xs font-medium"
                  style={{ color: '#A7A29C' }}
                >
                  {area.score}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

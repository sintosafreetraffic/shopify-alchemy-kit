/**
 * ModuleHighlight - Featured module card with secondary modules
 * 
 * Highlights the coach's priority module with Scandinavian minimalism
 */

import { MODULE_DEFINITIONS } from "@/components/sleep-quiz/QuizTypes";

interface ModuleHighlightProps {
  recommendedModules?: number[];
  personaLabel?: string;
}

// Module relevance explanations
const MODULE_WHY: Record<number, string> = {
  4: "Supports better neck and spine positioning during sleep",
  6: "Helps create optimal conditions for uninterrupted rest",
  7: "Reduces night waking from temperature discomfort",
  8: "Enhances the restorative phases of your sleep cycle",
  9: "Prepares your nervous system for quality sleep onset",
  10: "Releases overnight tension for easier mornings",
  11: "Improves side-sleeping comfort and hip alignment",
  12: "Builds consistent habits that compound over time",
};

// Monoline module icons
const ModuleIcon = ({ moduleId }: { moduleId: number }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="#A7B4C2" strokeWidth="1.5" fill="none"/>
    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#A7B4C2" fontWeight="500">
      {moduleId}
    </text>
  </svg>
);

export function ModuleHighlight({
  recommendedModules = [],
  personaLabel,
}: ModuleHighlightProps) {
  if (recommendedModules.length === 0) return null;

  const primaryModuleId = recommendedModules[0];
  const primaryModule = MODULE_DEFINITIONS[primaryModuleId];
  const secondaryModules = recommendedModules.slice(1, 4);

  if (!primaryModule) return null;

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="px-1">
        <p 
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: '#A7B4C2' }}
        >
          Your Coach's Priority
        </p>
      </div>

      {/* Primary featured module */}
      <div
        className="rounded-2xl p-6 md:p-7"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)',
        }}
      >
        <div className="flex items-start gap-4">
          {/* Module icon */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#F0F4F8' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#A7B4C2" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div className="flex-1">
            <h4 
              className="text-lg font-medium mb-1"
              style={{ color: '#2D3436' }}
            >
              {primaryModule.name}
            </h4>
            <p 
              className="text-sm mb-3"
              style={{ color: '#636E72' }}
            >
              {primaryModule.description}
            </p>
            <p 
              className="text-sm leading-relaxed"
              style={{ color: '#4A5568' }}
            >
              <span style={{ color: '#A7B4C2', fontWeight: 500 }}>Why this matters: </span>
              {MODULE_WHY[primaryModuleId] || "Selected based on your assessment results."}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary modules */}
      {secondaryModules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {secondaryModules.map((moduleId) => {
            const module = MODULE_DEFINITIONS[moduleId];
            if (!module) return null;
            
            return (
              <div
                key={moduleId}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: '#FAFAF9',
                  border: '1px solid #E6E6E4',
                }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium"
                  style={{ 
                    backgroundColor: '#F0F4F8',
                    color: '#A7B4C2',
                  }}
                >
                  {moduleId}
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-sm font-medium truncate"
                    style={{ color: '#2D3436' }}
                  >
                    {module.name}
                  </p>
                  <p 
                    className="text-xs truncate"
                    style={{ color: '#636E72' }}
                  >
                    {module.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

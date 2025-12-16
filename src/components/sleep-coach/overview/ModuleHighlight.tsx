/**
 * ModuleHighlight - Featured module card with secondary modules
 * 
 * Premium Scandinavian minimalism with scientific framing
 * Star + soft amber accent for primary module
 * Brand blue (#3C83F6) for section label
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
    <section className="space-y-6">
      {/* Section header - brand blue accent */}
      <div className="px-1">
        <p 
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(60, 131, 246, 0.7)', letterSpacing: '0.12em' }}
        >
          Your Coach's Priority
        </p>
      </div>

      {/* Primary featured module with amber accent */}
      <div
        className="relative rounded-3xl p-8 md:p-10 overflow-hidden"
        style={{
          backgroundColor: '#FAFAF8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Soft amber accent line at top */}
        <div 
          className="absolute top-0 left-8 right-8 h-[3px] rounded-full"
          style={{ backgroundColor: 'rgba(232, 184, 109, 0.5)' }}
        />
        
        <div className="flex items-start gap-5">
          {/* Module icon - star with amber tint */}
          <div
            className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(232, 184, 109, 0.12)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2L17.5 9.5L26 10.5L20 16L21.5 24.5L14 20.5L6.5 24.5L8 16L2 10.5L10.5 9.5L14 2Z" stroke="#E8B86D" strokeWidth="1.25" fill="none" strokeLinejoin="round" opacity="0.85"/>
            </svg>
          </div>
          
          <div className="flex-1">
            <h4 
              className="text-xl font-semibold mb-2 tracking-tight"
              style={{ color: '#2D2B29' }}
            >
              {primaryModule.name}
            </h4>
            <p 
              className="text-sm mb-5"
              style={{ color: '#6F6A66', lineHeight: 1.55 }}
            >
              {primaryModule.description}
            </p>
            <p 
              className="text-sm leading-relaxed"
              style={{ color: '#4A4844', lineHeight: 1.6 }}
            >
              <span style={{ color: 'rgba(60, 131, 246, 0.7)', fontWeight: 600 }}>Why this matters: </span>
              {MODULE_WHY[primaryModuleId] || "Selected based on your assessment results."}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary modules - reduced visual density */}
      {secondaryModules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {secondaryModules.map((moduleId) => {
            const module = MODULE_DEFINITIONS[moduleId];
            if (!module) return null;
            
            return (
              <div
                key={moduleId}
                className="flex items-center gap-4 rounded-2xl px-5 py-4"
                style={{
                  backgroundColor: '#FAFAF8',
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold"
                  style={{ 
                    backgroundColor: '#F4F3F1',
                    color: '#8E98A3',
                  }}
                >
                  {moduleId}
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-sm font-medium truncate"
                    style={{ color: '#2D2B29' }}
                  >
                    {module.name}
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

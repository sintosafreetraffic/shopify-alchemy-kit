/**
 * SleepDirectionHero - Calm hero block for sleep direction today
 * 
 * Premium Scandinavian wellness with warm scientific framing
 * Subtle cervical alignment illustration at 5-7% opacity
 */

import { type PersonaCluster, PERSONA_DEFINITIONS, MODULE_DEFINITIONS, CORE_NEED_MAP } from "@/components/sleep-quiz/QuizTypes";

interface SleepDirectionHeroProps {
  personaCluster?: PersonaCluster;
  personaLabel?: string;
  recommendedModules?: number[];
  topRiskDrivers?: string[];
}

// Map risk drivers to readable insights
const RISK_DRIVER_LABELS: Record<string, string> = {
  neck_tension: "cervical tension",
  shoulder_pain: "shoulder discomfort",
  back_pain: "spinal alignment",
  hip_pain: "hip positioning",
  inadequate_pillow_support: "pillow support",
  poor_sleep_environment: "sleep environment",
  temperature_disruption: "temperature regulation",
  light_sensitivity: "light exposure",
  stress_activation: "nervous system activation",
  sleep_inconsistency: "sleep timing",
  frequent_waking: "sleep fragmentation",
  poor_recovery: "recovery quality",
};

export function SleepDirectionHero({
  personaCluster,
  personaLabel,
  recommendedModules = [],
  topRiskDrivers = [],
}: SleepDirectionHeroProps) {
  // Get first module as weekly focus
  const primaryModuleId = recommendedModules[0];
  const primaryModule = primaryModuleId ? MODULE_DEFINITIONS[primaryModuleId] : null;
  
  // Get core influence from persona
  const coreInfluence = personaCluster ? CORE_NEED_MAP[personaCluster] : null;
  
  // Format readable risk drivers (first 2)
  const readableDrivers = topRiskDrivers
    .slice(0, 2)
    .map(d => RISK_DRIVER_LABELS[d] || d.replace(/_/g, ' '))
    .join(' and ');

  // Build insight sentence
  const insightText = coreInfluence 
    ? `Based on your assessment, your sleep is most influenced by ${coreInfluence}${readableDrivers ? ` — specifically ${readableDrivers}` : ''}.`
    : "Your personalized sleep direction is being shaped by your assessment results.";
  
  const focusText = primaryModule
    ? `This week, your coach will focus on ${primaryModule.name.toLowerCase()}.`
    : "Your focus areas will be tailored as you continue logging.";

  return (
    <section 
      className="relative overflow-hidden rounded-2xl"
      style={{ backgroundColor: '#FAFAF8' }}
    >
      {/* Cervical alignment / spine curve illustration - 6% opacity */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='420' height='220' viewBox='0 0 420 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 130 C85 105 130 92 180 98 Q230 104 280 92 C330 80 375 88 400 108' fill='none' stroke='%238E98A3' stroke-width='1.25' opacity='0.06'/%3E%3Cpath d='M60 155 Q110 120 165 128 T260 115 T355 130 T410 150' fill='none' stroke='%238E98A3' stroke-width='1' opacity='0.05'/%3E%3Cellipse cx='220' cy='145' rx='90' ry='28' fill='none' stroke='%238E98A3' stroke-width='0.75' opacity='0.04'/%3E%3Cpath d='M140 170 Q180 155 220 160 T300 155 T360 165' fill='none' stroke='%238E98A3' stroke-width='0.5' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize: '420px 220px',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      <div className="relative px-7 py-9 md:px-10 md:py-11">
        {/* Eyebrow label */}
        <p 
          className="text-xs font-medium tracking-wider uppercase mb-5"
          style={{ color: '#A7B4C2', letterSpacing: '0.08em' }}
        >
          Your Sleep Direction Today
        </p>
        
        {/* Main insight - warm charcoal */}
        <p 
          className="text-lg md:text-xl leading-relaxed mb-4 max-w-xl"
          style={{ color: '#2D2B29', fontWeight: 400, lineHeight: 1.6 }}
        >
          {insightText}
        </p>
        
        {/* Weekly focus - warm taupe */}
        <p 
          className="text-base leading-relaxed"
          style={{ color: '#6F6A66', lineHeight: 1.55 }}
        >
          {focusText}
        </p>
      </div>
    </section>
  );
}

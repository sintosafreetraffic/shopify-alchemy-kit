/**
 * SleepDirectionHero - Calm hero block for sleep direction today
 * 
 * Premium Scandinavian wellness with warm scientific framing
 * Brand blue (#3C83F6) at 60% opacity for eyebrow label
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
      className="relative overflow-hidden rounded-3xl"
      style={{ backgroundColor: '#F7F7F6' }}
    >
      {/* Cervical alignment / spine curve illustration - 6% opacity */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='480' height='280' viewBox='0 0 480 280' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 180 C90 130 160 105 240 120 Q320 135 380 110 C440 85 470 100 480 130' fill='none' stroke='%238E98A3' stroke-width='1.5' opacity='0.06'/%3E%3Cpath d='M60 210 Q130 150 210 170 T340 145 T450 180' fill='none' stroke='%238E98A3' stroke-width='1' opacity='0.05'/%3E%3Cellipse cx='280' cy='180' rx='120' ry='40' fill='none' stroke='%238E98A3' stroke-width='0.75' opacity='0.04'/%3E%3Cpath d='M150 230 Q220 200 280 210 T400 195 T480 220' fill='none' stroke='%238E98A3' stroke-width='0.5' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize: '480px 280px',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      <div className="relative px-8 py-12 md:px-12 md:py-14">
        {/* Eyebrow label - brand blue at 60% opacity */}
        <p 
          className="text-xs font-semibold tracking-widest uppercase mb-6"
          style={{ color: 'rgba(60, 131, 246, 0.6)', letterSpacing: '0.12em' }}
        >
          Your Sleep Direction Today
        </p>
        
        {/* Main insight - warm charcoal, larger */}
        <p 
          className="text-xl md:text-2xl leading-relaxed mb-5 max-w-2xl"
          style={{ color: '#2D2B29', fontWeight: 450, lineHeight: 1.5 }}
        >
          {insightText}
        </p>
        
        {/* Weekly focus - warm taupe */}
        <p 
          className="text-base md:text-lg leading-relaxed max-w-xl"
          style={{ color: '#6F6A66', lineHeight: 1.6 }}
        >
          {focusText}
        </p>
      </div>
    </section>
  );
}

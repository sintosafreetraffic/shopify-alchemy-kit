/**
 * SleepDirectionHero - Calm hero block for sleep direction today
 * 
 * Warm Scandinavian minimalism with brand blue accents
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
      {/* Cervical alignment / pillow silhouette illustration */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='200' viewBox='0 0 400 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 120 C80 100 120 90 160 95 Q200 100 240 90 C280 80 320 85 360 100' fill='none' stroke='%238E98A3' stroke-width='1' opacity='0.06'/%3E%3Cpath d='M60 140 Q100 110 140 115 T220 105 T300 115 T380 130' fill='none' stroke='%238E98A3' stroke-width='0.8' opacity='0.05'/%3E%3Cellipse cx='200' cy='130' rx='80' ry='25' fill='none' stroke='%238E98A3' stroke-width='0.6' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundSize: '400px 200px',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      <div className="relative px-7 py-8 md:px-10 md:py-10">
        {/* Eyebrow */}
        <p 
          className="text-xs font-medium tracking-wide uppercase mb-4"
          style={{ color: '#8E98A3' }}
        >
          Your Sleep Direction Today
        </p>
        
        {/* Main insight */}
        <p 
          className="text-lg md:text-xl leading-relaxed mb-3 max-w-xl"
          style={{ color: '#2D2B29', fontWeight: 400 }}
        >
          {insightText}
        </p>
        
        {/* Weekly focus */}
        <p 
          className="text-base leading-relaxed"
          style={{ color: '#6F6A66' }}
        >
          {focusText}
        </p>
      </div>
    </section>
  );
}

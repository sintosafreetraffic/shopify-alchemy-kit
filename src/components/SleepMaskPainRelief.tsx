import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eye, Moon, Sun, Cloud, AlertCircle, Coffee } from "lucide-react";

export const SleepMaskPainRelief = () => {
  const painPoints = [
    {
      icon: Eye,
      title: "Light Sensitivity",
      causes: [
        "Streetlights and ambient light",
        "Early morning sun exposure",
        "Partner's device screens",
        "Interrupts sleep cycles"
      ],
      solution: [
        "100% light blocking silk design",
        "Contoured eye cups for zero pressure",
        "Maintains complete darkness",
        "Protects natural melatonin production"
      ]
    },
    {
      icon: Moon,
      title: "Disrupted Sleep",
      causes: [
        "Light exposure during the night",
        "Inconsistent sleep environment",
        "Difficulty achieving REM sleep",
        "Frequent wake-ups"
      ],
      solution: [
        "Creates ideal dark sleep environment",
        "Promotes uninterrupted sleep cycles",
        "Enhances REM sleep quality",
        "Adjustable strap for secure fit"
      ]
    },
    {
      icon: Sun,
      title: "Morning Fatigue",
      causes: [
        "Premature awakening from sunlight",
        "Poor quality sleep",
        "Circadian rhythm disruption",
        "Insufficient deep sleep"
      ],
      solution: [
        "Blocks early morning light completely",
        "Supports natural wake time",
        "Maintains sleep hormone balance",
        "Lightweight and comfortable"
      ]
    },
    {
      icon: Cloud,
      title: "Travel Sleep Issues",
      causes: [
        "Unfamiliar sleeping environments",
        "Hotel room light leaks",
        "Time zone changes",
        "Airplane cabin lighting"
      ],
      solution: [
        "Portable and travel-friendly",
        "Works in any environment",
        "Compact storage pouch included",
        "Helps adjust to new time zones"
      ]
    },
    {
      icon: AlertCircle,
      title: "Headaches & Eye Strain",
      causes: [
        "Pressure from regular sleep masks",
        "Uncomfortable elastic bands",
        "Poor mask material quality",
        "Restricted eye movement"
      ],
      solution: [
        "Zero-pressure contoured design",
        "Soft adjustable strap",
        "100% breathable silk material",
        "Allows natural eye movement"
      ]
    },
    {
      icon: Coffee,
      title: "Daytime Drowsiness",
      causes: [
        "Insufficient nighttime rest",
        "Light-interrupted sleep",
        "Poor sleep quality",
        "Reduced energy levels"
      ],
      solution: [
        "Maximizes sleep quality",
        "Ensures complete darkness",
        "Supports natural sleep patterns",
        "Wake up energized and refreshed"
      ]
    }
  ];

  return (
    <section className="py-6 md:py-16 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-6 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
            Common Sleep Issues & How We Help
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            Discover how the RiseByNight™ Silk Sleep Mask addresses the root causes of poor sleep quality
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {painPoints.map((point) => {
            const Icon = point.icon;
            return (
              <Accordion key={point.title} type="single" collapsible className="w-full">
                <AccordionItem value={point.title} className="border-2 border-primary/20 rounded-xl bg-background overflow-hidden">
                  <AccordionTrigger className="px-4 md:px-6 py-3 md:py-4 hover:no-underline hover:bg-primary/5">
                    <div className="flex items-center gap-3 md:gap-4 text-left">
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      </div>
                      <span className="font-semibold text-sm md:text-base">{point.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 md:px-6 pb-4 md:pb-6">
                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm md:text-base mb-2 text-destructive">What Causes It:</h4>
                        <ul className="space-y-1 text-xs md:text-sm text-muted-foreground">
                          {point.causes.map((cause, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-destructive mt-0.5">•</span>
                              <span>{cause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm md:text-base mb-2 text-primary">How RiseByNight™ Helps:</h4>
                        <ul className="space-y-1 text-xs md:text-sm text-muted-foreground">
                          {point.solution.map((sol, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">✓</span>
                              <span>{sol}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}
        </div>
      </div>
    </section>
  );
};

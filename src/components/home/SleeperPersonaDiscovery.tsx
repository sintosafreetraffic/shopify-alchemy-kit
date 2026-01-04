import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Wind, Zap, Heart, ArrowRight } from "lucide-react";

const personas = [
  {
    id: "pain_sleeper",
    icon: Heart,
    title: "The Alignment Sleeper",
    tagline: "Pressure relief. Spinal support. Morning ease.",
    description:
      "Physical tension and alignment challenges shape your rest. You need support that relieves pressure points and helps you wake without stiffness.",
    soundsLikeYou: [
      "You wake with neck, shoulder, or back stiffness",
      "You've tried multiple pillows without lasting relief",
      "Mornings feel harder than they should",
    ],
    focus: "Ergonomic alignment & pressure relief",
  },
  {
    id: "stress_insomnia",
    icon: Wind,
    title: "The Calm Seeker",
    tagline: "Quiet mind. Restful environment. Deeper sleep.",
    description:
      "Your nervous system stays alert at night. Light, noise, and temperature easily disrupt your rest. You need a sanctuary that supports true calm.",
    soundsLikeYou: [
      "Your mind races when you lie down",
      "Small disturbances keep you alert",
      "You rarely feel truly rested",
    ],
    focus: "Sensory environment & wind-down rituals",
  },
  {
    id: "optimizer",
    icon: Zap,
    title: "The Sleep Optimizer",
    tagline: "Track. Refine. Perform.",
    description:
      "You already prioritize rest, but you want measurable improvements. Consistency, recovery metrics, and refinement drive your approach.",
    soundsLikeYou: [
      "You track your sleep or want to start",
      "You're looking for an edge in recovery",
      "Better sleep = better performance",
    ],
    focus: "Consistency, tracking & refinement",
  },
  {
    id: "recovery_sleeper",
    icon: Moon,
    title: "The Recovery Sleeper",
    tagline: "Train hard. Rest harder.",
    description:
      "Your body works hard during the day. Sleep needs to support physical restoration, muscle recovery, and next-day readiness.",
    soundsLikeYou: [
      "You train, move, or stay active regularly",
      "You wake sore despite sleeping enough",
      "Deep sleep quality matters to you",
    ],
    focus: "Physical restoration & recovery",
  },
];

export function SleeperPersonaDiscovery() {
  return (
    <section className="py-10 md:py-12 bg-gradient-to-b from-background via-muted/10 to-background overflow-x-hidden">
      <div className="container mx-auto px-4 max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 md:mb-12">
            <p className="text-xs md:text-sm uppercase tracking-widest text-primary/70 font-medium mb-3">
              Research-Based Profiles
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-5 tracking-tight">
              Four Sleep Profiles, One That Fits You
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Our science-backed assessment identifies your sleeper profile based on posture, pain, environment, behavior, and recovery patterns.
            </p>
          </div>

          {/* Persona Grid */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-5 lg:gap-6 mb-10">
            {personas.map((persona, index) => {
              const Icon = persona.icon;
              return (
                <div
                  key={persona.id}
                  className="group relative bg-background rounded-2xl border border-border/40 p-4 sm:p-6 md:p-8 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in w-full box-border"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Subtle accent line */}
                  <div className="absolute top-0 left-4 right-4 sm:left-8 sm:right-8 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold mb-1">{persona.title}</h3>
                      <p className="text-sm text-primary/70 font-medium mb-3">{persona.tagline}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">{persona.description}</p>

                      <div className="mb-5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2.5">
                          This sounds like you if…
                        </p>
                        <ul className="space-y-2">
                          {persona.soundsLikeYou.map((item, idx) => (
                            <li key={idx} className="text-sm text-foreground/75 flex items-start gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Focus badge */}
                      <div className="inline-block px-3 py-1.5 bg-muted/50 rounded-full mb-4">
                        <p className="text-xs font-medium text-muted-foreground">Focus: {persona.focus}</p>
                      </div>

                      <Link to="/sleep-quiz" className="block">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary p-0 h-auto group/btn hover:bg-transparent hover:text-primary/80"
                        >
                          Take the assessment to confirm
                          <ArrowRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quiz CTA */}
          <div className="text-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 md:p-8 border border-primary/10">
            <p className="text-sm text-muted-foreground mb-2">Not sure which profile fits you?</p>
            <h3 className="text-xl md:text-2xl font-semibold mb-4">Short Science. Clear Sleep Insights.</h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              This short, science-backed assessment helps us understand your sleep patterns across five foundations: 
              posture, pain, environment, behavior, and nighttime recovery.
            </p>
            <Link to="/sleep-quiz">
              <Button size="lg" className="text-base md:text-lg px-8 py-6 rounded-full">
                Start the Sleep Assessment
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

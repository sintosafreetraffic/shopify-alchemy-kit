import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Wind, Zap, Heart, ArrowRight } from "lucide-react";

const personas = [
  {
    id: "pain_sleeper",
    icon: Heart,
    title: "The Pain Sleeper",
    description: "Your rest is shaped by physical tension and alignment challenges that follow you into the morning.",
    soundsLikeYou: [
      "You wake with stiffness in your neck, shoulders, or back",
      "You've tried multiple pillows without lasting relief",
      "Mornings feel harder than they should",
    ],
  },
  {
    id: "stress_insomnia",
    icon: Wind,
    title: "The Stress & Environment Sleeper",
    description: "Your nervous system stays active at night, and your sleep is easily disrupted by light, noise, or temperature.",
    soundsLikeYou: [
      "Your mind races when you lie down",
      "Small disturbances—light, sound, heat—keep you alert",
      "You rarely feel truly rested, even after a full night",
    ],
  },
  {
    id: "optimizer",
    icon: Zap,
    title: "The Sleep Optimizer",
    description: "You already prioritize rest, but you want measurable improvements in recovery, energy, and consistency.",
    soundsLikeYou: [
      "You track your sleep or want to start",
      "You're looking for an edge in how you recover",
      "You believe better sleep = better performance",
    ],
  },
  {
    id: "recovery_sleeper",
    icon: Moon,
    title: "The Recovery Sleeper",
    description: "Your body works hard during the day, and your sleep needs to support physical restoration and readiness.",
    soundsLikeYou: [
      "You train, move, or stay active regularly",
      "You wake feeling sore or unrested despite sleeping enough",
      "Temperature and deep sleep quality matter to you",
    ],
  },
];

export function SleeperPersonaDiscovery() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Find Your Sleeper Type</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Understanding how you sleep is the first step toward sleeping better.
            </p>
          </div>

          {/* Persona Grid */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12">
            {personas.map((persona, index) => {
              const Icon = persona.icon;
              return (
                <div
                  key={persona.id}
                  className="bg-muted/30 border border-border/50 rounded-2xl p-6 md:p-8 hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{persona.title}</h3>
                      <p className="text-muted-foreground mb-4">{persona.description}</p>
                      
                      <div className="mb-5">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                          This sounds like you if…
                        </p>
                        <ul className="space-y-2">
                          {persona.soundsLikeYou.map((item, idx) => (
                            <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                              <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Link to="/sleep-quiz">
                        <Button variant="link" size="sm" className="text-primary p-0 h-auto group">
                          Match me with my pillow + plan
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center bg-muted/20 rounded-2xl p-8 border border-border/30">
            <p className="text-muted-foreground mb-2">Not sure which type you are?</p>
            <p className="text-foreground mb-6 max-w-lg mx-auto">
              Our 3-minute quiz identifies your sleeper profile and matches you with the right pillow and a personalized AI sleep plan.
            </p>
            <Link to="/sleep-quiz">
              <Button size="lg" className="text-lg px-8">
                Take the Sleep Quiz
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

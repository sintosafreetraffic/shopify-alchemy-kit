import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Wind, Zap, Heart } from "lucide-react";

const personas = [
  {
    id: "pain_sleeper",
    icon: Heart,
    title: "The Pain Sleeper",
    description: "Your rest is shaped by physical tension and alignment challenges.",
    issues: ["Neck & shoulder tension", "Morning stiffness", "Numbness or tingling"],
  },
  {
    id: "stress_insomnia",
    icon: Wind,
    title: "The Stress & Environment Sleeper",
    description: "Your rest is influenced by environmental cues and nervous-system activation.",
    issues: ["Racing thoughts at night", "Light & noise sensitivity", "Temperature discomfort"],
  },
  {
    id: "optimizer",
    icon: Zap,
    title: "The Sleep Optimizer",
    description: "You're focused on enhancing recovery, energy, and long-term performance.",
    issues: ["Inconsistent energy levels", "Wanting deeper sleep", "Tracking improvement"],
  },
  {
    id: "recovery_sleeper",
    icon: Moon,
    title: "The Recovery Sleeper",
    description: "Your focus is physical restoration and training recovery.",
    issues: ["Post-workout recovery", "Temperature regulation", "Morning readiness"],
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
              Understanding how you sleep is the first step to sleeping better. 
              Which of these sounds like you?
            </p>
          </div>

          {/* Persona Grid */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12">
            {personas.map((persona) => {
              const Icon = persona.icon;
              return (
                <div
                  key={persona.id}
                  className="bg-muted/30 border border-border/50 rounded-2xl p-6 md:p-8 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{persona.title}</h3>
                      <p className="text-muted-foreground mb-4">{persona.description}</p>
                      
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                          Common challenges
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {persona.issues.map((issue) => (
                            <span
                              key={issue}
                              className="text-sm bg-background px-3 py-1 rounded-full border border-border/50"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Link to="/sleep-quiz">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 p-0">
                          I'm this type →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Not sure which type you are?</p>
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

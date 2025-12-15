import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, AlignCenter, Moon, CheckCircle } from "lucide-react";

const pillars = [
  {
    icon: AlignCenter,
    title: "Personalized Alignment & Comfort",
    description: "Guidance shaped around your sleep position, pain areas, and physical needs.",
  },
  {
    icon: Moon,
    title: "Environment & Wind-Down Routines",
    description: "Tips for light, temperature, and evening habits—especially helpful for stress-sensitive sleepers.",
  },
  {
    icon: CheckCircle,
    title: "Gentle Accountability",
    description: "Small, doable actions each day. No pressure—just progress.",
  },
];

export function SleepCoachTeaser() {
  return (
    <section className="py-12 md:py-16 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Included Free With Your Pillow
              </div>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                Your Personal Sleep Coach, Built In
              </h2>
              
              <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Beyond the pillow—get a weekly plan tailored to your sleeper type, environment, and habits. 
                No app downloads, no subscriptions. Just calm, personalized guidance that updates based on 
                how you're sleeping. Designed to support your comfort, not overwhelm your routine.
              </p>

              <div className="space-y-4 mb-8">
                {pillars.map((pillar, index) => {
                  const Icon = pillar.icon;
                  return (
                    <div 
                      key={pillar.title} 
                      className="flex items-start gap-4 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{pillar.title}</h3>
                        <p className="text-sm text-muted-foreground">{pillar.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Start by understanding how you sleep.</p>
                <Link to="/sleep-quiz">
                  <Button size="lg" className="text-lg px-8">
                    Start Your Sleep Assessment
                  </Button>
                </Link>
              </div>
            </div>

            {/* Visual Placeholder */}
            <div className="relative">
              <div className="bg-background rounded-2xl border border-border/50 p-6 md:p-8 shadow-lg">
                {/* Mock Sleep Plan UI */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Plan</p>
                      <p className="text-lg font-semibold">Week 1 of 4</p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">72</span>
                    </div>
                  </div>
                  
                  <div className="h-px bg-border" />
                  
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Today's Focus</p>
                    <p className="font-medium">Alignment & Evening Wind-Down</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm bg-muted/30 rounded-lg p-3">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span>Morning: 5-min neck mobility routine</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm bg-muted/30 rounded-lg p-3">
                      <span className="w-2 h-2 rounded-full bg-primary/50" />
                      <span>Evening: Screen-free wind-down (30 min)</span>
                    </div>
                  </div>
                  
                  <div className="h-px bg-border" />
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Personalized for Pain Sleepers
                  </p>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -z-10 top-4 left-4 right-4 bottom-4 bg-primary/5 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

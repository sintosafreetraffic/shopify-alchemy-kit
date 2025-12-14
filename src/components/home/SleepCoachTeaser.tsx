import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Calendar, User, Sparkles } from "lucide-react";

const features = [
  {
    icon: User,
    title: "Personalized Assessment",
    description: "Take a short quiz to understand your unique sleep profile.",
  },
  {
    icon: Brain,
    title: "Sleeper Type Detection",
    description: "Discover if you're a Pain, Stress, Optimizer, or Recovery sleeper.",
  },
  {
    icon: Calendar,
    title: "Weekly Sleep Plan",
    description: "Receive a tailored plan with morning and evening guidance.",
  },
];

export function SleepCoachTeaser() {
  return (
    <section className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Included Free
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Your Personal Sleep Coach, Built In
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8">
                Beyond the pillow—get personalized guidance designed around your sleep type, 
                habits, and goals. No apps to download, no subscriptions required.
              </p>

              <div className="space-y-6 mb-8">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link to="/sleep-quiz">
                <Button size="lg" className="text-lg px-8">
                  Start Your Sleep Assessment
                </Button>
              </Link>
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
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">72</span>
                    </div>
                  </div>
                  
                  <div className="h-px bg-border" />
                  
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Today's Focus</p>
                    <p className="font-medium">Alignment & Evening Routine</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span>Morning: 5-min neck mobility</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-2 h-2 rounded-full bg-primary/50" />
                      <span>Evening: Screen-free wind-down</span>
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

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Moon, Sparkles, Heart } from "lucide-react";

const ambassadorTypes = [
  { icon: Moon, label: "Everyday Sleepers" },
  { icon: Sparkles, label: "Wellness Creators" },
  { icon: Heart, label: "Sleep Advocates" },
];

export function AmbassadorWall() {
  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-muted/5 via-muted/20 to-muted/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-6 md:mb-8">
            <p className="text-xs md:text-sm uppercase tracking-widest text-primary/70 font-medium mb-3">
              Community
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-4 tracking-tight">
              Join the Sleep Collective
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              We're building a calm community of creators, wellness advocates, and everyday sleepers 
              who believe better rest changes everything.
            </p>
          </div>

          {/* Ambassador types */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6 md:mb-8">
            {ambassadorTypes.map((type) => (
              <div 
                key={type.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border/40"
              >
                <type.icon className="w-4 h-4 text-primary/70" />
                <span className="text-sm text-muted-foreground">{type.label}</span>
              </div>
            ))}
          </div>

          {/* CTA Card */}
          <div className="text-center bg-background rounded-2xl border border-border/40 p-6 md:p-8 shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-semibold mb-3">Become a Partner</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm md:text-base leading-relaxed">
              No hype. No quotas. Just authentic advocacy for quality rest. 
              Earn commission while sharing what genuinely works.
            </p>
            <Link to="/collective">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-full text-base font-medium"
              >
                Learn About Partnerships
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

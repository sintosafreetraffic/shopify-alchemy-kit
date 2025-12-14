import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const ugcPlaceholders = [
  { tag: "Side Sleeper", initials: "KM" },
  { tag: "Desk Worker", initials: "JL" },
  { tag: "New Parent", initials: "AR" },
  { tag: "Night Owl", initials: "TS" },
  { tag: "Back Sleeper", initials: "EP" },
  { tag: "Active Lifestyle", initials: "MC" },
];

export function AmbassadorWall() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Loved By Real Sleepers</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands sharing their Rise By Night mornings and evenings.
            </p>
          </div>

          {/* UGC Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {ugcPlaceholders.map((item, idx) => (
              <div
                key={idx}
                className="aspect-square bg-muted/30 rounded-xl border border-border/50 flex flex-col items-center justify-center p-4 hover:border-primary/30 transition-colors"
              >
                {/* Placeholder Avatar */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-lg md:text-xl font-semibold text-primary">{item.initials}</span>
                </div>
                
                {/* Tag */}
                <span className="text-sm text-muted-foreground bg-background px-3 py-1 rounded-full border border-border/50">
                  {item.tag}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center bg-muted/30 rounded-2xl border border-border/50 p-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Join the Sleep Collective</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Share your sleep journey and connect with a community focused on rest and recovery.
            </p>
            <Link to="/about-us">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

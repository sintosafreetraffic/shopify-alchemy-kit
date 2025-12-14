import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";

export function AmbassadorWall() {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Ambassador CTA */}
          <div className="text-center bg-muted/30 rounded-2xl border border-border/50 p-8 md:p-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Join the Sleep Collective</h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto leading-relaxed">
              We're building a community of creators, wellness advocates, and everyday sleepers who care about rest—not hype. 
              If you believe better sleep changes everything, we'd love to hear from you.
            </p>
            <Link to="/collective">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-full text-lg font-medium"
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

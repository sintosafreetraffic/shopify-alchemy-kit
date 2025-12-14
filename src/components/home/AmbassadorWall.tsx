import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const ugcTiles = [
  { tag: "Desk Worker", caption: "Finally waking up without the neck tension.", hashtag: "#MyRiseByNight", initials: "JL" },
  { tag: "Side Sleeper", caption: "The contour actually fits how I sleep.", hashtag: "#SleepAligned", initials: "KM" },
  { tag: "Hot Sleeper", caption: "Breathable foam = no more 3am wake-ups.", hashtag: "#CoolSleep", initials: "AR" },
  { tag: "New Parent", caption: "When I do sleep, it actually counts.", hashtag: "#RestWhenYouCan", initials: "TS" },
  { tag: "Athlete", caption: "Recovery starts the moment I lie down.", hashtag: "#SleepToRecover", initials: "EP" },
  { tag: "Stressed Sleeper", caption: "My evening routine finally has a purpose.", hashtag: "#CalmNights", initials: "MC" },
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
            {ugcTiles.map((tile, idx) => (
              <div
                key={idx}
                className="bg-muted/30 rounded-xl border border-border/50 p-5 hover:border-primary/30 hover:shadow-md transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${idx * 75}ms` }}
              >
                {/* Placeholder Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-sm font-semibold text-primary">{tile.initials}</span>
                </div>
                
                {/* Tag */}
                <span className="inline-block text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium mb-3">
                  {tile.tag}
                </span>
                
                {/* Caption */}
                <p className="text-sm text-foreground mb-2 leading-relaxed">
                  "{tile.caption}"
                </p>
                
                {/* Hashtag */}
                <p className="text-xs text-muted-foreground">
                  {tile.hashtag}
                </p>
              </div>
            ))}
          </div>

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
            <Link to="/about-us">
              <Button variant="outline" size="lg">
                Learn About Partnerships
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

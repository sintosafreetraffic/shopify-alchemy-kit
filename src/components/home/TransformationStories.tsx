import { Quote, Moon, Sparkles, ArrowRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stories = [
  {
    id: "stress-sleeper",
    name: "Sarah K.",
    type: "Calm Seeker",
    avatar: null, // placeholder
    weeks: "After 3 weeks",
    before: [
      "Mind racing at bedtime",
      "Waking at 2am to small sounds",
      "Counting hours until morning",
      "Starting each day drained",
    ],
    after: [
      "Gentler transition into sleep",
      "Resting through the night",
      "Less reactive to disturbances",
      "Mornings feel like fresh starts",
    ],
    quote: "I finally feel like my sleep is working for me, not against me.",
    product: "Ergonomic Pillow + AI Sleep Coach",
  },
  {
    id: "pain-sleeper",
    name: "Michael T.",
    type: "Alignment Sleeper",
    avatar: null, // placeholder
    weeks: "After 2 weeks",
    before: [
      "Neck stiffness each morning",
      "Constantly repositioning",
      "Tingling in arms and hands",
      "Dreading bedtime",
    ],
    after: [
      "Rising without stiffness",
      "Staying in one position",
      "Normal feeling upon waking",
      "Looking forward to rest",
    ],
    quote: "After years of uncomfortable mornings, I finally found support that works.",
    product: "Ergonomic Pillow + Knee Pillow",
  },
];

export function TransformationStories() {
  return (
    <section className="py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 md:mb-10">
            <p className="text-xs md:text-sm uppercase tracking-widest text-primary/70 font-medium mb-3">
              Real Experiences
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-5 tracking-tight">
              Real Nights, Real Relief
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              See how thoughtful design and personalized support transform restless nights into restorative sleep.
            </p>
          </div>

          {/* Stories Grid */}
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            {stories.map((story) => (
              <article
                key={story.id}
                className="group bg-muted/20 rounded-2xl border border-border/30 overflow-hidden hover:border-primary/20 hover:shadow-lg transition-all duration-300"
              >
                {/* Header with avatar */}
                <div className="px-6 py-5 border-b border-border/20 bg-background/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar placeholder */}
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-background">
                        <User className="w-5 h-5 text-primary/60" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{story.name}</p>
                        <p className="text-xs text-primary/70 font-medium">{story.type}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                      {story.weeks}
                    </span>
                  </div>
                </div>

                {/* Before/After Content */}
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-2 gap-6 md:gap-8 mb-6">
                    {/* Before */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Before
                        </p>
                      </div>
                      <ul className="space-y-2.5">
                        {story.before.map((item, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground leading-relaxed pl-3 border-l-2 border-muted-foreground/15">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Divider - vertical line */}
                    <div className="relative">
                      <div className="absolute -left-3 md:-left-4 top-0 bottom-0 w-px bg-gradient-to-b from-muted-foreground/10 via-primary/30 to-muted-foreground/10" />
                      
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                          After
                        </p>
                      </div>
                      <ul className="space-y-2.5">
                        {story.after.map((item, idx) => (
                          <li key={idx} className="text-sm text-foreground leading-relaxed pl-3 border-l-2 border-primary/30">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="bg-primary/[0.04] rounded-xl p-5 mb-4 border border-primary/10">
                    <div className="flex gap-3">
                      <Quote className="w-4 h-4 text-primary/40 flex-shrink-0 mt-0.5" />
                      <p className="text-sm italic text-foreground/80 leading-relaxed">
                        "{story.quote}"
                      </p>
                    </div>
                  </div>

                  {/* Product used */}
                  <p className="text-xs text-muted-foreground/70">
                    <span className="font-medium">Using:</span> {story.product}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Quiz CTA */}
          <div className="mt-6 md:mt-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Find out which sleeper type you are
            </p>
            <Link to="/sleep-quiz">
              <Button variant="outline" size="lg" className="rounded-full border-primary/30 hover:bg-primary hover:text-primary-foreground">
                Take the Sleep Assessment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[11px] text-muted-foreground/50 mt-6 md:mt-8 max-w-xl mx-auto">
            Individual experiences may vary. These accounts reflect personal journeys and are not intended as medical advice or guaranteed outcomes.
          </p>
        </div>
      </div>
    </section>
  );
}

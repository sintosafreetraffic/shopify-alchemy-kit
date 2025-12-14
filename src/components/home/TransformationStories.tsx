import { ArrowRight } from "lucide-react";

const stories = [
  {
    id: "stress-sleeper",
    name: "Sarah, 34",
    type: "Stress & Environment Sleeper",
    before: [
      "Waking at 3am with racing thoughts",
      "Light and noise kept me alert",
      "Mornings felt like I hadn't slept at all",
    ],
    after: [
      "Sleeping through the night more often",
      "Feeling calmer when I lie down",
      "Waking with actual energy",
    ],
    quote: "I noticed the difference within the first week. My nervous system finally feels supported.",
  },
  {
    id: "pain-sleeper",
    name: "Michael, 42",
    type: "Pain Sleeper",
    before: [
      "Neck tension every morning",
      "Numbness in shoulders and arms",
      "Couldn't find a comfortable position",
    ],
    after: [
      "No more morning stiffness",
      "Shoulders relaxed throughout the night",
      "Actually looking forward to sleep",
    ],
    quote: "After years of waking up sore, I'm finally sleeping in a position that supports my spine.",
  },
];

export function TransformationStories() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Real Nights, Real Relief</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how others transformed their sleep with the right support.
            </p>
          </div>

          {/* Stories Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-background rounded-2xl border border-border/50 overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
                  <p className="font-semibold text-lg">{story.name}</p>
                  <p className="text-sm text-muted-foreground">{story.type}</p>
                </div>

                {/* Before/After Content */}
                <div className="p-6">
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-start mb-6">
                    {/* Before */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                        Before
                      </p>
                      <ul className="space-y-2">
                        {story.before.map((item, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-destructive/60 mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center pt-6">
                      <ArrowRight className="w-5 h-5 text-primary" />
                    </div>

                    {/* After */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                        After
                      </p>
                      <ul className="space-y-2">
                        {story.after.map((item, idx) => (
                          <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-4">
                    "{story.quote}"
                  </blockquote>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            *Individual experiences may vary. These accounts reflect personal experiences with our products.
          </p>
        </div>
      </div>
    </section>
  );
}

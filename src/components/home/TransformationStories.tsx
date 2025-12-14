import { ArrowRight, Quote } from "lucide-react";

const stories = [
  {
    id: "stress-sleeper",
    name: "Sarah",
    type: "Stress & Environment Sleeper",
    before: [
      "Evenings filled with restless thoughts and tension",
      "Waking at 2–3am, unable to settle back down",
      "Light and noise kept her alert through the night",
      "Mornings felt foggy, heavy, and rushed",
    ],
    after: [
      "Evenings feel calmer with a consistent wind-down routine",
      "Sleeping through the night more often",
      "Less sensitive to small disturbances",
      "Mornings start with actual energy",
    ],
    quote: "My nervous system finally feels supported. I didn't realize how much my environment and routine were working against me.",
    connection: "Sarah paired the Rise By Night™ Ergonomic Pillow with her weekly AI Sleep Coach plan—designed around her stress patterns and bedroom environment.",
  },
  {
    id: "pain-sleeper",
    name: "Michael",
    type: "Pain Sleeper",
    before: [
      "Neck and shoulder tension every morning",
      "Constantly adjusting pillows throughout the night",
      "Numbness in arms and hands after waking",
      "Dreading sleep instead of looking forward to it",
    ],
    after: [
      "Waking without stiffness or tension",
      "Staying in one position comfortably",
      "No more morning numbness",
      "Actually looking forward to bedtime",
    ],
    quote: "After years of sore mornings, I finally have a pillow that supports the way I actually sleep.",
    connection: "Michael uses the Rise By Night™ Ergonomic Pillow alongside his AI Sleep Coach plan—focused on alignment and gentle morning mobility.",
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
              See how others found comfort with the right support.
            </p>
          </div>

          {/* Stories Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="bg-background rounded-2xl border border-border/50 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border/50 bg-primary/5">
                  <p className="font-semibold text-lg">{story.name}</p>
                  <p className="text-sm text-primary">{story.type}</p>
                </div>

                {/* Before/After Content */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Before */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
                        Before
                      </p>
                      <ul className="space-y-2.5">
                        {story.before.map((item, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-destructive/60 mt-0.5 flex-shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* After */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
                        After
                      </p>
                      <ul className="space-y-2.5">
                        {story.after.map((item, idx) => (
                          <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="bg-muted/30 rounded-xl p-4 mb-4">
                    <div className="flex gap-3">
                      <Quote className="w-5 h-5 text-primary/40 flex-shrink-0 mt-0.5" />
                      <p className="text-sm italic text-foreground/80">
                        "{story.quote}"
                      </p>
                    </div>
                  </div>

                  {/* Connection */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {story.connection}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-8 italic">
            Individual experiences may vary. These accounts reflect personal experiences with our products and are not intended as medical advice.
          </p>
        </div>
      </div>
    </section>
  );
}

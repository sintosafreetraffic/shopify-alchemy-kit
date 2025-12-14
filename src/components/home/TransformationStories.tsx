import { Quote, Moon, Sparkles } from "lucide-react";

const stories = [
  {
    id: "stress-sleeper",
    name: "Sarah",
    type: "Stress & Environment Sleeper",
    icon: Moon,
    before: [
      "Mind racing at bedtime, unable to unwind",
      "Waking at 2am to the smallest sound or light",
      "Lying awake, counting the hours until morning",
      "Starting each day already drained",
    ],
    after: [
      "A gentler transition into sleep each night",
      "Resting through the night more consistently",
      "Less reactive to bedroom disturbances",
      "Mornings that feel like a fresh start",
    ],
    quote: "I finally feel like my sleep is working for me, not against me. The difference in how I start my day is remarkable.",
    context: "Sarah paired the Rise By Night™ Ergonomic Pillow with personalized guidance from her AI Sleep Coach—designed around her stress patterns and sleep environment.",
  },
  {
    id: "pain-sleeper",
    name: "Michael",
    type: "Alignment & Comfort Sleeper",
    icon: Sparkles,
    before: [
      "Waking with neck stiffness and shoulder tension",
      "Repositioning constantly, searching for comfort",
      "Tingling in arms and hands each morning",
      "Approaching bedtime with a sense of dread",
    ],
    after: [
      "Rising without that familiar morning stiffness",
      "Finding a comfortable position and staying there",
      "Hands and arms feel normal upon waking",
      "Looking forward to a restful night",
    ],
    quote: "After years of uncomfortable mornings, I finally found support that matches how I actually sleep. It's changed everything.",
    context: "Michael uses the Rise By Night™ Ergonomic Pillow alongside his AI Sleep Coach plan—focused on spinal alignment and gentle morning routines.",
  },
];

export function TransformationStories() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-muted/20 via-muted/40 to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 md:mb-16">
            <p className="text-xs md:text-sm uppercase tracking-widest text-primary/70 font-medium mb-3">
              Real Experiences
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-5 tracking-tight">
              Quiet Mornings, Better Days
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Discover how thoughtful design and personalized support can help transform restless nights into restorative sleep.
            </p>
          </div>

          {/* Stories Grid */}
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            {stories.map((story, index) => {
              const IconComponent = story.icon;
              return (
                <div
                  key={story.id}
                  className="bg-background rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
                >
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-border/30 bg-primary/[0.03]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{story.name}</p>
                        <p className="text-sm text-primary/80">{story.type}</p>
                      </div>
                    </div>
                  </div>

                  {/* Before/After Content */}
                  <div className="p-6 md:p-8">
                    <div className="grid grid-cols-2 gap-6 md:gap-8 mb-8">
                      {/* Before */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Before
                          </p>
                        </div>
                        <ul className="space-y-3">
                          {story.before.map((item, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-muted-foreground/20">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* After */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                            After
                          </p>
                        </div>
                        <ul className="space-y-3">
                          {story.after.map((item, idx) => (
                            <li key={idx} className="text-sm text-foreground leading-relaxed pl-4 border-l-2 border-primary/40">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Quote */}
                    <div className="bg-primary/[0.04] rounded-xl p-5 mb-5 border border-primary/10">
                      <div className="flex gap-3">
                        <Quote className="w-5 h-5 text-primary/50 flex-shrink-0 mt-0.5" />
                        <p className="text-sm md:text-[15px] italic text-foreground/85 leading-relaxed">
                          "{story.quote}"
                        </p>
                      </div>
                    </div>

                    {/* Context */}
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      {story.context}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground/60 mt-10 md:mt-12 max-w-xl mx-auto">
            Individual experiences may vary. These accounts reflect personal journeys and are not intended as medical advice or guaranteed outcomes.
          </p>
        </div>
      </div>
    </section>
  );
}

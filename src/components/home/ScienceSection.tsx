import { Activity, Compass, Target } from "lucide-react";

const PILLARS = [
  {
    icon: Activity,
    title: "Sleep Identity",
    description:
      "We look at how you naturally fall asleep and wake up — side, back, or combination — plus how often you move, wake up, and feel tension in the morning. This is about pattern recognition, not perfection.",
  },
  {
    icon: Compass,
    title: "Alignment & Environment",
    description:
      "Your pillow height, firmness, mattress feel, room temperature, light, and noise levels all influence how your spine and nervous system behave at night. We translate those details into a simple alignment and environment profile.",
  },
  {
    icon: Target,
    title: "A Clear Direction, Not a Diagnosis",
    description:
      "The result is a sleep persona and a short list of priority areas — like alignment, environment, or recovery — so you know where to start. It's guidance you can act on, not a medical diagnosis.",
  },
];

export function ScienceSection() {
  return (
    <section
      id="science"
      className="py-16 md:py-20 bg-muted/40 scroll-mt-20"
      data-section="science-methodology"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Eyebrow + Headline */}
          <div className="text-center mb-10 md:mb-12">
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
              Why this works
            </p>
            <h2 className="text-2xl md:text-4xl font-bold mb-5 tracking-tight">
              Why a Short Science Check Changes Your Sleep Direction
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The assessment combines your sleep position, movement, pain signals, and bedroom 
              environment into a simple model. Instead of guessing, we map how your neck, back, 
              and nervous system are working together at night, then highlight where a small 
              change can have an outsized impact.
            </p>
          </div>

          {/* Three Pillars Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="bg-background p-6 md:p-8 rounded-xl border border-border"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-5">
                  <pillar.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{pillar.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Reassurance */}
          <p className="text-center text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Most people don't need to overhaul everything — they just need to know which 
            1–2 changes matter most for their body.
          </p>
        </div>
      </div>
    </section>
  );
}

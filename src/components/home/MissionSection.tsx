import { Heart, Lightbulb, BadgeCheck } from "lucide-react";

const PILLARS = [
  {
    icon: Heart,
    title: "Sleep Wellness",
    description:
      "Improving rest through ergonomic design and premium materials that support your body naturally.",
  },
  {
    icon: Lightbulb,
    title: "Thoughtful Innovation",
    description:
      "Combining sleep science with purposeful design to create products that genuinely improve your nights.",
  },
  {
    icon: BadgeCheck,
    title: "Quality You Can Trust",
    description:
      "Every product is rigorously tested and backed by our commitment to your satisfaction.",
  },
];

export function MissionSection() {
  return (
    <section className="py-8 md:py-16 bg-[#FAF9F7]">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <p className="text-sm uppercase tracking-widest text-muted-foreground/70 mb-3">
              Why We Exist
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold mb-5 tracking-tight text-foreground">
              Our Mission
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Millions struggle with chronic pain, restless nights, and exhausting mornings. 
              We believe better sleep should be accessible to everyone — through clarity, 
              science-backed tools, and products designed with intention.
            </p>
          </div>

          {/* Pillars - More narrative/brand feel */}
          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/8 mb-5">
                  <pillar.icon className="w-6 h-6 text-primary/80" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-foreground">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { Moon, Wind, Shield, Sparkles } from "lucide-react";

export const SleepBundleFeatures = () => {
  const features = [
    {
      icon: Moon,
      title: "Complete Sleep Solution",
      description: "Everything you need for perfect sleep in one bundle - ergonomic pillow, knee pillow, and silk deep sleep mask work together for optimal rest.",
    },
    {
      icon: Wind,
      title: "Superior Comfort System",
      description: "Cooling gel technology in the pillow, memory foam support in the knee pillow, and luxurious silk mask for uninterrupted comfort all night.",
    },
    {
      icon: Shield,
      title: "Scientifically Proven Results",
      description: "93% of users report improved sleep quality, 96% experience pain relief, and 86% notice reduced sleep disruptions.",
    },
    {
      icon: Sparkles,
      title: "Premium Quality Materials",
      description: "High-density memory foam, cooling gel layers, 100% mulberry silk, and CertiPUR-US certified materials for lasting durability.",
    },
  ];

  return (
    <section className="py-6 md:py-10 lg:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4 md:mb-8">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold mb-2">Why Choose the Complete Bundle?</h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto">
              Get all three premium sleep products at a discounted price
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-background p-3 md:p-5 lg:p-6 rounded-lg border hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 mb-2 md:mb-3">
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-sm md:text-base lg:text-lg font-bold mb-1 md:mb-2">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

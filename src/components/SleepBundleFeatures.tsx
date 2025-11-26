import { Moon, Wind, Shield, Sparkles } from "lucide-react";

export const SleepBundleFeatures = () => {
  const features = [
    {
      icon: Moon,
      title: "Complete Sleep Solution",
      description: "Everything you need for perfect sleep in one bundle - ergonomic pillow, knee pillow, and silk sleep mask work together for optimal rest.",
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
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Why Choose the Complete Bundle?</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Get all three premium sleep products at a discounted price and experience the ultimate sleep transformation
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-background p-8 rounded-lg border hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

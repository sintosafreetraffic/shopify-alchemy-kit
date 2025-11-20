import { Card } from "@/components/ui/card";
import { Moon, Sparkles, Heart, Zap } from "lucide-react";

const benefits = [
  {
    icon: Moon,
    title: "Deeper Sleep",
    description: "Complete darkness signals your brain to produce more melatonin, helping you fall asleep faster and stay asleep longer."
  },
  {
    icon: Sparkles,
    title: "Beauty Sleep",
    description: "Silk's smooth texture prevents sleep wrinkles and protects your skin's natural moisture, helping you wake up looking refreshed."
  },
  {
    icon: Heart,
    title: "Skin-Friendly",
    description: "Hypoallergenic silk is perfect for sensitive skin and won't irritate or absorb your nighttime skincare products."
  },
  {
    icon: Zap,
    title: "Travel Essential",
    description: "Lightweight and compact, it's perfect for planes, hotels, or anywhere you need to block out unwanted light."
  }
];

export const SleepMaskBenefits = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Why Choose Silk?
          </h2>
          <p className="text-xl text-muted-foreground">
            Experience the luxury difference that pure silk makes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card key={index} className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

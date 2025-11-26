import { Moon, Zap, Heart, Shield } from "lucide-react";

export const KneePillowBenefits = () => {
  const benefits = [
    {
      icon: Moon,
      title: "Perfect Hip Alignment",
      description: "Maintains natural spine curvature and prevents hip rotation during sleep"
    },
    {
      icon: Zap,
      title: "Wake Up Pain-Free",
      description: "No more lower back or knee discomfort. Start your day feeling refreshed"
    },
    {
      icon: Heart,
      title: "Health Benefits",
      description: "Reduces pressure on joints, improves circulation, and promotes proper leg positioning"
    },
    {
      icon: Shield,
      title: "Premium Quality",
      description: "Certified hypoallergenic materials, dust mite resistant, and machine washable cover"
    }
  ];

  return (
    <section className="py-6 md:py-10 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Why Choose Rise By Night?</h2>
          <p className="text-base md:text-xl text-muted-foreground">
            Backed by sleep science and loved by thousands
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-3 md:mb-4">
                  <Icon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1.5 md:mb-2">{benefit.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

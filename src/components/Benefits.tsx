import { Moon, Zap, Heart, Shield } from "lucide-react";

export const Benefits = () => {
  const benefits = [
    {
      icon: Moon,
      title: "Better Sleep Quality",
      description: "Fall asleep 50% faster and enjoy deeper, more restorative sleep cycles"
    },
    {
      icon: Zap,
      title: "Wake Up Energized",
      description: "No more morning neck pain or headaches. Start your day feeling refreshed"
    },
    {
      icon: Heart,
      title: "Health Benefits",
      description: "Reduces snoring, improves breathing, and promotes proper spinal alignment"
    },
    {
      icon: Shield,
      title: "Premium Quality",
      description: "Certified hypoallergenic materials, dust mite resistant, and machine washable cover"
    }
  ];

  return (
    <section className="py-10 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4">Why Choose RiseByNight?</h2>
          <p className="text-xl text-muted-foreground">
            Backed by sleep science and loved by thousands
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

import { Check, Moon, Heart, Brain, Shield, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

const Benefits = () => {
  const benefits = [
    {
      icon: Heart,
      title: "Pain Relief & Recovery",
      description: "Ergonomic design reduces neck, shoulder, and back pain while you sleep. Wake up refreshed without stiffness or discomfort.",
      features: [
        "Reduces chronic neck pain by up to 96%",
        "Alleviates shoulder tension and headaches",
        "Promotes natural spinal alignment",
        "Accelerates muscle recovery during sleep"
      ]
    },
    {
      icon: Moon,
      title: "Better Sleep Quality",
      description: "Fall asleep faster and enjoy deeper, more restful sleep throughout the night with our scientifically designed products.",
      features: [
        "93% of customers report improved sleep quality",
        "Reduces sleep interruptions and tossing",
        "Cooling gel technology prevents overheating",
        "Blocks 100% of light with silk sleep mask"
      ]
    },
    {
      icon: Brain,
      title: "Enhanced Daily Performance",
      description: "Quality sleep translates to better focus, energy, and productivity throughout your day.",
      features: [
        "89% experience enhanced daily focus",
        "Improved memory and cognitive function",
        "Reduced daytime fatigue and irritability",
        "Better mood and emotional regulation"
      ]
    },
    {
      icon: Shield,
      title: "Long-Lasting Durability",
      description: "Premium materials engineered to maintain shape and support for years, unlike regular pillows that flatten quickly.",
      features: [
        "High-density memory foam lasts 3-5 years",
        "Maintains shape and support over time",
        "CertiPUR-US certified materials",
        "2-year warranty on all products"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The Rise By Night™ Difference
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Scientifically proven benefits that transform your sleep and improve your quality of life. Backed by over 15,000+ satisfied customers and clinical testing.
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                ))}
              </div>
              <span className="text-lg font-semibold">4.8/5</span>
              <span className="text-muted-foreground">(15,000+ reviews)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <benefit.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground mb-4">{benefit.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {benefit.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-12">
            Proven Results From Real Customers
          </h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { stat: "96%", label: "Relieved Chronic Neck Pain" },
              { stat: "93%", label: "Improved Sleep Quality" },
              { stat: "89%", label: "Enhanced Daily Focus" },
              { stat: "86%", label: "Reduced Snoring" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl md:text-6xl font-bold text-primary mb-2">
                  {item.stat}
                </div>
                <p className="text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12">
              Why Choose Rise By Night™?
            </h2>
            <div className="space-y-6">
              {[
                {
                  title: "Scientifically Designed",
                  description: "Our products are engineered based on sleep science research and ergonomic principles to provide optimal support and comfort."
                },
                {
                  title: "Premium Materials",
                  description: "High-density memory foam, cooling gel technology, and pure mulberry silk - only the finest materials that last for years."
                },
                {
                  title: "Scientifically Proven",
                  description: "Independent testing confirms our pillows significantly reduce neck pain and improve sleep quality compared to regular pillows."
                },
                {
                  title: "Risk-Free Trial",
                  description: "Try any Rise By Night product for 100 nights. If you're not completely satisfied, return it for a full refund - no questions asked."
                }
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-6 bg-muted/30 rounded-lg">
                  <Check className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Benefits;

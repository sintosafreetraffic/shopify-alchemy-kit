import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import testimonial from "@/assets/testimonial.png";
import offerBundle from "@/assets/offer-bundle.png";
import comparisonChart from "@/assets/comparison-chart.png";

const features = [
  {
    image: testimonial,
    title: "Join 29,931+ Happy Sleepers",
    description: "Don't just take our word for it. Thousands of customers have transformed their sleep quality with OptiSleep. Experience the difference that proper neck alignment and ergonomic support can make.",
    benefits: [
      "Wake up pain-free and refreshed",
      "Fall asleep faster every night",
      "Verified 5-star customer reviews"
    ],
    imagePosition: "left" as const
  },
  {
    image: offerBundle,
    title: "Complete Sleep Solution Bundle",
    description: "Get everything you need for the perfect night's sleep. Our exclusive bundle includes premium accessories designed to complement your OptiSleep pillow for maximum comfort.",
    benefits: [
      "Premium sleep mask included",
      "Luxury pillowcase for cooling comfort",
      "Bonus neck roll for extra support"
    ],
    imagePosition: "right" as const
  },
  {
    image: comparisonChart,
    title: "Scientifically Proven Superior",
    description: "OptiSleep isn't just another pillow - it's engineered with advanced ergonomic design and cooling technology that outperforms traditional pillows in every way.",
    benefits: [
      "Maintains shape 5x longer than regular pillows",
      "Cooling gel prevents night sweats",
      "Clinically tested spinal alignment"
    ],
    imagePosition: "left" as const
  }
];

export const Features = () => {
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl space-y-24">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${
              feature.imagePosition === "right" ? "md:grid-flow-dense" : ""
            }`}
          >
            <div
              className={`rounded-xl overflow-hidden shadow-xl ${
                feature.imagePosition === "right" ? "md:col-start-2" : ""
              }`}
            >
              <img
                src={feature.image}
                alt={feature.title}
                className="w-full h-auto"
                style={
                  feature.image === comparisonChart
                    ? { filter: "hue-rotate(200deg)" }
                    : undefined
                }
              />
            </div>

            <div
              className={`space-y-6 ${
                feature.imagePosition === "right" ? "md:col-start-1 md:row-start-1" : ""
              }`}
            >
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                {feature.title}
              </h2>
              
              <p className="text-lg text-muted-foreground">
                {feature.description}
              </p>

              <div className="space-y-3">
                {feature.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-full p-1 flex-shrink-0 mt-0.5">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-base">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button size="lg" className="mt-4" onClick={scrollToProducts}>
                Get Your OptiSleep Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

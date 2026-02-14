// Performance: Using OptimizedImage for lazy loading
import { Check } from "lucide-react";
import testimonial from "@/assets/happy-sleepers-pillow.webp";
import comparisonChart from "@/assets/pillow-comparison-new.webp";
import OptimizedImage from "@/components/OptimizedImage";

const features: Array<{
  image: string;
  title: string;
  description: string;
  benefits: string[];
  imagePosition: "left" | "right";
}> = [
  {
    image: testimonial,
    title: "Join Our Happy Sleepers",
    description: "Don't just take our word for it. Thousands of customers have transformed their sleep quality with Rise By Night. Experience the difference that proper neck alignment and ergonomic support can make.",
    benefits: [
      "Wake up pain-free and refreshed",
      "Fall asleep faster every night",
      "Verified 5-star customer reviews"
    ],
    imagePosition: "left"
  },
  {
    image: comparisonChart,
    title: "Scientifically Proven Superior",
    description: "Rise By Night isn't just another pillow - it's engineered with advanced ergonomic design and cooling technology that outperforms traditional pillows in every way.",
    benefits: [
      "Maintains shape 5x longer than regular pillows",
      "Cooling gel prevents night sweats",
      "Clinically tested spinal alignment"
    ],
    imagePosition: "right"
  }
];

export const Features = () => {
  return (
    <section className="py-4 md:py-6 lg:py-10 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl space-y-4 md:space-y-8 lg:space-y-12">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`grid md:grid-cols-2 gap-4 md:gap-8 items-center ${
              feature.imagePosition === "right" ? "md:grid-flow-dense" : ""
            }`}
          >
            <div
              className={`rounded-xl overflow-hidden shadow-xl ${
                feature.imagePosition === "right" ? "md:col-start-2" : ""
              }`}
            >
              <OptimizedImage
                src={feature.image}
                alt={feature.title}
                width={672}
                height={400}
                className="w-full h-auto"
              />
            </div>

            <div
              className={`space-y-2 md:space-y-4 ${
                feature.imagePosition === "right" ? "md:col-start-1 md:row-start-1" : ""
              }`}
            >
              <h2 className="text-lg md:text-2xl lg:text-3xl font-bold leading-tight">
                {feature.title}
              </h2>
              
              <p className="text-sm md:text-base text-muted-foreground">
                {feature.description}
              </p>

              <div className="space-y-1.5 md:space-y-2">
                {feature.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2">
                    <div className="bg-primary/10 rounded-full p-0.5 md:p-1 flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                    </div>
                    <span className="text-xs md:text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

import { Check } from "lucide-react";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";

const features: Array<{
  image: string;
  title: string;
  description: string;
  benefits: string[];
  imagePosition: "left" | "right";
}> = [
  {
    image: eyeMaskGift,
    title: "Luxury Silk for Ultimate Comfort",
    description: "Made from 100% pure mulberry silk, our sleep mask is incredibly soft and gentle on your skin. Unlike synthetic materials, silk is naturally hypoallergenic and won't absorb your skin's moisture or beauty products.",
    benefits: [
      "Prevents wrinkles and sleep lines",
      "Gentle on eyelashes and extensions",
      "Naturally temperature regulating"
    ],
    imagePosition: "left"
  },
  {
    image: eyeMaskGift,
    title: "Complete Light Blocking Design",
    description: "The contoured design creates a perfect seal around your eyes while allowing natural blinking. Experience total darkness that triggers your body's natural melatonin production for deeper, more restorative sleep.",
    benefits: [
      "Blocks 100% of ambient light",
      "No pressure on eyes or eyelids",
      "Perfect for travel and shift workers"
    ],
    imagePosition: "right"
  }
];

export const SleepMaskFeatures = () => {
  return (
    <section className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="space-y-16 md:space-y-24">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${
                feature.imagePosition === "right" ? "md:grid-flow-dense" : ""
              }`}
            >
              <div
                className={`${
                  feature.imagePosition === "right" ? "md:col-start-2" : ""
                }`}
              >
                <div className="bg-gradient-to-b from-background to-primary/10 p-12 rounded-lg">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div
                className={`space-y-6 ${
                  feature.imagePosition === "right" ? "md:col-start-1 md:row-start-1" : ""
                }`}
              >
                <h2 className="text-3xl md:text-4xl font-bold">
                  {feature.title}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="space-y-3">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start gap-3">
                      <Check className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-lg">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

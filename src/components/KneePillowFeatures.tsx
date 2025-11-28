import { Check } from "lucide-react";
import kneePillowHero from "@/assets/knee-pillow-hero-new.png";
import kneePillowCirculation from "@/assets/knee-pillow-circulation.png";

const features: Array<{
  image: string;
  title: string;
  description: string;
  benefits: string[];
  imagePosition: "left" | "right";
}> = [
  {
    image: kneePillowHero,
    title: "Perfect for Side Sleepers",
    description: "Designed specifically for side sleepers, our ergonomic knee pillow fits comfortably between your legs to maintain proper spinal alignment throughout the night.",
    benefits: [
      "Prevents hip rotation and misalignment",
      "Reduces pressure on lower back",
      "Comfortable memory foam cushioning"
    ],
    imagePosition: "left"
  },
  {
    image: kneePillowCirculation,
    title: "Relieves Pain & Improves Circulation",
    description: "By keeping your legs properly aligned, the knee pillow reduces strain on your lower back, hips, and knees while improving blood circulation for a more restful sleep.",
    benefits: [
      "Alleviates sciatica and hip pain",
      "Reduces swelling in legs and feet",
      "Promotes better blood flow"
    ],
    imagePosition: "right"
  }
];

export const KneePillowFeatures = () => {
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
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full rounded-lg shadow-lg"
                  loading="lazy"
                  decoding="async"
                />
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

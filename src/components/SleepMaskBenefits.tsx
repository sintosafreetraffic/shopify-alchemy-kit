// Sleep Mask Benefits - uses shared BenefitsSection
import { Moon, Sparkles, Heart, Zap } from "lucide-react";
import { BenefitsSection } from "@/components/shared/BenefitsSection";

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
    <BenefitsSection
      title="Why Choose Silk?"
      subtitle="Experience the luxury difference that pure silk makes"
      items={benefits}
    />
  );
};

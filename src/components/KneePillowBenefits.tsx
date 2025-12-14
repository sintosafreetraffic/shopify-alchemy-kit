// Knee Pillow Benefits - uses shared BenefitsSection
import { Moon, Zap, Heart, Shield } from "lucide-react";
import { BenefitsSection } from "@/components/shared/BenefitsSection";

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

export const KneePillowBenefits = () => {
  return <BenefitsSection items={benefits} />;
};

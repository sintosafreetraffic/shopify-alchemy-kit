// Ergonomic Pillow Benefits - uses shared BenefitsSection
import { Moon, Zap, Heart, Shield } from "lucide-react";
import { BenefitsSection } from "@/components/shared/BenefitsSection";

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

export const ProductBenefitsSection = () => {
  return <BenefitsSection items={benefits} />;
};

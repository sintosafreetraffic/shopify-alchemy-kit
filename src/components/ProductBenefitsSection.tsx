// Ergonomic Pillow Benefits - uses shared BenefitsSection
import { Moon, Zap, Heart, Shield, Sparkles, Activity } from "lucide-react";
import { BenefitsSection } from "@/components/shared/BenefitsSection";

const benefits = [
  {
    icon: Zap,
    title: "Stop Waking Up Exhausted",
    description: "End morning fatigue. Proper alignment means deeper sleep cycles so you wake recharged, not drained"
  },
  {
    icon: Sparkles,
    title: "Wake Up Looking Refreshed",
    description: "Gentle elevation prevents fluid buildup overnight. No more puffy face or tired eyes"
  },
  {
    icon: Activity,
    title: "Accelerate Recovery",
    description: "Optimal spinal alignment reduces muscle tension, helping your body repair and recover faster"
  },
  {
    icon: Heart,
    title: "Breathe Better, Sleep Deeper",
    description: "Promotes open airways to reduce snoring and breathing disruptions throughout the night"
  },
  {
    icon: Moon,
    title: "Fall Asleep Faster",
    description: "Comfortable from the first moment. No more adjusting and repositioning to find relief"
  },
  {
    icon: Shield,
    title: "Premium Hypoallergenic",
    description: "Certified materials, dust mite resistant, and machine washable cover for lasting freshness"
  }
];

export const ProductBenefitsSection = () => {
  return <BenefitsSection items={benefits} />;
};

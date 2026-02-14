import { ShieldCheck, RefreshCcw, Truck, Lock } from "lucide-react";
import { PaymentIcons } from "./PaymentIcons";
import { cn } from "@/lib/utils";
import { useShippingConfig } from "@/hooks/useShippingConfig";

interface FooterTrustBadgesProps {
  className?: string;
}

export const FooterTrustBadges = ({ className }: FooterTrustBadgesProps) => {
  const { formattedThreshold } = useShippingConfig();

  const trustBadges = [
    {
      icon: ShieldCheck,
      label: "100-Day Trial",
      sublabel: "Risk-free guarantee",
    },
    {
      icon: Lock,
      label: "Secure Checkout",
      sublabel: "SSL encrypted",
    },
    {
      icon: Truck,
      label: "Free Shipping",
      sublabel: `On orders ${formattedThreshold}+`,
    },
    {
      icon: RefreshCcw,
      label: "Easy Returns",
      sublabel: "No questions asked",
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Trust Badges Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {trustBadges.map((badge) => (
          <div 
            key={badge.label} 
            className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
          >
            <badge.icon className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs font-medium leading-tight">{badge.label}</p>
              <p className="text-[10px] text-muted-foreground">{badge.sublabel}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Methods */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-3">Secure Payment Methods</p>
        <PaymentIcons iconClassName="h-6 w-auto" />
      </div>
    </div>
  );
};

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Shield, Truck, RotateCcw } from "lucide-react";

const policies = [
  {
    icon: Shield,
    title: "120 Night Sleep Trial",
    content: "We're confident you'll love your OptiSleep pillow, which is why we offer a generous 120-night trial period. If you're not completely satisfied, return it for a full refund - no questions asked. We'll even arrange free pickup."
  },
  {
    icon: Truck,
    title: "Free Delivery",
    content: "Enjoy free shipping on all orders within the United States. Orders are typically processed within 1-2 business days and delivered within 3-5 business days. Track your order every step of the way with our real-time tracking system."
  },
  {
    icon: RotateCcw,
    title: "Free Returns",
    content: "Changed your mind? No problem. Returns are always free and hassle-free. Simply contact our customer service team, and we'll arrange a free pickup. Your refund will be processed within 5 business days of receiving the returned item."
  }
];

export const PolicyAccordion = () => {
  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left side - Images */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
                <img 
                  src="/src/assets/optisleep-pillow.png" 
                  alt="OptiSleep pillow detail view" 
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
                <img 
                  src="/src/assets/optisleep-pillow-main.png" 
                  alt="OptiSleep pillow comfort view" 
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
          
          {/* Right side - Policy Accordion */}
          <div>
            <Accordion type="single" collapsible className="space-y-3">
              {policies.map((policy, index) => {
                const Icon = policy.icon;
                return (
                  <AccordionItem 
                    key={index} 
                    value={`policy-${index}`}
                    className="bg-secondary/20 rounded-lg border-none"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-semibold text-left">{policy.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 text-muted-foreground">
                      {policy.content}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Moon, Truck, RotateCcw } from "lucide-react";

const policies = [
  {
    icon: Moon,
    title: "100 nights risk free trial",
    content: "We're so confident you'll love your RiseByNight pillow that we offer a risk-free 100-night trial. Sleep on it for over 3 months - if you're not completely satisfied, return it for a full refund, no questions asked. 98% of our customers keep their pillow after trying it!"
  },
  {
    icon: Truck,
    title: "Free Delivery",
    content: "Enjoy free shipping on all orders within the United States. Orders are typically processed within 1-2 business days and delivered within 5-7 days. Track your order every step of the way with our real-time tracking system."
  },
  {
    icon: RotateCcw,
    title: "Free Returns",
    content: "Changed your mind? No problem. Returns are always free and hassle-free. Simply contact our customer service team. Your refund will be processed within 5 business days of receiving the returned item."
  }
];

export const PolicyAccordion = () => {
  return (
    <section className="py-6 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <Accordion type="single" collapsible className="space-y-2">
          {policies.map((policy, index) => {
            const Icon = policy.icon;
            return (
              <AccordionItem 
                key={index} 
                value={`policy-${index}`}
                className="bg-secondary/20 rounded-lg border-none"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold text-left text-sm">{policy.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 text-muted-foreground text-sm">
                  {policy.content}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
};
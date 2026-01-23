import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Moon, Truck, RotateCcw, Star } from "lucide-react";

const policies = [
  {
    icon: Moon,
    title: "100 nights risk free trial",
    content: "We're so confident you'll love your Rise By Night pillow that we offer a risk-free 100-night trial. Sleep on it for over 3 months - if you're not completely satisfied, return it for a full refund, no questions asked. 98% of our customers keep their pillow after trying it!"
  },
  {
    icon: Truck,
    title: "Free Shipping & Delivery",
    content: "Enjoy free shipping on all orders containing pillows within the United States. Orders are typically processed within 1-2 business days and delivered within 5-7 days. Track your order every step of the way with our real-time tracking system."
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    content: "Changed your mind? No problem. Returns are easy and hassle-free. Simply contact our customer service team. Your refund will be processed within 5 business days of receiving the returned item."
  },
  {
    icon: Star,
    title: "Material Composition & Measurements",
    content: (
      <div className="space-y-4">
        <div>
          <p className="mb-2">Crafted with premium materials for optimal comfort:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>High-density, slow-rebound viscoelastic memory foam</li>
            <li>Breathable, moisture-wicking CoolingTech™ micro-knit cover</li>
            <li>Ventilated 3D AirMesh side panels for enhanced airflow</li>
          </ul>
        </div>
        <div>
          <p className="mb-2">Sized for proper cervical support:</p>
          <ul className="space-y-1">
            <li>• 24.4" × 14.6" × 4.7" (62cm × 37cm × 12cm)</li>
          </ul>
        </div>
      </div>
    )
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
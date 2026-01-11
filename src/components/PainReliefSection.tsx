import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const painTypes = [
  {
    title: "Neck Pain",
    cause: "Poor neck support during sleep forces unnatural alignment, straining muscles and ligaments in the neck. This leads to stiffness, tension, and chronic discomfort that lingers throughout the day.",
    solution: "The ergonomic contour design cradles your neck, maintaining proper cervical alignment and relieving pressure on key areas. Experience immediate relief and long-term comfort with every night's sleep."
  },
  {
    title: "Back Pain",
    cause: "A lack of proper spinal support during sleep puts stress on the lower back, creating tension and inflammation that disrupts your rest and leaves you in pain.",
    solution: "Our pillow's innovative structure aligns your spine naturally from neck to lower back. This reduces pressure and tension, promoting a neutral posture that alleviates back pain for truly restorative sleep."
  },
  {
    title: "Shoulder Tension",
    cause: "Traditional pillows force your shoulders into awkward angles, creating tightness and soreness that spreads through your upper body and affects your daily comfort.",
    solution: "Designed with special ergonomic contours, Rise By Night ensures your shoulders remain in a natural position, relieving tension and preventing soreness so you wake up feeling relaxed and refreshed."
  },
  {
    title: "Restless Sleep",
    cause: "Tossing and turning is often caused by discomfort from pressure points and inadequate support, preventing you from achieving the deep, restorative sleep your body needs.",
    solution: "High-density memory foam conforms to your unique shape, minimizing pressure points and keeping your head and neck perfectly supported. This ensures uninterrupted sleep, leaving you energized each morning."
  },
  {
    title: "Morning Headaches",
    cause: "Misaligned neck and shoulder positions restrict blood flow and cause muscle tension, triggering headaches and fatigue that affect your entire day.",
    solution: "By promoting optimal alignment, Rise By Night improves circulation and reduces tension throughout the night. Wake up pain-free, clear-headed, and ready to take on whatever the day brings."
  },
  {
    title: "Sleep Disruption",
    cause: "Poor sleeping posture and inadequate support can worsen breathing patterns and lead to interrupted sleep cycles that leave you exhausted.",
    solution: "The ergonomic design elevates and supports your head and neck, promoting proper airway alignment. This helps reduce breathing disruptions and allows for deeper, more consistent sleep quality."
  }
];

export const PainReliefSection = () => {
  return (
    <section className="py-4 md:py-8 lg:py-12 px-4 bg-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-3 md:mb-6">
          <h2 className="text-lg md:text-2xl lg:text-3xl font-bold mb-1">
            Relief for Every Type of Pain
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          {painTypes.map((pain, index) => (
            <Accordion key={index} type="single" collapsible>
              <AccordionItem 
                value={`pain-${index}`}
                className="bg-secondary/10 rounded-lg border border-border/50 px-3"
              >
                <AccordionTrigger className="hover:no-underline py-2 md:py-3">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                    </div>
                    <span className="font-bold text-xs md:text-sm text-left">{pain.title}</span>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="pt-1 pb-2 md:pb-3">
                  <div className="space-y-2 ml-5 md:ml-7">
                    <div>
                      <p className="font-semibold text-[10px] md:text-xs mb-0.5">What Causes It:</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">{pain.cause}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-[10px] md:text-xs mb-0.5">How Rise By Night Helps:</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">{pain.solution}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>
      </div>
    </section>
  );
};
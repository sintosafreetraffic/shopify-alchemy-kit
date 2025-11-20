import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

const painPoints = [
  {
    id: "hip-pain",
    title: "Hip Pain",
    causes: "Side sleeping without proper support causes your top leg to pull your hip forward, creating pressure and misalignment that leads to chronic hip pain.",
    solution: "Our knee pillow keeps your legs stacked and hips aligned, eliminating the forward pull and pressure that causes hip discomfort."
  },
  {
    id: "lower-back",
    title: "Lower Back Pain",
    causes: "When your knees touch during side sleeping, your spine twists unnaturally, straining your lower back muscles and causing morning stiffness and pain.",
    solution: "The contoured design maintains natural spine alignment by keeping your legs separated and properly positioned, relieving lower back strain."
  },
  {
    id: "knee-pain",
    title: "Knee Pain",
    causes: "Direct knee-to-knee contact during sleep creates pressure points and can aggravate existing knee conditions or cause new discomfort.",
    solution: "Soft memory foam cushions your knees and prevents direct contact, distributing pressure evenly for pain-free mornings."
  },
  {
    id: "sciatica",
    title: "Sciatica Relief",
    causes: "Poor leg alignment compresses the sciatic nerve, causing shooting pain, numbness, and tingling down your leg.",
    solution: "Proper leg positioning relieves pressure on the sciatic nerve pathway, reducing inflammation and nerve compression."
  },
  {
    id: "restless-legs",
    title: "Restless Legs",
    causes: "Poor circulation and uncomfortable leg positioning trigger restless leg syndrome symptoms and constant repositioning throughout the night.",
    solution: "Improved blood flow and comfortable support reduce the urge to move, helping you stay in one comfortable position all night."
  },
  {
    id: "circulation",
    title: "Poor Circulation",
    causes: "Leg positions that restrict blood flow can cause numbness, tingling, and leg swelling during sleep.",
    solution: "Elevates and separates legs to promote healthy blood circulation, reducing swelling and improving overall leg comfort."
  }
];

export const KneePillowPainRelief = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Targeted Pain Relief
          </h2>
          <p className="text-xl text-muted-foreground">
            Discover how our knee pillow addresses specific pain points for better sleep
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {painPoints.map((point) => (
            <Card key={point.id} className="overflow-hidden">
              <Accordion type="single" collapsible>
                <AccordionItem value={point.id} className="border-none">
                  <AccordionTrigger className="px-6 pt-6 pb-4 hover:no-underline">
                    <h3 className="text-xl font-bold text-left">{point.title}</h3>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-primary mb-2">What Causes It</h4>
                        <p className="text-sm text-muted-foreground">{point.causes}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-primary mb-2">How RiseByNight Helps</h4>
                        <p className="text-sm text-muted-foreground">{point.solution}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

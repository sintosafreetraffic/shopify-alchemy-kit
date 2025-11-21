import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What makes the RiseByNight pillow different?",
    answer: "The RiseByNight pillow uses scientifically-designed ergonomic contours and medical-grade cooling gel technology to maintain proper spinal alignment, reduce sleep apnea episodes by 86%, and eliminate snoring. Unlike regular pillows that flatten quickly, RiseByNight maintains its shape and support for 3-5 years."
  },
  {
    question: "How does the 120-day trial work?",
    answer: "Try RiseByNight risk-free for 120 nights. If you're not completely satisfied, simply contact us for a full refund. No questions asked, no hassle. We'll arrange a free pickup and process your refund within 5 business days."
  },
  {
    question: "Is the pillow suitable for all sleeping positions?",
    answer: "Yes! The RiseByNight pillow is designed for all sleeping positions - back, side, and stomach sleepers. The ergonomic design adapts to your sleeping style while maintaining proper spinal alignment and airway opening."
  },
  {
    question: "How do I clean and maintain my pillow?",
    answer: "The RiseByNight pillow comes with a removable, machine-washable cover. Simply unzip and wash the cover on a gentle cycle. The pillow core can be spot cleaned with mild soap and water. Allow to air dry completely before use."
  },
  {
    question: "Will this help with my neck pain?",
    answer: "Many customers report significant reduction in neck and shoulder pain within the first few weeks of use. The ergonomic design promotes proper spinal alignment, reducing strain on your neck muscles. However, individual results may vary, and we recommend consulting with your healthcare provider for chronic pain issues."
  },
  {
    question: "What's included with my purchase?",
    answer: "Each RiseByNight pillow includes: the ergonomic pillow with cooling gel technology, a premium removable washable cover, a travel pouch, and care instructions. Bundle purchases include additional free gifts as indicated."
  }
];

export const FAQ = () => {
  return (
    <section className="py-6 md:py-8 bg-primary/5">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-6 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Frequently Asked Questions</h2>
          <p className="text-sm md:text-base text-muted-foreground">Everything you need to know about RiseByNight</p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-background rounded-lg border px-6"
            >
              <AccordionTrigger className="text-left hover:no-underline py-5">
                <span className="font-semibold">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
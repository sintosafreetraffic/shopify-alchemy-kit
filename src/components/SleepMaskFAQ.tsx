import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const SleepMaskFAQ = () => {
  const faqs = [
    {
      question: "Will the sleep mask stay in place all night?",
      answer: "Yes! The adjustable elastic strap is designed to stay secure without being too tight. It won't slip off during the night, even if you move around while sleeping."
    },
    {
      question: "Is the mask suitable for side sleepers?",
      answer: "Absolutely! The contoured design and soft silk material make it perfect for side sleepers. The mask stays in place and doesn't create uncomfortable pressure when sleeping on your side."
    },
    {
      question: "How do I clean the sleep mask?",
      answer: "Hand wash in cold water with mild detergent and air dry. The silk material is durable and easy to maintain. We recommend washing every 1-2 weeks for optimal hygiene."
    },
    {
      question: "Will it block out 100% of light?",
      answer: "Yes! Our multi-layer design with contoured eye cups creates complete darkness. The mask effectively blocks all light from streetlights, morning sun, and any ambient light sources."
    },
    {
      question: "Is it comfortable for people with sensitive skin?",
      answer: "Definitely! Made from 100% pure mulberry silk, it's naturally hypoallergenic and gentle on even the most sensitive skin. Many customers with skin sensitivities specifically choose our mask for its comfort."
    },
    {
      question: "Can I wear it with eyelash extensions?",
      answer: "Yes! The contoured eye cups create space around your eyes, so there's no pressure on your lashes or lash extensions. Your extensions will remain intact and undamaged."
    },
    {
      question: "What's your return policy?",
      answer: "We offer a 100-night risk-free trial. If you're not completely satisfied with your sleep mask, return it within 100 nights for a full refund. We also provide a 2-year warranty."
    },
    {
      question: "How long will the mask last?",
      answer: "With proper care, your RiseByNight™ Sleep Mask will last for years. The high-quality silk and durable elastic are built to withstand nightly use while maintaining their shape and effectiveness."
    }
  ];

  return (
    <section className="py-6 md:py-16 px-4 bg-background">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-6 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Frequently Asked Questions</h2>
          <p className="text-base md:text-lg text-muted-foreground">
            Everything you need to know about the RiseByNight™ Sleep Mask
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border-2 border-primary/20 rounded-xl bg-background overflow-hidden"
            >
              <AccordionTrigger className="px-4 md:px-6 py-3 md:py-4 text-left hover:no-underline hover:bg-primary/5">
                <span className="font-semibold text-sm md:text-base pr-4">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 md:px-6 pb-4 md:pb-6 text-sm md:text-base text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

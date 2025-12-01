import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const SleepBundleFAQ = () => {
  const faqs = [
    {
      question: "What products are included in the Complete Sleep Bundle?",
      answer: "The Complete Sleep Bundle includes one RiseByNight™ Ergonomic Sleep Pillow, one RiseByNight™ Ergonomic Knee Pillow, and one RiseByNight™ Silk Deep Sleep Mask. The Double Bundle includes two of each product.",
    },
    {
      question: "How much do I save with the bundle?",
      answer: "You save $30 when purchasing the Complete Sleep Bundle compared to buying each product separately. The regular combined price is $229.97, but the bundle is priced at just $199.99.",
    },
    {
      question: "Can I choose different quantities for each product?",
      answer: "The bundle comes with preset quantities to ensure the best value. Choose the Single Bundle for 1 of each product, or the Double Bundle for 2 of each product. If you need custom quantities, you can purchase products individually.",
    },
    {
      question: "Does the 100-night trial apply to the bundle?",
      answer: "Yes! The Complete Sleep Bundle comes with our 100-night risk-free trial. If you're not completely satisfied with any product in the bundle, you can return it for a full refund within 100 nights.",
    },
    {
      question: "Is the bundle suitable for all sleeping positions?",
      answer: "Absolutely! The ergonomic pillow works for back, side, and stomach sleepers. The knee pillow is perfect for side sleepers but also benefits back sleepers. The silk deep sleep mask works for everyone. Together, they provide comprehensive sleep support.",
    },
    {
      question: "How do I care for the products in the bundle?",
      answer: "The pillow and knee pillow covers are machine washable. The silk deep sleep mask should be hand-washed with cold water and mild detergent. All products come with detailed care instructions.",
    },
    {
      question: "Does the bundle come with a warranty?",
      answer: "Yes! All products in the Complete Sleep Bundle are covered by our 2-year warranty against defects in materials and workmanship. We stand behind the quality of every product.",
    },
    {
      question: "Can I gift the bundle to someone?",
      answer: "The Complete Sleep Bundle makes an excellent gift! We can include a gift message with your order. Simply add your message in the order notes at checkout.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Everything you need to know about the Complete Sleep Bundle
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-background border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-base md:text-lg pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  items: FAQItem[];
  variant?: "product" | "support";
}

export const FAQSection = ({
  title = "Frequently Asked Questions",
  subtitle,
  items,
  variant = "product",
}: FAQSectionProps) => {
  const bgClass = variant === "product" ? "bg-primary/5" : "bg-muted/30";

  return (
    <section className={`py-8 md:py-16 px-4 ${bgClass}`}>
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base md:text-lg text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {items.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-background rounded-lg border px-6"
            >
              <AccordionTrigger className="text-left hover:no-underline py-5">
                <span className="font-semibold text-sm md:text-base pr-4">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 text-sm md:text-base">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

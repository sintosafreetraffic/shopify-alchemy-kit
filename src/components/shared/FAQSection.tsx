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
    <section className={`py-4 md:py-8 lg:py-12 px-4 ${bgClass}`}>
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-4 md:mb-6 lg:mb-8">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <Accordion type="single" collapsible className="space-y-2 md:space-y-3">
          {items.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-background rounded-lg border px-3 md:px-5"
            >
              <AccordionTrigger className="text-left hover:no-underline py-3 md:py-4">
                <span className="font-semibold text-sm md:text-base pr-4">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-3 md:pb-4 text-xs md:text-sm">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

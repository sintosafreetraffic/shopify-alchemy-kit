// Reusable Chiropractor/Professional Endorsement Section
import { CheckCircle2 } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";

interface EndorsementBenefit {
  title: string;
  description: string;
}

interface ChiropractorEndorsementSectionProps {
  image: string;
  imageAlt: string;
  badge?: string;
  headline: string;
  quote: string;
  benefits: EndorsementBenefit[];
}

export const ChiropractorEndorsementSection = ({
  image,
  imageAlt,
  badge = "PROFESSIONAL ENDORSEMENT",
  headline,
  quote,
  benefits,
}: ChiropractorEndorsementSectionProps) => {
  return (
    <section className="py-4 md:py-8 lg:py-12 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-4 md:gap-8 items-center">
          <div className="order-2 md:order-1">
            <OptimizedImage 
              src={image}
              alt={imageAlt}
              width={600}
              height={400}
              className="w-full rounded-xl shadow-xl"
            />
          </div>
          
          <div className="order-1 md:order-2">
            <div className="mb-2 md:mb-4">
              <span className="inline-block px-2 md:px-3 py-0.5 md:py-1 bg-primary/10 text-primary rounded-full text-[10px] md:text-xs font-semibold mb-2">
                {badge}
              </span>
              <h2 className="text-lg md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">
                {headline}
              </h2>
            </div>
            
            <blockquote className="mb-3 md:mb-4 text-sm md:text-base text-muted-foreground italic border-l-2 md:border-l-4 border-primary pl-2 md:pl-3">
              "{quote}"
            </blockquote>
            
            <div className="space-y-2 md:space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm text-foreground">
                    <strong>{benefit.title}:</strong> {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

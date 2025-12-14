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
    <section className="py-6 md:py-16 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
          <div className="order-2 md:order-1">
            <OptimizedImage 
              src={image}
              alt={imageAlt}
              width={600}
              height={400}
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
          
          <div className="order-1 md:order-2">
            <div className="mb-4 md:mb-6">
              <span className="inline-block px-3 md:px-4 py-1 bg-primary/10 text-primary rounded-full text-xs md:text-sm font-semibold mb-3 md:mb-4">
                {badge}
              </span>
              <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
                {headline}
              </h2>
            </div>
            
            <blockquote className="mb-4 md:mb-6 text-base md:text-lg text-muted-foreground italic border-l-4 border-primary pl-3 md:pl-4">
              "{quote}"
            </blockquote>
            
            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0 mt-0.5 md:mt-1" />
                  <p className="text-sm md:text-base text-foreground">
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

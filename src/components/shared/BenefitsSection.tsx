import { LucideIcon } from "lucide-react";

interface BenefitItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface BenefitsSectionProps {
  title?: string;
  subtitle?: string;
  items: BenefitItem[];
}

export const BenefitsSection = ({
  title = "Why Choose Rise By Night?",
  subtitle = "Backed by sleep science and loved by thousands",
  items,
}: BenefitsSectionProps) => {
  return (
    <section className="py-6 md:py-10 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
            {title}
          </h2>
          <p className="text-base md:text-xl text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {items.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-3 md:mb-4">
                  <Icon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1.5 md:mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

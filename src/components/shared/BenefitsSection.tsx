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
    <section className="py-4 md:py-6 lg:py-10 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-lg md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">
            {title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {items.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 mb-2 md:mb-3">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-sm md:text-base lg:text-lg font-semibold mb-0.5 md:mb-1">
                  {benefit.title}
                </h3>
                <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">
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

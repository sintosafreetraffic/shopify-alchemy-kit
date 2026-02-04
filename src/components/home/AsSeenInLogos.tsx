import { cn } from "@/lib/utils";

interface AsSeenInLogosProps {
  className?: string;
}

/**
 * Authority/Press logos section - "As Seen In"
 * Builds trust with 55+ demographic through recognizable publication logos
 * 
 * To update logos:
 * 1. Add logo images to src/assets/press/
 * 2. Import and replace placeholder slots below
 * 3. Ensure logos are grayscale/muted for professional appearance
 */
export const AsSeenInLogos = ({ className }: AsSeenInLogosProps) => {
  // Placeholder logo slots - replace with actual press/authority logos
  const logos = [
    { name: "Health Magazine", placeholder: true },
    { name: "Sleep Foundation", placeholder: true },
    { name: "Wellness Weekly", placeholder: true },
    { name: "Medical Journal", placeholder: true },
    { name: "Spine Health", placeholder: true },
  ];

  return (
    <section className={cn("py-8 md:py-12 bg-muted/30", className)}>
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Section label */}
          <p className="text-center text-sm text-muted-foreground uppercase tracking-widest mb-6 md:mb-8">
            As Featured In
          </p>

          {/* Logo grid */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {logos.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center justify-center"
              >
                {logo.placeholder ? (
                  // Placeholder slot - replace with actual logo images
                  <div 
                    className="h-8 md:h-10 px-4 flex items-center justify-center text-muted-foreground/50 border border-dashed border-muted-foreground/30 rounded"
                    aria-label={`${logo.name} logo placeholder`}
                  >
                    <span className="text-xs font-medium whitespace-nowrap">{logo.name}</span>
                  </div>
                ) : (
                  // Real logo slot - use OptimizedImage for actual logos
                  <div className="h-8 md:h-10 opacity-60 hover:opacity-100 transition-opacity">
                    {/* Replace with: <OptimizedImage src={logo.src} alt={logo.name} className="h-full w-auto grayscale" /> */}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Optional credibility note */}
          <p className="text-center text-xs text-muted-foreground mt-6 md:mt-8">
            Recognized by leading health and wellness publications
          </p>
        </div>
      </div>
    </section>
  );
};

import sleepMaskImage from "@/assets/eye-mask-gift-new.jpg";
import { useState } from "react";

const components = [
  {
    position: "left-top",
    title: "100% Pure Mulberry Silk",
    description: "Premium grade silk that's gentle on skin and hair, naturally hypoallergenic and breathable.",
  },
  {
    position: "left-middle",
    title: "Contoured Eye Cups",
    description:
      "3D molded design that eliminates pressure on eyes while creating complete darkness without touching lashes.",
  },
  {
    position: "left-bottom",
    title: "Zero-Pressure Design",
    description:
      "Ergonomic shape distributes weight evenly around eye area, preventing any uncomfortable pressure points.",
  },
  {
    position: "right-top",
    title: "Adjustable Comfort Strap",
    description:
      "Soft elastic band with easy adjustment slider ensures perfect fit without pulling hair or leaving marks.",
  },
  {
    position: "right-middle",
    title: "Light-Blocking Technology",
    description:
      "Multi-layer construction with light-blocking fabric creates 100% darkness for optimal melatonin production.",
  },
];

export const SleepMaskLookInside = () => {
  const [expandedMobile, setExpandedMobile] = useState<number | null>(null);

  return (
    <section className="py-6 md:py-16 bg-primary/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-6 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Let's take a look inside the sleep mask</h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            The RiseByNight™ Sleep Mask is crafted with premium materials that work together to provide the perfect sleep environment.
          </p>
        </div>
        <div className="relative max-w-6xl mx-auto">
          {/* Desktop Layout with Text Cards */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-8 items-center">
            {/* Left Column - Text Cards */}
            <div className="space-y-12">
              {components
                .filter((c) => c.position.startsWith("left"))
                .map((component, idx) => (
                  <div key={idx} className="relative">
                    <div className="bg-background border-2 border-primary/20 rounded-xl p-6 shadow-lg hover:border-primary/40 transition-colors">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <h3 className="font-bold text-lg flex-1">{component.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-11">{component.description}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Center Column - Image */}
            <div className="relative flex items-center justify-center py-8">
              <div className="max-w-md mx-auto relative">
                <img
                  src={sleepMaskImage}
                  alt="RiseByNight silk sleep mask showing premium construction and materials"
                  className="w-full relative z-0 rounded-xl"
                />
              </div>
            </div>

            {/* Right Column - Text Cards */}
            <div className="space-y-20">
              {components
                .filter((c) => c.position.startsWith("right"))
                .map((component, idx) => (
                  <div key={idx} className="relative">
                    <div className="bg-background border-2 border-primary/20 rounded-xl p-6 shadow-lg hover:border-primary/40 transition-colors">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {idx + 4}
                        </div>
                        <h3 className="font-bold text-lg flex-1">{component.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-11">{component.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-8">
            <div className="max-w-md mx-auto mb-8">
              <img
                src={sleepMaskImage}
                alt="RiseByNight silk sleep mask showing premium construction and materials"
                className="w-full rounded-xl"
              />
            </div>

            <div className="space-y-4">
              {components.map((component, idx) => (
                <div key={idx} className="bg-background border-2 border-primary/20 rounded-xl p-4 shadow-lg">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <h3 className="font-bold text-base flex-1">{component.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground ml-11">{component.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-16 bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Premium Quality Materials</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every component of the RiseByNight™ Sleep Mask is crafted from certified premium materials, ensuring
            comfort, durability, and optimal sleep quality night after night.
          </p>
        </div>
      </div>
    </section>
  );
};

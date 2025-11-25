import kneePillowImage from "@/assets/knee-pillow-layers-new.png";
import { useState } from "react";
import { Shirt, Wind, Layers, MoveHorizontal, Archive } from "lucide-react";

const components = [
  {
    position: "left-top",
    title: "Outer Fabric Cover",
    description: "Quilted cotton/polyester blend that's soft, breathable, and patterned with small white cross-stitch dots. Provides comfort, protects internal foam, and improves airflow with durable stitching.",
    icon: Shirt,
  },
  {
    position: "left-middle",
    title: "Middle Mesh Layer",
    description:
      "3D breathable air-mesh that's highly ventilated and flexible. Prevents heat buildup, allows airflow around the foam, and adds structural protection while regulating temperature.",
    icon: Wind,
  },
  {
    position: "left-bottom",
    title: "Elastic Support Strap",
    description:
      "Stretchable elastic band wrapped in fabric, adjustable and comfortable against the leg. Keeps pillow in place throughout the night and prevents slipping when you change positions.",
    icon: MoveHorizontal,
  },
  {
    position: "right-top",
    title: "Inner Core",
    description:
      "High-density memory foam with slow-rebound formulation for precise pressure relief. Shaped ergonomically for leg separation, aligns hips, knees, and lower spine while maintaining shape over long-term use.",
    icon: Layers,
  },
  {
    position: "right-middle",
    title: "Zipper Opening",
    description:
      "Nylon zipper with reinforced stitching that allows removal of the fabric cover for washing, making maintenance easy and keeping your pillow fresh.",
    icon: Archive,
  },
];

export const KneePillowLookInside = () => {
  const [expandedMobile, setExpandedMobile] = useState<number | null>(null);

  return (
    <section className="py-6 md:py-16 bg-primary/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-6 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Let's take a look inside the knee pillow</h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            The RiseByNight Knee Pillow is made up of several components that work together to help you wake up pain-free every day.
          </p>
        </div>
        <div className="relative max-w-6xl mx-auto">
          {/* Desktop Layout with Text Cards and Numbered Buttons */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-8 items-center">
            {/* Left Column - Text Cards */}
            <div className="space-y-12">
              {components
                .filter((c) => c.position.startsWith("left"))
                .map((component, idx) => (
                  <div key={idx} className="relative">
                    <div className="bg-background border-2 border-primary/20 rounded-xl p-6 shadow-lg hover:border-primary/40 transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                          <component.icon size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                              {idx + 1}
                            </span>
                            <h3 className="font-bold text-lg">{component.title}</h3>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground ml-13">{component.description}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Center Column - Image */}
            <div className="relative flex items-center justify-center py-8">
              <div className="max-w-md mx-auto relative">
                <img
                  src={kneePillowImage}
                  alt="RiseByNight knee pillow showing ergonomic design and materials"
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
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                          <component.icon size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                              {idx + 4}
                            </span>
                            <h3 className="font-bold text-lg">{component.title}</h3>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground ml-13">{component.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-8">
            <div className="max-w-md mx-auto mb-8">
              <img
                src={kneePillowImage}
                alt="RiseByNight knee pillow showing ergonomic design and materials"
                className="w-full rounded-xl"
              />
            </div>

            <div className="space-y-4">
              {components.map((component, idx) => (
                <div key={idx} className="bg-background border-2 border-primary/20 rounded-xl p-4 shadow-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                      <component.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-base">{component.title}</h3>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground ml-13">{component.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-16 bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Medical-Grade Materials</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every component of the RiseByNight Knee Pillow is crafted from certified medical-grade materials, ensuring
            safety, durability, and optimal performance for years to come.
          </p>
        </div>
      </div>
    </section>
  );
};

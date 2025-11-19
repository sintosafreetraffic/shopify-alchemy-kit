import pillowLayers from "@/assets/pillow-layers-new.png";
import { useState } from "react";

const components = [
  {
    position: "left-top",
    title: "Dual-Contour Sleep Channels™",
    description: "Ergonomically designed curves that cradle your head while maintaining proper cervical alignment.",
  },
  {
    position: "left-middle",
    title: "ComfortWave Memory Foam™ Layer",
    description:
      "Sculpted beige foam layer that adapts to your unique head and neck contours, providing personalized support and pressure relief.",
  },
  {
    position: "left-bottom",
    title: "Pressure-Relief Cloud Foam™ Core",
    description:
      "High-density foam base that distributes weight evenly, reducing pressure points and providing stable foundation support throughout the night.",
  },
  {
    position: "right-top",
    title: "Quilted IceSoft Cover™",
    description:
      "Premium cooling fabric cover with temperature-regulating technology to prevent overheating during sleep.",
  },
  {
    position: "right-middle",
    title: "Adaptive Cervical Support Zone",
    description:
      "Specially engineered center region that maintains optimal neck curvature and provides targeted support for the cervical spine.",
  },
];

export const LookInside = () => {
  const [expandedMobile, setExpandedMobile] = useState<number | null>(null);

  return (
    <section className="py-16 bg-primary/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Let's take a look inside the pillow</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            The RiseByNight pillow is made up of several components that work together to help you wake up happy and
            refreshed every day.
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

            {/* Center Column - Image with Numbered Buttons */}
            <div className="relative flex items-center justify-center py-8">
              <div className="max-w-md mx-auto relative">
              <img
                src={pillowLayers}
                alt="RiseByNight pillow exploded view showing all internal layers and materials"
                className="w-full relative z-0"
              />

              {/* Number indicators with connecting lines */}
              {/* Button 1 - Beige foam layer */}
              <div className="absolute top-[32%] left-[3%] z-20">
                <svg className="absolute top-5 left-10 w-28 h-8 pointer-events-none">
                  <line
                    x1="0"
                    y1="0"
                    x2="112"
                    y2="16"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                </svg>
                <div className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  1
                </div>
              </div>

              {/* Button 2 - Beige foam layer (second layer) */}
              <div className="absolute top-[38%] left-[5%] z-20">
                <svg className="absolute top-5 left-10 w-28 h-12 pointer-events-none">
                  <line
                    x1="0"
                    y1="0"
                    x2="112"
                    y2="24"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                </svg>
                <div className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  2
                </div>
              </div>

              {/* Button 4 - Beige/tan smooth foam layer */}
              <div className="absolute top-[32%] right-[8%] z-20">
                <svg className="absolute top-5 right-10 w-24 h-12 pointer-events-none">
                  <line
                    x1="96"
                    y1="0"
                    x2="0"
                    y2="24"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                </svg>
                <div className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  4
                </div>
              </div>

              {/* Button 5 - Mesh panels */}
              <div className="absolute top-[50%] right-[5%] z-20">
                <svg className="absolute top-5 right-10 w-16 h-16 pointer-events-none">
                  <line
                    x1="64"
                    y1="0"
                    x2="0"
                    y2="32"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                </svg>
                <div className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  5
                </div>
              </div>
              {/* Button 3 - Black mesh sides (bottom layer) */}
              <div className="absolute bottom-[22%] left-[3%] z-30">
                <svg className="absolute top-1 left-10 w-64 h-20 pointer-events-none" viewBox="0 0 260 80">
                  <line
                    x1="0"
                    y1="8"
                    x2="200"
                    y2="0"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeOpacity="0.8"
                    strokeDasharray="4,4"
                  />
                </svg>
                <div className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                  3
                </div>
              </div>
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

          {/* Mobile Layout with Interactive Buttons */}
          <div className="lg:hidden space-y-8">
            <div className="max-w-md mx-auto mb-8 relative">
              <img
                src={pillowLayers}
                alt="RiseByNight pillow exploded view showing all internal layers and materials"
                className="w-full relative z-0"
              />

              {/* Number indicators with connecting lines */}
              {/* Button 1 - Beige foam layer */}
              <div className="absolute top-[32%] left-[3%] z-20">
                <svg className="absolute top-5 left-10 w-28 h-8 pointer-events-none">
                  <line
                    x1="0"
                    y1="0"
                    x2="112"
                    y2="16"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                </svg>
              <button
                  onClick={() => setExpandedMobile(expandedMobile === 0 ? null : 0)}
                  className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform animate-pulse"
                  aria-label="Show ComfortWave Memory Foam details"
                >
                  1
                </button>
              </div>

              {/* Button 2 - Beige foam layer (second layer) */}
              <div className="absolute top-[38%] left-[5%] z-20">
                <svg className="absolute top-5 left-10 w-28 h-12 pointer-events-none">
                  <line
                    x1="0"
                    y1="0"
                    x2="112"
                    y2="24"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                </svg>
              <button
                  onClick={() => setExpandedMobile(expandedMobile === 1 ? null : 1)}
                  className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform animate-pulse"
                  aria-label="Show Quilted IceSoft Cover details"
                >
                  2
                </button>
              </div>

              {/* Button 4 - Beige/tan smooth foam layer */}
              <div className="absolute top-[32%] right-[8%] z-20">
                <svg className="absolute top-5 right-10 w-24 h-12 pointer-events-none">
                  <line
                    x1="96"
                    y1="0"
                    x2="0"
                    y2="24"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                </svg>
              <button
                  onClick={() => setExpandedMobile(expandedMobile === 3 ? null : 3)}
                  className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform animate-pulse"
                  aria-label="Show Dual-Contour Sleep Channels details"
                >
                  4
                </button>
              </div>

              {/* Button 5 - Mesh panels */}
              <div className="absolute top-[50%] right-[5%] z-20">
                <svg className="absolute top-5 right-10 w-16 h-16 pointer-events-none">
                  <line
                    x1="64"
                    y1="0"
                    x2="0"
                    y2="32"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeDasharray="4,4"
                  />
                </svg>
              <button
                  onClick={() => setExpandedMobile(expandedMobile === 4 ? null : 4)}
                  className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform animate-pulse"
                  aria-label="Show AirFlow Mesh Side Panels details"
                >
                  5
                </button>
              </div>
              {/* Button 3 - Black mesh sides (bottom layer) */}
              <div className="absolute bottom-[22%] left-[3%] z-30">
                <svg className="absolute top-1 left-10 w-64 h-20 pointer-events-none" viewBox="0 0 260 80">
                  <line
                    x1="0"
                    y1="8"
                    x2="200"
                    y2="0"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeOpacity="0.8"
                    strokeDasharray="4,4"
                  />
                </svg>

              <button
                  onClick={() => setExpandedMobile(expandedMobile === 2 ? null : 2)}
                  className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform animate-pulse"
                  aria-label="Show Pressure-Relief Cloud Foam Core details"
                >
                  3
                </button>
              </div>

              {/* Information overlay */}
              {expandedMobile !== null && (
                <>
                  {/* Backdrop */}
                  <div
                    className="absolute inset-0 bg-black/60 z-30 animate-fade-in"
                    onClick={() => setExpandedMobile(null)}
                  />
                  {/* Info card */}
                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-background border-2 border-primary rounded-xl p-6 shadow-2xl z-40 animate-scale-in">
                    <button
                      onClick={() => setExpandedMobile(null)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                    <div className="flex items-start gap-3 pr-8">
                      <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {expandedMobile + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-2">{components[expandedMobile].title}</h3>
                        <p className="text-sm text-muted-foreground">{components[expandedMobile].description}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground px-4">
              Tap the numbered buttons to learn about each layer
            </p>
          </div>
        </div>
        <div className="mt-16 bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Medical-Grade Materials</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every component of the RiseByNight pillow is crafted from certified medical-grade materials, ensuring
            safety, durability, and optimal performance for years to come. Our pillows are rigorously tested to meet the
            highest quality standards.
          </p>
        </div>
      </div>
    </section>
  );
};

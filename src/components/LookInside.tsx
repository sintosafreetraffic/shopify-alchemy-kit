import pillowLayers from "@/assets/pillow-layers.png";

const components = [
  {
    position: "left-top",
    title: "Premium Bamboo Cover",
    description: "Ultra-soft, hypoallergenic bamboo fabric is naturally antibacterial and moisture-wicking. Removable and machine washable."
  },
  {
    position: "left-middle",
    title: "Ergonomic Memory Foam Core",
    description: "High-density memory foam conforms to your head and neck, providing personalized support that maintains proper spinal alignment."
  },
  {
    position: "right-middle",
    title: "Cooling Gel Layer",
    description: "Advanced cooling gel technology regulates temperature all night long, preventing heat buildup."
  },
  {
    position: "right-bottom",
    title: "Breathable Base Support",
    description: "Strategically placed ventilation channels promote airflow, keeping the pillow fresh and preventing moisture buildup."
  }
];

export const LookInside = () => {
  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Let's take a look inside the pillow</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            The RiseByNight pillow is made up of several components that work together to help you wake up happy and refreshed every day.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-8 items-center">
            {/* Left Column */}
            <div className="space-y-16">
              {components.filter(c => c.position.startsWith('left')).map((component, idx) => (
                <div key={idx} className="relative">
                  <div className="bg-background border-2 border-primary/20 rounded-xl p-6 shadow-lg hover:border-primary/40 transition-colors">
                    <h3 className="font-bold text-lg mb-2">{component.title}</h3>
                    <p className="text-sm text-muted-foreground">{component.description}</p>
                  </div>
                  {/* Connecting dot */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full z-10"></div>
                  {/* Connecting line */}
                  <div className="absolute -right-8 top-1/2 w-8 h-0.5 bg-primary/40" 
                       style={{
                         background: 'repeating-linear-gradient(to right, hsl(var(--primary)) 0, hsl(var(--primary)) 4px, transparent 4px, transparent 8px)'
                       }}>
                  </div>
                </div>
              ))}
            </div>

            {/* Center Image */}
            <div className="relative flex items-center justify-center py-8">
              <img 
                src={pillowLayers}
                alt="RiseByNight pillow exploded view showing all internal layers and materials"
                className="w-full max-w-md mx-auto"
              />
            </div>

            {/* Right Column */}
            <div className="space-y-16">
              {components.filter(c => c.position.startsWith('right')).map((component, idx) => (
                <div key={idx} className="relative">
                  <div className="bg-background border-2 border-primary/20 rounded-xl p-6 shadow-lg hover:border-primary/40 transition-colors">
                    <h3 className="font-bold text-lg mb-2">{component.title}</h3>
                    <p className="text-sm text-muted-foreground">{component.description}</p>
                  </div>
                  {/* Connecting dot */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full z-10"></div>
                  {/* Connecting line */}
                  <div className="absolute -left-8 top-1/2 w-8 h-0.5 bg-primary/40"
                       style={{
                         background: 'repeating-linear-gradient(to left, hsl(var(--primary)) 0, hsl(var(--primary)) 4px, transparent 4px, transparent 8px)'
                       }}>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-8">
            <div className="max-w-md mx-auto mb-8">
              <img 
                src={pillowLayers}
                alt="RiseByNight pillow exploded view showing all internal layers and materials"
                className="w-full"
              />
            </div>
            
            <div className="space-y-6">
              {components.map((component, idx) => (
                <div key={idx} className="bg-background border-2 border-primary/20 rounded-xl p-6 shadow-lg">
                  <h3 className="font-bold text-lg mb-2">{component.title}</h3>
                  <p className="text-sm text-muted-foreground">{component.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

...

        <div className="mt-16 bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Medical-Grade Materials</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every component of the RiseByNight pillow is crafted from certified medical-grade materials, ensuring safety, durability, and optimal performance for years to come. Our pillows are rigorously tested to meet the highest quality standards.
          </p>
        </div>
      </div>
    </section>
  );
};
import { Layers, Wind, Snowflake, Shield } from "lucide-react";

const components = [
  {
    icon: Layers,
    title: "Ergonomic Memory Foam Core",
    description: "High-density memory foam conforms to your head and neck, providing personalized support that maintains proper spinal alignment throughout the night."
  },
  {
    icon: Snowflake,
    title: "Cooling Gel Layer",
    description: "Advanced cooling gel technology regulates temperature all night long, preventing heat buildup and ensuring you stay comfortable without constantly flipping your pillow."
  },
  {
    icon: Wind,
    title: "Breathable Air Channels",
    description: "Strategically placed ventilation channels promote airflow, keeping the pillow fresh and preventing moisture buildup for a more hygienic sleep environment."
  },
  {
    icon: Shield,
    title: "Premium Bamboo Cover",
    description: "Ultra-soft, hypoallergenic bamboo fabric is naturally antibacterial and moisture-wicking. The removable cover is machine washable for easy maintenance."
  }
];

export const LookInside = () => {
  return (
    <section className="py-10 bg-secondary/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Let's take a look inside the pillow</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            The RiseByNight pillow is made up of several components that work together to help you wake up happy and refreshed every day. Discover how each one plays its part below.
          </p>
        </div>

...

        <div className="mt-12 bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Medical-Grade Materials</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every component of the RiseByNight pillow is crafted from certified medical-grade materials, ensuring safety, durability, and optimal performance for years to come. Our pillows are rigorously tested to meet the highest quality standards.
          </p>
        </div>
      </div>
    </section>
  );
};
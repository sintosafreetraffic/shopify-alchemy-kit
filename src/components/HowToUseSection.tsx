import { Moon, Clock, Sparkles } from "lucide-react";

interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
}

const steps: Step[] = [
  { 
    icon: Moon, 
    title: "1. Position", 
    description: "Place the pillow with the contoured curve supporting your neck" 
  },
  { 
    icon: Clock, 
    title: "2. Adjust", 
    description: "Allow 3-5 nights for your body to adapt to proper alignment" 
  },
  { 
    icon: Sparkles, 
    title: "3. Sleep", 
    description: "Wake up refreshed and pain-free every morning" 
  },
];

export const HowToUseSection = () => {
  return (
    <section className="py-8 md:py-12 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-6">
          How to Use Your Pillow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="flex flex-col items-center text-center p-4 bg-background rounded-xl border border-border"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

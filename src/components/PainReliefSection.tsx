import { Check } from "lucide-react";

const painTypes = [
  {
    title: "Neck Pain",
    cause: "Poor neck support during sleep forces unnatural alignment, straining muscles and ligaments in the neck. This leads to stiffness, tension, and chronic discomfort that lingers throughout the day.",
    solution: "The ergonomic contour design cradles your neck, maintaining proper cervical alignment and relieving pressure on key areas. Experience immediate relief and long-term comfort with every night's sleep."
  },
  {
    title: "Back Pain",
    cause: "A lack of proper spinal support during sleep puts stress on the lower back, creating tension and inflammation that disrupts your rest and leaves you in pain.",
    solution: "Our pillow's innovative structure aligns your spine naturally from neck to lower back. This reduces pressure and tension, promoting a neutral posture that alleviates back pain for truly restorative sleep."
  },
  {
    title: "Shoulder Tension",
    cause: "Traditional pillows force your shoulders into awkward angles, creating tightness and soreness that spreads through your upper body and affects your daily comfort.",
    solution: "Designed with special ergonomic contours, RiseByNight ensures your shoulders remain in a natural position, relieving tension and preventing soreness so you wake up feeling relaxed and refreshed."
  },
  {
    title: "Restless Sleep",
    cause: "Tossing and turning is often caused by discomfort from pressure points and inadequate support, preventing you from achieving the deep, restorative sleep your body needs.",
    solution: "High-density memory foam conforms to your unique shape, minimizing pressure points and keeping your head and neck perfectly supported. This ensures uninterrupted sleep, leaving you energized each morning."
  },
  {
    title: "Morning Headaches",
    cause: "Misaligned neck and shoulder positions restrict blood flow and cause muscle tension, triggering headaches and fatigue that affect your entire day.",
    solution: "By promoting optimal alignment, RiseByNight improves circulation and reduces tension throughout the night. Wake up pain-free, clear-headed, and ready to take on whatever the day brings."
  },
  {
    title: "Sleep Disruption",
    cause: "Poor sleeping posture and inadequate support can worsen breathing patterns and lead to interrupted sleep cycles that leave you exhausted.",
    solution: "The ergonomic design elevates and supports your head and neck, promoting proper airway alignment. This helps reduce breathing disruptions and allows for deeper, more consistent sleep quality."
  }
];

export const PainReliefSection = () => {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Relief for Every Type of Pain That – <span className="italic">Disrupts Your Sleep</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {painTypes.map((pain, index) => (
            <div key={index} className="bg-secondary/10 rounded-xl p-6 border border-border/50">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{pain.title}</h3>
              </div>
              
              <div className="space-y-4 ml-9">
                <div>
                  <p className="font-semibold text-sm mb-2">What Causes It:</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pain.cause}</p>
                </div>
                
                <div>
                  <p className="font-semibold text-sm mb-2">How RiseByNight Helps:</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pain.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
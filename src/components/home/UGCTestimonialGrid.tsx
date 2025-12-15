import { User, Quote } from "lucide-react";
import { useInView } from "@/hooks/useInView";

// Premium UGC testimonial data
const ugcTestimonials = [
  {
    id: 1,
    name: "Sarah M.",
    label: "Desk Worker",
    testimonial: "Finally wake up without that familiar neck tension. My mornings feel lighter now.",
    hashtag: "#SleepAligned",
    hasPhoto: true,
  },
  {
    id: 2,
    name: "Marcus L.",
    label: "Side Sleeper",
    testimonial: "Switching positions used to wake me up. Now I sleep through the night.",
    hashtag: "#CalmNights",
    hasPhoto: true,
  },
  {
    id: 3,
    name: "Emma R.",
    label: "Stressed Sleeper",
    testimonial: "The quality of my rest has genuinely improved. I feel more present during the day.",
    hashtag: "#MyRiseByNight",
    hasPhoto: true,
  },
  {
    id: 4,
    name: "James K.",
    label: "Athlete",
    testimonial: "Recovery starts with sleep. This pillow supports my training routine.",
    hashtag: "#SleepAligned",
    hasPhoto: true,
  },
  {
    id: 5,
    name: "Lisa T.",
    label: "Remote Worker",
    testimonial: "No more waking up stiff. My posture has improved both day and night.",
    hashtag: "#CalmNights",
    hasPhoto: true,
  },
  {
    id: 6,
    name: "David P.",
    label: "Parent",
    testimonial: "The little sleep I get now actually feels restorative. That matters.",
    hashtag: "#MyRiseByNight",
    hasPhoto: true,
  },
  {
    id: 7,
    name: "Nina S.",
    label: "Yoga Instructor",
    testimonial: "Alignment matters. This pillow understands that in a way others don't.",
    hashtag: "#SleepAligned",
    hasPhoto: true,
  },
  {
    id: 8,
    name: "Alex C.",
    label: "Night Owl",
    testimonial: "Even my shorter sleep sessions feel more effective. Quality over quantity.",
    hashtag: "#CalmNights",
    hasPhoto: true,
  },
];

// Soft Scandinavian color palette
const avatarColors = [
  "from-slate-100 to-slate-50",
  "from-stone-100 to-stone-50",
  "from-zinc-100 to-zinc-50",
  "from-neutral-100 to-neutral-50",
  "from-gray-100 to-gray-50",
  "from-slate-50 to-gray-50",
  "from-stone-50 to-neutral-50",
  "from-zinc-50 to-slate-50",
];

interface UGCCardProps {
  testimonial: typeof ugcTestimonials[0];
  index: number;
}

const UGCCard = ({ testimonial, index }: UGCCardProps) => {
  const { ref, isInView } = useInView<HTMLDivElement>({ threshold: 0.1 });
  const colorClass = avatarColors[index % avatarColors.length];
  
  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        isInView 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${(index % 4) * 80}ms` }}
    >
      <div className="group relative h-full bg-background rounded-2xl border border-border/30 p-5 md:p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-md">
        {/* Subtle quote mark */}
        <div className="absolute top-4 right-4 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity">
          <Quote className="w-8 h-8 text-primary" />
        </div>
        
        {/* Header: Avatar + Info */}
        <div className="flex items-center gap-3 mb-4">
          {/* Circular avatar placeholder */}
          <div className={`w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center ring-2 ring-background shadow-sm`}>
            {testimonial.hasPhoto ? (
              <img 
                src={`/images/ugc/${testimonial.id}.webp`} 
                alt={testimonial.name}
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <User className="w-5 h-5 text-muted-foreground/50" />
            )}
          </div>
          
          {/* Name & Label */}
          <div>
            <p className="font-medium text-foreground text-sm leading-tight">
              {testimonial.name}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {testimonial.label}
            </p>
          </div>
        </div>
        
        {/* Testimonial */}
        <p className="text-foreground/75 text-sm leading-relaxed mb-4">
          "{testimonial.testimonial}"
        </p>
        
        {/* Hashtag */}
        <span className="inline-block text-[11px] font-medium text-primary/60 tracking-wide">
          {testimonial.hashtag}
        </span>
      </div>
    </div>
  );
};

export const UGCTestimonialGrid = () => {
  return (
    <section className="py-12 md:py-16 bg-muted/10">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-10">
          <p className="text-xs md:text-sm uppercase tracking-widest text-primary/70 font-medium mb-3">
            The Collective
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground mb-4 tracking-tight">
            Loved By Real Sleepers
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed">
            Calm mornings, better days. Hear from people who found their rest.
          </p>
        </div>
        
        {/* UGC Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 max-w-7xl mx-auto">
          {ugcTestimonials.map((testimonial, index) => (
            <UGCCard key={testimonial.id} testimonial={testimonial} index={index} />
          ))}
        </div>
        
        {/* Subtle bottom note */}
        <p className="text-center text-[11px] text-muted-foreground/50 mt-8">
          Real experiences from our community. Individual results may vary.
        </p>
      </div>
    </section>
  );
};

export default UGCTestimonialGrid;

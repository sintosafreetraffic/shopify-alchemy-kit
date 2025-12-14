import { User } from "lucide-react";

// Premium UGC testimonial data
const ugcTestimonials = [
  {
    id: 1,
    name: "Sarah M.",
    label: "Desk Worker",
    testimonial: "Finally wake up without that familiar neck tension. My mornings feel lighter now.",
    hashtag: "#SleepAligned",
    hasPhoto: false,
  },
  {
    id: 2,
    name: "Marcus L.",
    label: "Side Sleeper",
    testimonial: "Switching positions used to wake me up. Now I sleep through the night.",
    hashtag: "#CalmNights",
    hasPhoto: false,
  },
  {
    id: 3,
    name: "Emma R.",
    label: "Stressed Sleeper",
    testimonial: "The quality of my rest has genuinely improved. I feel more present during the day.",
    hashtag: "#MyRiseByNight",
    hasPhoto: false,
  },
  {
    id: 4,
    name: "James K.",
    label: "Athlete",
    testimonial: "Recovery starts with sleep. This pillow supports my training routine.",
    hashtag: "#SleepAligned",
    hasPhoto: false,
  },
  {
    id: 5,
    name: "Lisa T.",
    label: "Remote Worker",
    testimonial: "No more waking up stiff. My posture has improved both day and night.",
    hashtag: "#CalmNights",
    hasPhoto: false,
  },
  {
    id: 6,
    name: "David P.",
    label: "Parent",
    testimonial: "The little sleep I get now actually feels restorative. That matters.",
    hashtag: "#MyRiseByNight",
    hasPhoto: false,
  },
  {
    id: 7,
    name: "Nina S.",
    label: "Yoga Instructor",
    testimonial: "Alignment matters. This pillow understands that in a way others don't.",
    hashtag: "#SleepAligned",
    hasPhoto: false,
  },
  {
    id: 8,
    name: "Alex C.",
    label: "Night Owl",
    testimonial: "Even my shorter sleep sessions feel more effective. Quality over quantity.",
    hashtag: "#CalmNights",
    hasPhoto: false,
  },
];

// Soft color palette for anonymous avatars (Scandinavian pastels)
const avatarColors = [
  "from-blue-100 to-blue-50",
  "from-stone-100 to-stone-50",
  "from-amber-50 to-orange-50",
  "from-emerald-50 to-teal-50",
  "from-violet-50 to-purple-50",
  "from-rose-50 to-pink-50",
  "from-sky-100 to-cyan-50",
  "from-slate-100 to-gray-50",
];

interface UGCCardProps {
  testimonial: typeof ugcTestimonials[0];
  index: number;
}

const UGCCard = ({ testimonial, index }: UGCCardProps) => {
  const colorClass = avatarColors[index % avatarColors.length];
  
  return (
    <div className="group relative bg-background rounded-2xl border border-border/40 p-5 md:p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      {/* Subtle pillow silhouette watermark */}
      <div className="absolute top-3 right-3 w-8 h-8 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary w-full h-full">
          <path d="M20 8c0-2.21-1.79-4-4-4H8C5.79 4 4 5.79 4 8v8c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V8zm-2 8c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v8z"/>
        </svg>
      </div>
      
      {/* Header: Avatar + Info */}
      <div className="flex items-center gap-3 mb-4">
        {/* Circular avatar placeholder */}
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center ring-2 ring-background shadow-sm`}>
          {testimonial.hasPhoto ? (
            <img 
              src={`/images/ugc/${testimonial.id}.webp`} 
              alt={testimonial.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground/60" />
          )}
        </div>
        
        {/* Name & Label */}
        <div>
          <p className="font-medium text-foreground text-sm md:text-base leading-tight">
            {testimonial.name}
          </p>
          <p className="text-xs md:text-sm text-muted-foreground/80">
            {testimonial.label}
          </p>
        </div>
      </div>
      
      {/* Testimonial */}
      <p className="text-foreground/80 text-sm md:text-[15px] leading-relaxed mb-4">
        "{testimonial.testimonial}"
      </p>
      
      {/* Hashtag */}
      <span className="inline-block text-xs font-medium text-primary/70 tracking-wide">
        {testimonial.hashtag}
      </span>
    </div>
  );
};

export const UGCTestimonialGrid = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
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
        
        {/* UGC Grid - 2 cols mobile, 3 cols tablet, 4 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 max-w-7xl mx-auto">
          {ugcTestimonials.map((testimonial, index) => (
            <UGCCard key={testimonial.id} testimonial={testimonial} index={index} />
          ))}
        </div>
        
        {/* Subtle bottom note */}
        <p className="text-center text-xs text-muted-foreground/60 mt-10 md:mt-12">
          Real experiences from our community. Individual results may vary.
        </p>
      </div>
    </section>
  );
};

export default UGCTestimonialGrid;

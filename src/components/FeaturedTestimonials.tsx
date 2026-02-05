import { Star, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import OptimizedImage from "@/components/OptimizedImage";
import erikAvatar from "@/assets/reviewer-erik.webp";
import sofieAvatar from "@/assets/reviewer-sofie.webp";

interface Testimonial {
  name: string;
  role: string;
  timeAgo: string;
  content: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Erik Thompson",
    role: "Office Worker",
    timeAgo: "2 weeks ago",
    avatar: erikAvatar,
    content:
      "After sitting at a desk all day, my neck used to feel like concrete. I've tried six pillows in three years and this is the first one that actually works. The contour supports exactly where my neck needs it most. No more waking up grimacing and stretching!",
  },
  {
    name: "Sofie Martinez",
    role: "Side Sleeper",
    timeAgo: "3 weeks ago",
    avatar: sofieAvatar,
    content:
      "Finally found one that works! I'm a side sleeper and always had issues with my pillow being too flat or causing pressure on my ear. This pillow fills the gap perfectly and I don't wake up with shoulder pain anymore. No more readjusting during the night!",
  },
];

export const FeaturedTestimonials = () => {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl md:text-3xl font-bold">4.8/5</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < 5 ? "fill-[hsl(var(--star))] text-[hsl(var(--star))]" : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Customer Reviews</h2>
          <p className="text-muted-foreground">What do our customers say?</p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card border rounded-xl p-6 shadow-sm"
            >
              {/* Header with Avatar */}
              <div className="flex items-start gap-4 mb-4">
                <OptimizedImage
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/10"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{testimonial.name}</span>
                    <Badge
                      variant="secondary"
                      className="text-xs flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <span className="text-xs text-muted-foreground">{testimonial.timeAgo}</span>
                  </div>
                </div>
              </div>

              {/* Stars */}
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-[hsl(var(--star))] text-[hsl(var(--star))]"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {testimonial.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

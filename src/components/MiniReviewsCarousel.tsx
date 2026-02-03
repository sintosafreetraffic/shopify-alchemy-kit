import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

// Reviewer avatars for 55+ demographic - 5 unique avatars
import avatar1 from "@/assets/reviewer-avatar-1.jpg";
import avatar2 from "@/assets/reviewer-avatar-2.jpg";
import avatar3 from "@/assets/reviewer-avatar-3.jpg";
import avatar4 from "@/assets/reviewer-avatar-4.jpg";
import avatar5 from "@/assets/reviewer-erik.webp";

// Hardcoded mini reviews for neck pain - 5 different 55+ customers with unique avatars
const miniReviews = [
  {
    id: "mini-1",
    customer_name: "Margaret Williams",
    avatar: avatar2,
    rating: 5,
    body: "I'm 61 in Minnesota and I was waking with neck and shoulder pain most mornings. After a week on this pillow it's basically gone. I didn't think a pillow could do that but it did.",
    city: "Minneapolis, MN",
  },
  {
    id: "mini-2",
    customer_name: "Robert Johnson",
    avatar: avatar3,
    rating: 5,
    body: "My neck pain was every day from side sleeping and my shoulders were tight too. This keeps my head level and the neck pain stopped. I still get normal aches sometimes but not that sharp morning neck thing.",
    city: "Los Angeles, CA",
  },
  {
    id: "mini-3",
    customer_name: "Patricia Anderson",
    avatar: avatar4,
    rating: 5,
    body: "I had that constant stiff neck feeling like I slept wrong. Since switching to this I wake up and my neck feels normal again. No more neck and shoulder pain first thing in the morning.",
    city: "St. Paul, MN",
  },
  {
    id: "mini-4",
    customer_name: "David Patterson",
    avatar: avatar1,
    rating: 5,
    body: "I tried different pillows and nothing fixed it because they go flat. This one holds the height and my neck pain is gone like 90%. I can turn my head in the morning without wincing.",
    city: "New York, NY",
  },
  {
    id: "mini-5",
    customer_name: "Susan Miller",
    avatar: avatar5,
    rating: 5,
    body: "I was skeptical but I don't wake up with the neck pain anymore. My shoulders aren't up by my ears all night either. It just keeps me lined up better on my side.",
    city: "Duluth, MN",
  },
];

interface MiniReviewsCarouselProps {
  productHandle?: string;
  autoPlayInterval?: number;
}

export const MiniReviewsCarousel = ({ 
  productHandle = "ergonomic-pillow",
  autoPlayInterval = 10000 
}: MiniReviewsCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [api, autoPlayInterval]);

  // Track current slide
  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm relative">
      {/* Carousel - full width */}
      <Carousel 
        setApi={setApi} 
        opts={{ loop: true }}
        className="w-full"
      >
        <CarouselContent>
          {miniReviews.map((review) => (
            <CarouselItem key={review.id}>
              <div className="px-3 py-3">
                {/* Review text - readable size for 55+, text flows under arrows */}
                <p className="text-sm sm:text-base text-foreground leading-relaxed mb-2">
                  "{review.body}"
                </p>

                {/* Author row with avatar, name, city, and stars - compact */}
                <div className="flex items-center gap-2">
                  <img
                    src={review.avatar}
                    alt={review.customer_name}
                    className="w-9 h-9 rounded-full object-cover border border-primary/10 flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {review.customer_name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {review.city}
                    </span>
                    {/* Stars - smaller, next to city */}
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Overlay arrows - very transparent, positioned on sides */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-transparent hover:bg-muted/10 transition-colors z-10"
        aria-label="Previous review"
      >
        <ChevronLeft className="w-4 h-4 text-muted-foreground/40" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-transparent hover:bg-muted/10 transition-colors z-10"
        aria-label="Next review"
      >
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </button>
    </div>
  );
};

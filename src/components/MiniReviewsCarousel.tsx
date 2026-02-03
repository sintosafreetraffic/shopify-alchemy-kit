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
    body: "I'm 65, always slept on my side and my old pillows were either too low or flattened by morning and I'd wake with the neck wrecked. This one actually keeps its shape.",
    city: "Minneapolis, MN",
  },
  {
    id: "mini-2",
    customer_name: "Robert Johnson",
    avatar: avatar3,
    rating: 5,
    body: "I put off buying an expensive pillow for ages, felt like madness spending that on one pillow. But the pain in my neck and shoulder was every morning and this has helped a lot.",
    city: "Los Angeles, CA",
  },
  {
    id: "mini-3",
    customer_name: "Patricia Anderson",
    avatar: avatar4,
    rating: 5,
    body: "I had one of those contour ones from IKEA and it just wasn't high enough for me. Kept waking stiff through the neck. This sits better for my shoulders.",
    city: "St. Paul, MN",
  },
  {
    id: "mini-4",
    customer_name: "David Patterson",
    avatar: avatar1,
    rating: 5,
    body: "I tried firm foam before and it was far too hard on me, like sleeping on wood. This is still supportive but not punishing on the neck.",
    city: "New York, NY",
  },
  {
    id: "mini-5",
    customer_name: "Susan Miller",
    avatar: avatar5,
    rating: 5,
    body: "Took a couple nights to settle into it, not going to lie. But after that the neck and shoulders were far less tight when I got up.",
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
              <div className="px-10 py-4">
                {/* Review text - readable size for 55+ */}
                <p className="text-sm sm:text-base text-foreground leading-relaxed mb-3">
                  "{review.body}"
                </p>

                {/* Author row with avatar, name, city, and stars */}
                <div className="flex items-center gap-3">
                  <img
                    src={review.avatar}
                    alt={review.customer_name}
                    className="w-10 h-10 rounded-full object-cover border border-primary/10 flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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

      {/* Overlay arrows - transparent, positioned on sides */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-transparent hover:bg-muted/20 transition-colors z-10"
        aria-label="Previous review"
      >
        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center bg-transparent hover:bg-muted/20 transition-colors z-10"
        aria-label="Next review"
      >
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
};

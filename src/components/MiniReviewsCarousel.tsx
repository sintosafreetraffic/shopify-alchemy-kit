import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

// Reviewer avatars for 55+ demographic
import avatar1 from "@/assets/reviewer-avatar-1.jpg";
import avatar2 from "@/assets/reviewer-avatar-2.jpg";
import avatar3 from "@/assets/reviewer-avatar-3.jpg";
import avatar4 from "@/assets/reviewer-avatar-4.jpg";

// Hardcoded mini reviews for neck pain - 5 different 55+ customers
const miniReviews = [
  {
    id: "mini-1",
    customer_name: "Margaret Williams",
    avatar: avatar2,
    rating: 5,
    body: "I'm 65, always slept on my side and my old pillows were either too low or flattened by morning and I'd wake with the neck wrecked. This one actually keeps its shape.",
    is_verified_purchase: true,
  },
  {
    id: "mini-2",
    customer_name: "Robert Johnson",
    avatar: avatar3,
    rating: 5,
    body: "I put off buying an expensive pillow for ages, felt like madness spending that on one pillow. But the pain in my neck and shoulder was every morning and this has helped a lot.",
    is_verified_purchase: true,
  },
  {
    id: "mini-3",
    customer_name: "Patricia Anderson",
    avatar: avatar4,
    rating: 5,
    body: "I had one of those contour ones from IKEA and it just wasn't high enough for me. Kept waking stiff through the neck. This sits better for my shoulders.",
    is_verified_purchase: true,
  },
  {
    id: "mini-4",
    customer_name: "David Patterson",
    avatar: avatar1,
    rating: 5,
    body: "I tried firm foam before and it was far too hard on me, like sleeping on wood. This is still supportive but not punishing on the neck.",
    is_verified_purchase: true,
  },
  {
    id: "mini-5",
    customer_name: "Susan Miller",
    avatar: avatar2,
    rating: 5,
    body: "Took a couple nights to settle into it, not going to lie. But after that the neck and shoulders were far less tight when I got up.",
    is_verified_purchase: true,
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
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
      {/* Carousel with side arrows */}
      <div className="flex items-center">
        {/* Left arrow */}
        <button
          onClick={scrollPrev}
          className="flex-shrink-0 p-2 hover:bg-muted/50 transition-colors"
          aria-label="Previous review"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Carousel */}
        <Carousel 
          setApi={setApi} 
          opts={{ loop: true }}
          className="flex-1 min-w-0"
        >
          <CarouselContent>
            {miniReviews.map((review) => (
              <CarouselItem key={review.id}>
                <div className="py-4 px-2">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <img
                        src={review.avatar}
                        alt={review.customer_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-primary/10"
                        loading="lazy"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Stars */}
                      <div className="flex gap-0.5 mb-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-muted text-muted"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Review text */}
                      <p className="text-sm text-foreground leading-relaxed line-clamp-3 mb-2">
                        "{review.body}"
                      </p>

                      {/* Author */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {review.customer_name}
                        </p>
                        {review.is_verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Right arrow */}
        <button
          onClick={scrollNext}
          className="flex-shrink-0 p-2 hover:bg-muted/50 transition-colors"
          aria-label="Next review"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useProductReviews } from "@/hooks/useProductReviews";
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

const avatarMap: Record<string, string> = {
  "Brian O'Connor": avatar1,
  "Margaret Williams": avatar2,
  "David Patterson": avatar3,
  "Jennifer Walsh": avatar4,
  "Michael Torres": avatar1,
  "Susan Miller": avatar2,
  "Robert Johnson": avatar3,
  "Patricia Anderson": avatar4,
};

// Fallback avatars by index
const avatarFallbacks = [avatar1, avatar2, avatar3, avatar4];

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
  const { data: reviews, isLoading } = useProductReviews(productHandle, 10, "helpful");

  // Auto-advance carousel
  useEffect(() => {
    if (!api || !reviews?.length) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [api, reviews?.length, autoPlayInterval]);

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

  const getAvatar = (name: string, index: number) => {
    return avatarMap[name] || avatarFallbacks[index % avatarFallbacks.length];
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-5 animate-pulse border border-border/50">
        <div className="h-24 bg-muted/50 rounded" />
      </div>
    );
  }

  if (!reviews?.length) return null;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Quote className="w-4 h-4 text-primary/60" />
          <p className="text-sm font-medium text-foreground">What Customers Say</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={scrollPrev}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={scrollNext}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Next review"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <Carousel 
        setApi={setApi} 
        opts={{ loop: true }}
        className="w-full"
      >
        <CarouselContent>
          {reviews.map((review, index) => (
            <CarouselItem key={review.id}>
              <div className="p-5">
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <img
                      src={getAvatar(review.customer_name, index)}
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

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 pb-4">
        {reviews.slice(0, 6).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              current === index 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to review ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

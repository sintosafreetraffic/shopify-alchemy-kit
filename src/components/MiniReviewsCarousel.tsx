import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useProductReviews } from "@/hooks/useProductReviews";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

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

  if (isLoading) {
    return (
      <div className="bg-muted/30 rounded-xl p-4 animate-pulse">
        <div className="h-20 bg-muted/50 rounded" />
      </div>
    );
  }

  if (!reviews?.length) return null;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-primary">Customer Reviews</p>
        <div className="flex gap-1">
          <button
            onClick={scrollPrev}
            className="p-1 rounded-full hover:bg-primary/10 transition-colors"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={scrollNext}
            className="p-1 rounded-full hover:bg-primary/10 transition-colors"
            aria-label="Next review"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <Carousel 
        setApi={setApi} 
        opts={{ loop: true }}
        className="w-full"
      >
        <CarouselContent>
          {reviews.map((review, index) => (
            <CarouselItem key={review.id}>
              <div className="space-y-2">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= review.rating
                          ? "fill-yellow-500 text-yellow-500"
                          : "fill-muted text-muted"
                      }`}
                    />
                  ))}
                </div>

                {/* Review text */}
                <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed">
                  "{review.body}"
                </p>

                {/* Author */}
                <p className="text-xs text-muted-foreground font-medium">
                  — {review.customer_name}
                  {review.is_verified_purchase && (
                    <span className="ml-1.5 text-green-600 dark:text-green-400">✓ Verified</span>
                  )}
                </p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {reviews.slice(0, 5).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              current === index ? "bg-primary" : "bg-primary/30"
            }`}
            aria-label={`Go to review ${index + 1}`}
          />
        ))}
        {reviews.length > 5 && (
          <span className="text-[10px] text-muted-foreground ml-1">+{reviews.length - 5}</span>
        )}
      </div>
    </div>
  );
};

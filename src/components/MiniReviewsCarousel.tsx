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
    body: "I'm 61 from Minnesota and sleep on my side year round and my neck was stiff every single morning because my old pillows kept flattening out. This one actually keeps the height and I wake up way less crooked.",
    city: "Minneapolis, MN",
  },
  {
    id: "mini-2",
    customer_name: "Robert Johnson",
    avatar: avatar3,
    rating: 5,
    body: "I tried stacking two pillows for years because nothing was tall enough for my shoulders but then my neck would be bent funny. This finally hits the right height and my neck isn't screaming when I get up.",
    city: "Los Angeles, CA",
  },
  {
    id: "mini-3",
    customer_name: "Patricia Anderson",
    avatar: avatar4,
    rating: 5,
    body: "I didn't want to spend real money on another pillow after the whole pillow graveyard situation but most of mine went flat or were too bulky in the middle. This one keeps my neck straight through the night.",
    city: "St. Paul, MN",
  },
  {
    id: "mini-4",
    customer_name: "David Patterson",
    avatar: avatar1,
    rating: 5,
    body: "I sleep on my side and my neck pain always came from my head being pushed too high or sinking too low depending on the pillow. This one stays more even and that alone helped a lot.",
    city: "New York, NY",
  },
  {
    id: "mini-5",
    customer_name: "Susan Miller",
    avatar: avatar5,
    rating: 5,
    body: "Took a couple nights to get used to because it's firmer than my old fluffy ones but once I settled in the neck pain eased up and I stopped waking stiff every morning.",
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

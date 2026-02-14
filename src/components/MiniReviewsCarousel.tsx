import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { PillowFocus } from "@/config/pillowFocusContent";

// Reviewer avatars for 55+ demographic - 5 unique avatars
import margaretAvatar from "@/assets/avatars/margaret-williams-avatar.webp";
import robertAvatar from "@/assets/avatars/robert-johnson-avatar.webp";
import patriciaAvatar from "@/assets/avatars/patricia-anderson-avatar.webp";
import davidAvatar from "@/assets/avatars/david-patterson-avatar.webp";
import susanAvatar from "@/assets/avatars/susan-miller-avatar.webp";

// Neck pain focused reviews
const neckPainReviews = [
  {
    id: "mini-neck-1",
    customer_name: "Margaret Williams",
    avatar: margaretAvatar,
    rating: 5,
    body: "I'm 61 in Minnesota and I was waking with neck and shoulder pain most mornings. After a week on this pillow it's basically gone. I didn't think a pillow could do that but it did.",
    city: "Minneapolis, MN",
  },
  {
    id: "mini-neck-2",
    customer_name: "Robert Johnson",
    avatar: robertAvatar,
    rating: 5,
    body: "My neck pain was every day from side sleeping and my shoulders were tight too. This keeps my head level and the neck pain stopped. I still get normal aches sometimes but not that sharp morning neck thing.",
    city: "Los Angeles, CA",
  },
  {
    id: "mini-neck-3",
    customer_name: "Patricia Anderson",
    avatar: patriciaAvatar,
    rating: 5,
    body: "I had that constant stiff neck feeling like I slept wrong. Since switching to this I wake up and my neck feels normal again. No more neck and shoulder pain first thing in the morning.",
    city: "St. Paul, MN",
  },
  {
    id: "mini-neck-4",
    customer_name: "David Patterson",
    avatar: davidAvatar,
    rating: 5,
    body: "I tried different pillows and nothing fixed it because they go flat. This one holds the height and my neck pain is gone like 90%. I can turn my head in the morning without wincing.",
    city: "New York, NY",
  },
  {
    id: "mini-neck-5",
    customer_name: "Susan Miller",
    avatar: susanAvatar,
    rating: 5,
    body: "I was skeptical but I don't wake up with the neck pain anymore. My shoulders aren't up by my ears all night either. It just keeps me lined up better on my side.",
    city: "Duluth, MN",
  },
];

// Back pain focused reviews
const backPainReviews = [
  {
    id: "mini-back-1",
    customer_name: "Margaret Williams",
    avatar: margaretAvatar,
    rating: 5,
    body: "I'm 64 in Minnesota and I used to wake up with lower back pain almost every morning. After a week on this pillow it's mostly gone. I didn't think a pillow could change that but here we are.",
    city: "Minneapolis, MN",
  },
  {
    id: "mini-back-2",
    customer_name: "Robert Johnson",
    avatar: robertAvatar,
    rating: 5,
    body: "Side sleeping always left my back sore when I got up. Since switching to this I wake up without that deep ache in my back anymore. Not perfect every day but a huge difference.",
    city: "Los Angeles, CA",
  },
  {
    id: "mini-back-3",
    customer_name: "Patricia Anderson",
    avatar: patriciaAvatar,
    rating: 5,
    body: "I had back pain for years and kept blaming the mattress. Turns out my pillow was throwing everything off. This keeps my body lined up and the back pain stopped.",
    city: "St. Paul, MN",
  },
  {
    id: "mini-back-4",
    customer_name: "David Patterson",
    avatar: davidAvatar,
    rating: 5,
    body: "I was stacking pillows and messing with my setup trying to fix my back pain. This one fixed it way faster than I expected. I wake up and my back just feels normal now.",
    city: "New York, NY",
  },
  {
    id: "mini-back-5",
    customer_name: "Susan Miller",
    avatar: susanAvatar,
    rating: 5,
    body: "Took a couple nights to get used to but I don't get that stiff back feeling in the morning anymore. I sleep on my side and this keeps me straighter through the night.",
    city: "Duluth, MN",
  },
];

// Country-specific reviewer overrides for first 3 slots (name + city)
const COUNTRY_REVIEWERS: Record<string, Array<{ name: string; city: string }>> = {
  NL: [
    { name: "Marijke de Vries", city: "Amsterdam" },
    { name: "Henk Bakker", city: "Rotterdam" },
    { name: "Anneke van Dijk", city: "Utrecht" },
  ],
  GB: [
    { name: "Margaret Thompson", city: "London" },
    { name: "Robert Clarke", city: "Manchester" },
    { name: "Patricia Hughes", city: "Edinburgh" },
  ],
  AU: [
    { name: "Margaret Thompson", city: "Sydney" },
    { name: "Robert Clarke", city: "Melbourne" },
    { name: "Patricia Hughes", city: "Brisbane" },
  ],
  NZ: [
    { name: "Margaret Thompson", city: "Auckland" },
    { name: "Robert Clarke", city: "Wellington" },
    { name: "Patricia Hughes", city: "Christchurch" },
  ],
  SE: [
    { name: "Margareta Lindqvist", city: "Stockholm" },
    { name: "Robert Eriksson", city: "Gothenburg" },
    { name: "Patricia Nilsson", city: "Malmö" },
  ],
  NO: [
    { name: "Margareta Haugen", city: "Oslo" },
    { name: "Robert Bakke", city: "Bergen" },
    { name: "Patricia Larsen", city: "Trondheim" },
  ],
  DK: [
    { name: "Margarete Jensen", city: "Copenhagen" },
    { name: "Robert Nielsen", city: "Aarhus" },
    { name: "Patricia Madsen", city: "Odense" },
  ],
  DE: [
    { name: "Margarete Fischer", city: "Berlin" },
    { name: "Robert Müller", city: "Munich" },
    { name: "Patricia Weber", city: "Hamburg" },
  ],
  FR: [
    { name: "Marguerite Dupont", city: "Paris" },
    { name: "Robert Martin", city: "Lyon" },
    { name: "Patricia Bernard", city: "Marseille" },
  ],
  CA: [
    { name: "Margaret Thompson", city: "Toronto" },
    { name: "Robert Clarke", city: "Vancouver" },
    { name: "Patricia Hughes", city: "Calgary" },
  ],
};

// Apply Eurozone countries that share the same set as their closest match
const EUROZONE_REVIEWER_FALLBACKS: Record<string, string> = {
  AT: 'DE', BE: 'NL', HR: 'DE', CY: 'DE', EE: 'DE',
  FI: 'SE', GR: 'DE', IE: 'GB', IT: 'FR', LV: 'DE',
  LT: 'DE', LU: 'DE', MT: 'GB', PT: 'ES', SK: 'DE',
  SI: 'DE', ES: 'FR',
};

function getLocalizedReviews(
  baseReviews: typeof neckPainReviews,
  buyerCountry?: string
): typeof neckPainReviews {
  if (!buyerCountry || buyerCountry === 'US') return baseReviews;

  const countryKey = COUNTRY_REVIEWERS[buyerCountry]
    ? buyerCountry
    : EUROZONE_REVIEWER_FALLBACKS[buyerCountry] || null;

  if (!countryKey || !COUNTRY_REVIEWERS[countryKey]) return baseReviews;

  const overrides = COUNTRY_REVIEWERS[countryKey];
  return baseReviews.map((review, i) => {
    if (i < 3 && overrides[i]) {
      return {
        ...review,
        customer_name: overrides[i].name,
        city: overrides[i].city,
      };
    }
    return review;
  });
}

interface MiniReviewsCarouselProps {
  productHandle?: string;
  pillowFocus?: PillowFocus;
  autoPlayInterval?: number;
  buyerCountry?: string;
}

export const MiniReviewsCarousel = ({ 
  productHandle = "ergonomic-pillow",
  pillowFocus = "neck",
  autoPlayInterval = 10000,
  buyerCountry,
}: MiniReviewsCarouselProps) => {
  const baseReviews = pillowFocus === "back" ? backPainReviews : neckPainReviews;
  const reviews = getLocalizedReviews(baseReviews, buyerCountry);
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
          {reviews.map((review) => (
            <CarouselItem key={review.id}>
              <div className="px-3 py-3">
                {/* Review text - readable size for 55+, text flows under arrows */}
                <p className="text-sm sm:text-base text-foreground leading-relaxed mb-2 line-clamp-4">
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
                              ? "fill-[hsl(var(--star))] text-[hsl(var(--star))]"
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

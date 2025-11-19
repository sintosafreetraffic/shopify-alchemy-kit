import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import erikAvatar from "@/assets/reviewer-erik.jpg";
import sofieAvatar from "@/assets/reviewer-sofie.jpg";
import coupleAvatar from "@/assets/reviewer-couple.jpg";
import lunaAvatar from "@/assets/reviewer-luna.jpg";
import hannahAvatar from "@/assets/reviewer-hannah.jpg";

const reviews = [
  {
    name: "Erik Thompson",
    role: "Office Worker",
    avatar: erikAvatar,
    rating: 5,
    date: "2 weeks ago",
    review: "After sitting at a desk all day, my neck used to feel like concrete. I've tried six pillows in three years and this is the first one that actually works. The contour supports exactly where my neck needs it most. No more waking up grimacing and stretching!",
    verified: true
  },
  {
    name: "Sofie Martinez",
    role: "Side Sleeper",
    avatar: sofieAvatar,
    rating: 5,
    date: "3 weeks ago",
    review: "Finally found one that works! I'm a side sleeper and always had issues with my pillow being too flat or causing pressure on my ear. This pillow fills the gap perfectly and I don't wake up with shoulder pain anymore. No more readjusting during the night!",
    verified: true
  },
  {
    name: "Mark & Maria Chen",
    role: "Happy Couple",
    avatar: coupleAvatar,
    rating: 5,
    date: "1 month ago",
    review: "Maria says I've stopped snoring! I was skeptical a pillow could help, but the ergonomic design really does open your airways. We both wake up refreshed now. Best investment in our sleep we've made together.",
    verified: true
  },
  {
    name: "Luna Rodriguez",
    role: "Wellness Enthusiast",
    avatar: lunaAvatar,
    rating: 5,
    date: "2 weeks ago",
    review: "As someone who does yoga daily, sleep quality is crucial for recovery. This pillow is the perfect blend of science and wellness - the memory foam and cooling cover are premium quality. My upper back tension is gone and I wake up ready for my morning practice!",
    verified: true
  },
  {
    name: "Hannah Wilson",
    role: "Busy Mom",
    avatar: hannahAvatar,
    rating: 5,
    date: "1 week ago",
    review: "With two kids, I don't get many hours of sleep, so the quality matters even more. This pillow just works - relief tonight, wake up refreshed tomorrow. Even when I only get 5 hours, I wake up with way less neck tension. Worth every penny!",
    verified: true
  }
];

export const ReviewsSection = () => {
  return (
    <section className="py-8 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <span className="text-2xl font-bold">4.8/5</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">12,500+ reviews on RiseByNight</h2>
          <p className="text-lg text-muted-foreground mb-2">What do our customers say?</p>
          <p className="text-muted-foreground">Read the reviews and see what others think of their experience with us.</p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {reviews.map((review, index) => (
              <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <div className="bg-secondary/20 rounded-xl p-6 border h-full">
                  <div className="flex flex-col items-center text-center mb-4">
                    <img 
                      src={review.avatar} 
                      alt={review.name}
                      className="w-28 h-28 rounded-full object-cover mb-3 ring-4 ring-primary/10"
                    />
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <p className="font-semibold">{review.name}</p>
                        {review.verified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{review.role}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex justify-center mb-3">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.review}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
};
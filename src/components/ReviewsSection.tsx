import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import testimonialAvatar from "@/assets/testimonial.png";

const reviews = [
  {
    name: "Sarah Johnson",
    rating: 5,
    date: "2 weeks ago",
    review: "This pillow has completely transformed my sleep! I used to wake up with neck pain every morning, but that's completely gone now. The cooling gel really works too - no more flipping the pillow to find the cool side!",
    verified: true
  },
  {
    name: "Michael Chen",
    rating: 5,
    date: "1 month ago",
    review: "My wife says I've stopped snoring! I was skeptical at first, but the ergonomic design really does keep your airways open. Best investment in my health I've made this year.",
    verified: true
  },
  {
    name: "Emma Rodriguez",
    rating: 5,
    date: "3 weeks ago",
    review: "I have chronic neck issues and have tried countless pillows. The OptiSleep is the only one that provides proper support throughout the night. Worth every penny!",
    verified: true
  },
  {
    name: "David Thompson",
    rating: 4,
    date: "1 week ago",
    review: "Great pillow overall. Took about a week to get used to the shape, but now I can't sleep without it. The quality is outstanding and it's still like new after a month of use.",
    verified: true
  }
];

export const ReviewsSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <span className="text-2xl font-bold">4.8/5</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">12,500+ reviews on OptiSleep</h2>
          <p className="text-lg text-muted-foreground mb-2">What do our customers say?</p>
          <p className="text-muted-foreground">Read the reviews and see what others think of their experience with us.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {reviews.map((review, index) => (
            <div key={index} className="bg-secondary/20 rounded-xl p-6 border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={testimonialAvatar} 
                    alt={review.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{review.name}</p>
                      {review.verified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{review.date}</p>
                  </div>
                </div>
                <div className="flex">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">{review.review}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
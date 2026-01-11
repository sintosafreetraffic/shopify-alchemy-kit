import { Card } from "@/components/ui/card";
import { Star, Quote, ThumbsUp, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Reviews = () => {
  const reviews = [
    {
      name: "Sarah Johnson",
      location: "California",
      product: "Ergonomic Pillow",
      rating: 5,
      title: "Life-Changing for My Neck Pain",
      review: "I've suffered from chronic neck pain for years. After just one week with the RiseByNight pillow, my pain reduced by at least 80%. I wake up feeling refreshed instead of stiff. This pillow has genuinely changed my life. Worth every single penny!",
      verified: true,
      helpful: 234
    },
    {
      name: "Michael Chen",
      location: "New York",
      product: "Ergonomic Pillow",
      rating: 5,
      title: "Best Investment for Sleep",
      review: "As someone who works long hours at a desk, I used to wake up with terrible shoulder and neck pain. This pillow has completely eliminated that. The cooling gel keeps me comfortable all night. My wife noticed I'm not snoring as much either!",
      verified: true,
      helpful: 189
    },
    {
      name: "Emily Rodriguez",
      location: "Texas",
      product: "Silk Sleep Mask",
      rating: 5,
      title: "Finally, Complete Darkness!",
      review: "I've tried dozens of sleep masks and this is the only one that blocks 100% of light. The silk is incredibly soft and doesn't pull on my eyelashes like other masks. My sleep quality has improved dramatically since I started using it.",
      verified: true,
      helpful: 156
    },
    {
      name: "David Thompson",
      location: "Florida",
      product: "Knee Pillow",
      rating: 5,
      title: "Perfect for Side Sleepers",
      review: "As a dedicated side sleeper, I always woke up with lower back pain. The knee pillow keeps my hips aligned perfectly throughout the night. No more back pain in the morning! Highly recommend for anyone who sleeps on their side.",
      verified: true,
      helpful: 142
    },
    {
      name: "Jennifer White",
      location: "Washington",
      product: "Ergonomic Pillow",
      rating: 5,
      title: "Doctor Recommended, Results Delivered",
      review: "My chiropractor recommended trying an ergonomic pillow for my cervical spine issues. I chose RiseByNight and couldn't be happier. The contour design supports my neck perfectly. I've had fewer headaches and much better sleep quality.",
      verified: true,
      helpful: 178
    },
    {
      name: "Robert Martinez",
      location: "Arizona",
      rating: 5,
      product: "Ergonomic Pillow",
      title: "Quality That Lasts",
      review: "I've had this pillow for over a year now and it's still as supportive as day one. Unlike my previous pillows that would flatten within months, this maintains its shape perfectly. The quality is outstanding and it's clearly built to last.",
      verified: true,
      helpful: 167
    },
    {
      name: "Lisa Anderson",
      location: "Oregon",
      product: "Silk Sleep Mask",
      rating: 5,
      title: "Gentle on Sensitive Skin",
      review: "I have extremely sensitive skin and most sleep masks irritate my face. This silk mask is incredibly gentle - no irritation whatsoever! Plus, it blocks all light and stays in place all night. Perfect for anyone with sensitive skin.",
      verified: true,
      helpful: 134
    },
    {
      name: "James Wilson",
      location: "Colorado",
      product: "Knee Pillow",
      rating: 5,
      title: "Travel Essential",
      review: "I travel frequently for work and this knee pillow has become essential. It's compact enough to pack and makes hotel beds so much more comfortable. My back feels great even after sleeping in different beds multiple times a week.",
      verified: true,
      helpful: 121
    },
    {
      name: "Amanda Taylor",
      location: "Michigan",
      product: "Ergonomic Pillow",
      rating: 5,
      title: "Stopped My Snoring",
      review: "My husband said my snoring has decreased significantly since I started using this pillow. The way it positions my head and neck must be opening up my airway. Plus, I'm sleeping more soundly. Win-win for both of us!",
      verified: true,
      helpful: 198
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Customer Reviews
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Real reviews from real customers who transformed their sleep with RiseByNight™
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                  ))}
                </div>
                <span className="text-2xl font-bold">4.8</span>
              </div>
              <span className="text-lg text-muted-foreground">Based on verified customer reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">100% Verified Reviews</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">96% Recommend</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Verified 5-Star Reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {reviews.map((review, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <Quote className="w-8 h-8 text-primary/20" />
                  <div className="flex">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                </div>

                <Badge variant="outline" className="mb-3 w-fit">{review.product}</Badge>

                <h3 className="font-bold text-lg mb-2">{review.title}</h3>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed flex-1">
                  "{review.review}"
                </p>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.location}</p>
                    </div>
                    {review.verified && (
                      <Badge className="text-xs bg-primary/10 text-primary">
                        Verified Purchase
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{review.helpful} people found this helpful</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Join Our Happy Customers
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Experience the RiseByNight™ difference with our 100-night risk-free trial
            </p>
            <a 
              href="/products"
              className="inline-block bg-foreground text-background px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Shop Now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Reviews;

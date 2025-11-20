import { Card } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

export const SleepMaskTestimonials = () => {
  const testimonials = [
    {
      name: "Jennifer M.",
      location: "California",
      rating: 5,
      title: "Complete Darkness, Finally!",
      review: "I've tried so many sleep masks and this is the ONLY one that blocks 100% of light. The silk is incredibly soft and doesn't pull on my eyelashes. My sleep quality has improved dramatically since I started using it.",
      verified: true
    },
    {
      name: "Michael T.",
      location: "New York",
      rating: 5,
      title: "Game Changer for Shift Work",
      review: "As a night shift nurse, sleeping during the day was always a struggle. This mask blocks out all daylight and the silk keeps me cool. I fall asleep faster and wake up more refreshed. Worth every penny!",
      verified: true
    },
    {
      name: "Sarah L.",
      location: "Texas",
      rating: 5,
      title: "So Comfortable I Forget I'm Wearing It",
      review: "The contoured design is genius - no pressure on my eyes at all. The silk feels luxurious and doesn't leave marks on my face. I used to wake up multiple times, now I sleep through the entire night.",
      verified: true
    },
    {
      name: "David R.",
      location: "Florida",
      rating: 5,
      title: "Perfect for Travel",
      review: "I travel frequently for work and this mask has become essential. Blocks out hotel hallway lights and airplane cabin lights completely. The adjustable strap keeps it secure all night without being too tight.",
      verified: true
    },
    {
      name: "Emily K.",
      location: "Washington",
      rating: 5,
      title: "Sensitive Skin Approved",
      review: "I have very sensitive skin and most masks irritate my face. This silk mask is incredibly gentle - no irritation at all! The light blocking is phenomenal and I've noticed fewer morning headaches since using it.",
      verified: true
    },
    {
      name: "Robert H.",
      location: "Arizona",
      rating: 5,
      title: "Best Sleep Investment",
      review: "My wife and I both use these now. The total blackout helps us fall asleep faster and stay asleep longer. The silk is breathable and doesn't get hot. We've recommended it to all our friends!",
      verified: true
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-muted-foreground">
            Real reviews from verified customers who transformed their sleep
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-lg font-semibold">4.9/5</span>
            <span className="text-muted-foreground">(3,200+ reviews)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Quote className="w-8 h-8 text-primary/20" />
                <div className="flex">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
              </div>

              <h3 className="font-bold text-lg mb-2">{testimonial.title}</h3>
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                {testimonial.review}
              </p>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                </div>
                {testimonial.verified && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    Verified Purchase
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Join thousands of satisfied customers sleeping better every night
          </p>
        </div>
      </div>
    </section>
  );
};

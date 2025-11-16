import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Verified Buyer",
    content: "This pillow changed my life! No more neck pain in the mornings. Best purchase I've made this year.",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Verified Buyer",
    content: "I was skeptical at first, but the ergonomic design really works. I fall asleep faster and wake up refreshed.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Verified Buyer",
    content: "After trying dozens of pillows, OptiSleep is the only one that actually supports my neck properly.",
    rating: 5,
  },
];

export const SocialProof = () => {
  return (
    <section className="py-12 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Loved by 10,000+ Customers</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-muted-foreground">4.9/5 from 500+ reviews</span>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-6">
                <Quote className="w-8 h-8 text-muted-foreground/20 absolute top-4 right-4" />
                <div className="flex mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mb-4 text-sm">{testimonial.content}</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

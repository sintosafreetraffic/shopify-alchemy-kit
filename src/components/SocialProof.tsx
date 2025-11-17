import { Star, Users, Truck, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";

const testimonials = [
  {
    name: "David B.",
    location: "Chicago",
    review: "After YEARS of failed solutions, this was the only thing that truly relieved my sleep apnea.",
    rating: 5
  },
  {
    name: "Jennifer M.",
    location: "Austin",
    review: "My husband says I don't snore anymore! This pillow changed our marriage.",
    rating: 5
  },
  {
    name: "Robert L.",
    location: "Seattle",
    review: "Finally sleeping through the night without waking up gasping for air. Life-changing!",
    rating: 5
  },
  {
    name: "Maria S.",
    location: "Miami",
    review: "Best investment in my health. My energy levels are through the roof now!",
    rating: 5
  }
];

export const SocialProof = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Customer Testimonial Carousel */}
        <div className="bg-secondary/20 p-8 rounded-lg mb-12 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
              className="text-2xl font-bold hover:text-primary transition-colors"
            >
              ‹
            </button>
            <div className="flex-1 text-center">
              <div className="flex justify-center mb-3">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-lg italic mb-4">"{testimonials[currentIndex].review}"</p>
              <div>
                <p className="font-bold">{testimonials[currentIndex].name}</p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <span>📍</span> {testimonials[currentIndex].location}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % testimonials.length)}
              className="text-2xl font-bold hover:text-primary transition-colors"
            >
              ›
            </button>
          </div>
          <div className="flex justify-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Social Proof Stats */}
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <Users className="w-12 h-12 mx-auto text-primary" />
            <p className="text-3xl font-bold">12,732+</p>
            <p className="text-muted-foreground">Customers</p>
          </div>
          <div className="space-y-2">
            <Truck className="w-12 h-12 mx-auto text-primary" />
            <p className="text-2xl font-bold">Fast Shipping</p>
            <p className="text-muted-foreground">Within the U.S.</p>
          </div>
          <div className="space-y-2">
            <RotateCcw className="w-12 h-12 mx-auto text-primary" />
            <p className="text-2xl font-bold">120 Night</p>
            <p className="text-muted-foreground">Risk-Free Trial</p>
          </div>
        </div>
      </div>
    </section>
  );
};

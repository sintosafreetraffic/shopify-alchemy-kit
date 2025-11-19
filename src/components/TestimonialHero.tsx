import testimonial from "@/assets/testimonial.png";

export const TestimonialHero = () => {
  return (
    <section className="py-12 px-4 bg-primary/5">
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-xl overflow-hidden shadow-2xl">
          <img 
            src={testimonial} 
            alt="Customer testimonial - I've never slept this comfortably in my life - 29,931 5 star reviews" 
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
};

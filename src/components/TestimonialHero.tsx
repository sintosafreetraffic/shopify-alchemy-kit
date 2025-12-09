// Performance: Using OptimizedImage for lazy loading with WebP
import testimonial from "@/assets/testimonial-new-updated.webp";
import OptimizedImage from "@/components/OptimizedImage";

export const TestimonialHero = () => {
  return (
    <section className="py-12 px-4 bg-primary/5">
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-xl overflow-hidden shadow-2xl">
          <OptimizedImage 
            src={testimonial} 
            alt="Customer testimonial - I've never slept this comfortably in my life - 29,931 5 Star Reviews" 
            width={672}
            height={400}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
};

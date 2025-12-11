// Performance: Using OptimizedImage for lazy loading
import offerBundle from "@/assets/offer-bundle.png";
import { Button } from "@/components/ui/button";
import OptimizedImage from "@/components/OptimizedImage";

export const OfferBundle = () => {
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-4 px-4 bg-background">
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-xl overflow-hidden shadow-lg">
          <OptimizedImage 
            src={offerBundle} 
            alt="Buy Rise By Night pillow and get free deep sleep mask, pillowcase, and neck roll"
            width={672}
            height={400}
            className="w-full"
          />
        </div>
        <div className="text-center mt-4">
          <Button size="lg" className="text-lg px-12" onClick={scrollToProducts}>
            Claim This Offer Now
          </Button>
        </div>
      </div>
    </section>
  );
};

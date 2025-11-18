import offerBundle from "@/assets/offer-bundle.png";
import { Button } from "@/components/ui/button";

export const OfferBundle = () => {
  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-4 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-xl overflow-hidden shadow-lg">
          <img 
            src={offerBundle} 
            alt="Buy OptiSleep pillow and get free sleep mask, pillowcase, and neck roll" 
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

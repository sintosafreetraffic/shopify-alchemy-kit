import { UrgencyBanner } from "@/components/UrgencyBanner";
import { Guarantee } from "@/components/Guarantee";
import { StickyAddToCart } from "@/components/StickyAddToCart";

const KneePillowProduct = () => {
  return (
    <div className="min-h-screen bg-background">
      <UrgencyBanner />
      
      {/* Knee Pillow Hero Section - Placeholder for now */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            RiseByNight Ergonomic Knee Pillow
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Perfect support for side sleepers - Coming soon with full details
          </p>
        </div>
      </section>
      
      <Guarantee />
      <StickyAddToCart />
    </div>
  );
};

export default KneePillowProduct;

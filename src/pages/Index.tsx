import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { UrgencyBanner } from "@/components/UrgencyBanner";
import { ProductCard } from "@/components/ProductCard";
import { Benefits } from "@/components/Benefits";
import { VideoSection } from "@/components/VideoSection";
import { Guarantee } from "@/components/Guarantee";
import { Features } from "@/components/Features";
import { FAQ } from "@/components/FAQ";
import { ReviewsSection } from "@/components/ReviewsSection";
import { LookInside } from "@/components/LookInside";
import { Badge } from "@/components/ui/badge";
import { fetchProducts } from "@/lib/shopify";
import type { ShopifyProduct } from "@/lib/shopify";
import { Loader2, Package } from "lucide-react";

const Index = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts(10);
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <UrgencyBanner />
      <Header />
      <Hero />
      <Features />
      <Benefits />
      <LookInside />
      <ReviewsSection />
      
      <section id="products" className="py-6">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <VideoSection />
      <FAQ />
      <Guarantee />

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 OptiSleep. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

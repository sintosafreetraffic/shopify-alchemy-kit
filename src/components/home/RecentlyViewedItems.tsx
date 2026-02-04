import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import OptimizedImage from "@/components/OptimizedImage";
import { Clock } from "lucide-react";

interface ViewedProduct {
  id: string;
  handle: string;
  title: string;
  imageUrl: string;
  price: string;
  viewedAt: number;
}

interface RecentlyViewedItemsProps {
  className?: string;
  maxItems?: number;
}

const STORAGE_KEY = "rbn_recently_viewed";
const MAX_STORED_ITEMS = 10;
const EXPIRY_DAYS = 30;

/**
 * Recently Viewed Items component
 * Tracks products viewed by returning visitors using localStorage
 * Shows a horizontal scroll of recently viewed products
 */
export const RecentlyViewedItems = ({ 
  className,
  maxItems = 4 
}: RecentlyViewedItemsProps) => {
  const [viewedProducts, setViewedProducts] = useState<ViewedProduct[]>([]);

  useEffect(() => {
    // Load recently viewed from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ViewedProduct[] = JSON.parse(stored);
        
        // Filter out expired items (older than 30 days)
        const now = Date.now();
        const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const validItems = parsed.filter(
          (item) => now - item.viewedAt < expiryMs
        );
        
        // Take only the most recent items up to maxItems
        setViewedProducts(validItems.slice(0, maxItems));
      } catch {
        // Invalid JSON, clear storage
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [maxItems]);

  // Don't render if no viewed items
  if (viewedProducts.length === 0) {
    return null;
  }

  return (
    <section className={cn("py-8 md:py-12 bg-background", className)}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl md:text-2xl font-semibold">
              Recently Viewed
            </h2>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {viewedProducts.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.handle}`}
                className="group block bg-muted/20 rounded-lg overflow-hidden border border-border/50 hover:border-primary/30 transition-colors"
              >
                {/* Product image */}
                <div className="aspect-square overflow-hidden bg-muted/30">
                  <OptimizedImage
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Product info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {product.price}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Utility function to add a product to recently viewed
 * Call this from product detail pages when a product is viewed
 */
export const addToRecentlyViewed = (product: Omit<ViewedProduct, "viewedAt">) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let items: ViewedProduct[] = stored ? JSON.parse(stored) : [];
    
    // Remove existing entry for this product (to move it to front)
    items = items.filter((item) => item.id !== product.id);
    
    // Add new entry at the beginning
    items.unshift({
      ...product,
      viewedAt: Date.now(),
    });
    
    // Keep only the most recent items
    items = items.slice(0, MAX_STORED_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage not available or quota exceeded
    console.warn("Could not save to recently viewed");
  }
};

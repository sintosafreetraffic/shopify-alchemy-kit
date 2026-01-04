import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Package, Clock } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import type { ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

interface ProductCardProps {
  product: ShopifyProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore(state => state.addItem);
  const variant = product.node.variants.edges[0].node;
  const image = product.node.images.edges[0]?.node;
  const price = parseFloat(variant.price.amount);
  const compareAtPrice = variant.compareAtPrice ? parseFloat(variant.compareAtPrice.amount) : null;
  const savings = compareAtPrice ? compareAtPrice - price : null;

  const handleAddToCart = () => {
    const cartItem = {
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      quantity: 1,
      selectedOptions: variant.selectedOptions || []
    };
    
    addItem(cartItem);
    const toastId = toast.success("Added to cart!", {
      description: `${product.node.title} has been added to your cart.`,
      duration: 1500,
      cancel: {
        label: "✕",
        onClick: () => {
          toast.dismiss(toastId);
        }
      }
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="aspect-square bg-secondary/20 overflow-hidden">
          {image && (
            <img
              src={image.url}
              alt={image.altText || product.node.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-primary text-primary" />
            ))}
            <span className="text-sm text-muted-foreground ml-1">(500+ reviews)</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">{product.node.title.replace(/RiseByNight\s*/gi, '')}</h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {product.node.description}
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-primary">
              ${price.toFixed(2)}
            </span>
            {compareAtPrice && (
              <>
                <span className="text-sm text-muted-foreground line-through">
                  ${compareAtPrice.toFixed(2)}
                </span>
                <Badge variant="destructive" className="ml-auto">
                  SAVE ${savings!.toFixed(2)}
                </Badge>
              </>
            )}
          </div>
          
          {/* Trust Indicators */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3 text-green-600" />
              <span>In Stock</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Ships Today</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={handleAddToCart}
          className="w-full relative overflow-hidden group" 
          size="lg"
        >
          <span className="inline-flex items-center transition-all duration-300 group-hover:-translate-y-12 group-hover:opacity-0">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </span>
          <span className="absolute inset-0 flex items-center justify-center translate-y-12 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
};

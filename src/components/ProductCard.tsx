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
  const originalPrice = price * 1.5;
  const savings = originalPrice - price;

  const handleAddToCart = () => {
    const cartItem = {
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart!", {
      description: `${product.node.title} has been added to your cart.`,
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
          <h3 className="font-semibold text-lg mb-2">{product.node.title.replace(/OptiSleep\s*/gi, '')}</h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {product.node.description}
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold">
              ${price.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground line-through">
              ${originalPrice.toFixed(2)}
            </span>
            <Badge variant="destructive" className="ml-auto">
              SAVE ${savings.toFixed(2)}
            </Badge>
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
          className="w-full" 
          size="lg"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

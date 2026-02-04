import { Link } from "react-router-dom";
import { ShoppingBag, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPreferredPillowRoute } from "@/lib/pillowFocusPreference";

interface EmptyCartCTAProps {
  onClose?: () => void;
}

export const EmptyCartCTA = ({ onClose }: EmptyCartCTAProps) => {
  const preferredRoute = getPreferredPillowRoute();

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <ShoppingBag className="h-8 w-8 text-primary" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Discover our award-winning sleep products loved by over 50,000 customers.
      </p>

      {/* Social Proof */}
      <div className="flex items-center gap-3 mb-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
          <span>4.8/5 rating</span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>50,000+ happy sleepers</span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button asChild size="lg" className="w-full" onClick={onClose}>
          <Link to={preferredRoute}>
            View Bestseller
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="w-full" onClick={onClose}>
          <Link to="/products">
            Browse All Products
          </Link>
        </Button>
      </div>

      {/* Trust Signal */}
      <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
        Free shipping on orders over €50
      </p>
    </div>
  );
};

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlistStore, WishlistItem } from "@/stores/wishlistStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  product: Omit<WishlistItem, "addedAt">;
  variant?: "icon" | "default";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}

export const WishlistButton = ({ 
  product, 
  variant = "icon",
  size = "icon",
  className 
}: WishlistButtonProps) => {
  const { isInWishlist, toggleItem } = useWishlistStore();
  const isWishlisted = isInWishlist(product.productId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const wasAdded = toggleItem(product);
    
    if (wasAdded) {
      toast.success("Added to wishlist", {
        description: product.title,
        duration: 2000,
      });
    } else {
      toast.info("Removed from wishlist", {
        duration: 2000,
      });
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={handleToggle}
        className={cn(
          "rounded-full hover:bg-red-50 transition-colors",
          isWishlisted && "text-red-500",
          className
        )}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart 
          className={cn(
            "h-5 w-5 transition-all",
            isWishlisted && "fill-red-500 text-red-500 scale-110"
          )} 
        />
      </Button>
    );
  }

  return (
    <Button
      variant={isWishlisted ? "secondary" : "outline"}
      size={size}
      onClick={handleToggle}
      className={cn(
        "gap-2",
        isWishlisted && "text-red-500 border-red-200 bg-red-50 hover:bg-red-100",
        className
      )}
    >
      <Heart 
        className={cn(
          "h-4 w-4",
          isWishlisted && "fill-red-500"
        )} 
      />
      {isWishlisted ? "Saved" : "Save"}
    </Button>
  );
};

import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useWishlistStore } from "@/stores/wishlistStore";
import { formatPrice } from "@/lib/formatPrice";

interface WishlistDrawerProps {
  triggerClassName?: string;
}

export const WishlistDrawer = ({ triggerClassName }: WishlistDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const totalItems = items.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName}>
          <div className="relative">
            <Heart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px] bg-red-500 text-white"
              >
                {totalItems}
              </Badge>
            )}
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            My Wishlist
          </SheetTitle>
          <SheetDescription>
            {totalItems === 0 
              ? "Your wishlist is empty" 
              : `${totalItems} item${totalItems !== 1 ? "s" : ""} saved`
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-red-300" />
              </div>
              <p className="text-muted-foreground mb-4">
                Save items you love to your wishlist
              </p>
              <Button asChild variant="outline" onClick={() => setIsOpen(false)}>
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div 
                      key={item.productId} 
                      className="flex gap-3 p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
                    >
                      {item.imageUrl && (
                        <Link 
                          to={`/products/${item.handle}`}
                          onClick={() => setIsOpen(false)}
                          className="w-16 h-16 bg-secondary/20 rounded-md overflow-hidden flex-shrink-0"
                        >
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/products/${item.handle}`}
                          onClick={() => setIsOpen(false)}
                          className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                        >
                          {item.title}
                        </Link>
                        <p className="text-sm font-semibold text-primary mt-1">
                          {formatPrice(item.price, item.currencyCode)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() => removeItem(item.productId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 pt-4 border-t space-y-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-muted-foreground"
                  onClick={clearWishlist}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Wishlist
                </Button>
                <Button 
                  asChild
                  className="w-full"
                  onClick={() => setIsOpen(false)}
                >
                  <Link to="/products">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

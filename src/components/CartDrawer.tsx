import { useState } from "react";
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
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2, Moon, RotateCcw, Shield, Gift } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    items, 
    isLoading, 
    updateQuantity, 
    removeItem, 
    createCheckout 
  } = useCartStore();
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);
  
  // Black Friday pricing logic
  const regularPrice = 89.99;
  const originalTotal = regularPrice * totalItems;
  const discount = totalItems >= 2 ? regularPrice : 0;
  const totalPrice = subtotal;
  
  // Free gifts logic
  const freeGifts = totalItems >= 2 ? 2 : (totalItems >= 1 ? 1 : 0);

  const handleCheckout = async () => {
    try {
      await createCheckout();
      const checkoutUrl = useCartStore.getState().checkoutUrl;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? "Your cart is empty" : `${totalItems} item${totalItems !== 1 ? 's' : ''} in your cart`}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex gap-4 p-2 border rounded-lg">
                      <div className="w-16 h-16 bg-secondary/20 rounded-md overflow-hidden flex-shrink-0">
                        {item.product.node.images?.edges?.[0]?.node && (
                          <img
                            src={item.product.node.images.edges[0].node.url}
                            alt={item.product.node.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.product.node.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.selectedOptions.map(option => option.value).join(' • ')}
                        </p>
                        <p className="font-semibold">
                          {item.price.currencyCode} ${parseFloat(item.price.amount).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex-shrink-0 space-y-4 pt-4 border-t bg-background">
                {/* Free Gifts Section */}
                {freeGifts > 0 && (
                  <div className="bg-primary/5 border-2 border-primary rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-5 h-5 text-primary" />
                      <span className="font-bold text-primary">FREE GIFT{freeGifts > 1 ? 'S' : ''} INCLUDED!</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <img 
                        src={eyeMaskGift} 
                        alt="Free Sleep Mask" 
                        className="w-16 h-16 object-contain"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {freeGifts}x RiseByNight™ Silk Sleep Mask
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Value: ${(freeGifts * 29.99).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="space-y-2 py-3 border-y">
                  <div className="flex items-center gap-2 text-sm">
                    <Moon className="w-4 h-4 text-primary" />
                    <span className="font-medium">100-Night Risk-Free Trial</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <RotateCcw className="w-4 h-4 text-primary" />
                    <span className="font-medium">Free & Easy Returns</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-medium">2-Year Warranty</span>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="space-y-2">
                  {discount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Original Price</span>
                        <span className="text-muted-foreground line-through">
                          ${originalTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          Black Friday Savings
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          -${discount.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-lg font-bold">Total</span>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${totalPrice.toFixed(2)}
                      </div>
                      {discount > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                          You save ${discount.toFixed(2)}!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCheckout}
                  className="w-full" 
                  size="lg"
                  disabled={items.length === 0 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Checkout...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Secure Checkout
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Free shipping • Secure payment • Money-back guarantee
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

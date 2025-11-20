import { useState, useEffect } from "react";
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
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<ShopifyProduct[]>([]);
  
  const { 
    items, 
    isLoading, 
    updateQuantity, 
    removeItem, 
    createCheckout,
    addItem,
    setCartOpen
  } = useCartStore();

  useEffect(() => {
    setCartOpen(isOpen);
  }, [isOpen, setCartOpen]);
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);
  
  // Calculate pillow items only (exclude sleep mask for free gift calculation)
  const pillowItems = items.filter(item => 
    item.product.node.title.toLowerCase().includes('pillow')
  );
  const totalPillows = pillowItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Black Friday pricing logic
  const regularPrice = 89.99;
  const originalTotal = regularPrice * totalItems;
  const discount = totalItems >= 2 ? regularPrice : 0;
  const totalPrice = originalTotal - discount;
  
  // Free gifts logic: Only for 2+ pillows - pairs of 2 = 2 masks each
  const freeGifts = totalPillows >= 2 ? Math.floor(totalPillows / 2) * 2 : 0;

  // Fetch recommended products (excluding items already in cart and free gift product)
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const products = await fetchProducts(10);
        // Filter out products already in cart and the free gift product
        const cartProductIds = items.map(item => item.product.node.id);
        const filtered = products.filter(p => 
          !cartProductIds.includes(p.node.id) && 
          !p.node.title.toLowerCase().includes('free gift')
        );
        setRecommendedProducts(filtered.slice(0, 2));
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      }
    };
    
    if (isOpen) {
      loadRecommendations();
    }
  }, [isOpen, items]);

  const handleAddRecommendation = (product: ShopifyProduct) => {
    const variant = product.node.variants.edges[0]?.node;
    if (!variant) return;

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
      description: `${product.node.title} has been added to your cart.`
    });
  };

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
              {/* Scrollable Cart Items + Recommendations */}
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-4">
                {/* Cart Items */}
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
                  
                  {/* Free Gifts Section */}
                  {freeGifts > 0 && (
                    <div className="bg-primary/5 border border-primary rounded-md p-2 mt-4">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary flex-shrink-0" />
                        <img 
                          src={eyeMaskGift} 
                          alt="Free Sleep Mask" 
                          className="w-10 h-10 object-contain flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-primary">
                            FREE GIFT{freeGifts > 1 ? 'S' : ''}: {freeGifts}x Sleep Mask
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Value: ${(freeGifts * 29.99).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* You May Also Like Section */}
                  {recommendedProducts.length > 0 && (
                    <div className="pt-4 border-t mt-4">
                      <h3 className="font-semibold mb-2 text-sm">You may also like</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {recommendedProducts.map((product) => {
                          const variant = product.node.variants.edges[0]?.node;
                          const image = product.node.images.edges[0]?.node;
                          
                          return (
                            <div 
                              key={product.node.id} 
                              className="border rounded-md p-2"
                            >
                              <div className="flex flex-col gap-2">
                                {image && (
                                  <div className="w-20 h-20 mx-auto bg-secondary/20 rounded-sm overflow-hidden">
                                    <img
                                      src={image.url}
                                      alt={product.node.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex flex-col gap-1">
                                  <h4 className="font-medium text-xs line-clamp-2 leading-tight">{product.node.title}</h4>
                                  {variant && (
                                    <p className="text-sm font-semibold">
                                      ${parseFloat(variant.price.amount).toFixed(2)}
                                    </p>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-xs mt-1"
                                    onClick={() => handleAddRecommendation(product)}
                                  >
                                    Add to Cart
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Fixed Bottom Section: Trust Badges + Checkout */}
              <div className="flex-shrink-0 space-y-3 pt-4 border-t bg-background mt-4">
                {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 py-2 border-y">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Moon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">100-Night Trial</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <RotateCcw className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">Easy Returns</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">2-Year Warranty</span>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold">Total</span>
                    <div className="text-right">
                      {discount > 0 && (
                        <div className="text-base text-muted-foreground line-through mb-1">
                          ${originalTotal.toFixed(2)}
                        </div>
                      )}
                      <div className="text-xl font-bold">
                        ${totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-sm bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded">
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        Black Friday Savings
                      </span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        -${discount.toFixed(2)}
                      </span>
                    </div>
                  )}
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

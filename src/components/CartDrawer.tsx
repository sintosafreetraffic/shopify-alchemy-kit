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
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2, Moon, RotateCcw, Shield, Gift, Truck } from "lucide-react";
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
    setCartOpen,
    isCartOpen
  } = useCartStore();

  // Sync local state with store state
  useEffect(() => {
    setIsOpen(isCartOpen);
  }, [isCartOpen]);

  // Update store when local state changes
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
  
  // Black Friday pricing logic - only apply to pillow items
  const pillowItemsTotal = pillowItems.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);
  const pillowDiscount = Math.floor(totalPillows / 2) * 89.99; // Each pair of pillows gets one free
  const otherItemsTotal = items
    .filter(item => !item.product.node.title.toLowerCase().includes('pillow'))
    .reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);
  
  const originalTotal = subtotal; // Total before discount
  const discount = pillowDiscount;
  const totalPrice = pillowItemsTotal - pillowDiscount + otherItemsTotal;
  
  // Free gifts logic: Only for 2+ pillows - pairs of 2 = 2 masks each
  const freeGifts = totalPillows >= 2 ? Math.floor(totalPillows / 2) * 2 : 0;

  // Fetch recommended products (excluding free gift product only)
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const products = await fetchProducts(10);
        // Filter out only the free gift product
        const filtered = products.filter(p => 
          !p.node.title.toLowerCase().includes('free gift')
        );
        setRecommendedProducts(filtered.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      }
    };
    
    if (isOpen) {
      loadRecommendations();
    }
  }, [isOpen]);

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
    <>
      {/* Desktop: Recommendations on the left side of the cart - Full Height */}
      {isOpen && recommendedProducts.length > 0 && (
        <div data-recommendations-panel className="hidden lg:flex fixed right-[32rem] top-0 bottom-0 z-[100] w-80 bg-blue-50 dark:bg-blue-950/20 border-r border-border shadow-xl flex-col animate-in slide-in-from-right duration-500 pointer-events-auto">
          <div className="flex-1 overflow-y-auto p-6 pt-8 space-y-4">
            {recommendedProducts.map((product) => {
              const variant = product.node.variants.edges[0]?.node;
              const image = product.node.images.edges[0]?.node;
              const isPillow = product.node.title.toLowerCase().includes('pillow');
              
              return (
                <div 
                  key={product.node.id} 
                  className="bg-card border rounded-lg p-3 hover:shadow-lg transition-shadow relative"
                >
                  {isPillow && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded z-10">
                      1+1 DEAL
                    </div>
                  )}
                  {image && (
                    <div className="w-full aspect-square bg-secondary/20 rounded-lg overflow-hidden mb-3">
                      <img
                        src={image.url}
                        alt={product.node.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">{product.node.title}</h4>
                    <div className="flex items-center gap-2">
                      {variant && (
                        <p className="text-lg font-bold whitespace-nowrap">
                          ${parseFloat(variant.price.amount).toFixed(2)}
                        </p>
                      )}
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
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
      
      <SheetContent 
        className="w-full sm:max-w-lg flex flex-col h-full"
        onInteractOutside={(e) => {
          // Prevent closing when clicking on recommendations panel
          const target = e.target as HTMLElement;
          if (target.closest('[data-recommendations-panel]')) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? "Your cart is empty" : `${totalItems} item${totalItems !== 1 ? 's' : ''} in your cart`}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {/* Free Shipping Progress Bar - Always Visible */}
          {items.length > 0 && (
            <div className="mb-4 px-1">
              <div className="space-y-2">
                {totalPrice >= 50 ? (
                  <>
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm justify-center">
                      <Truck className="w-4 h-4" />
                      <span>You have got free shipping!</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Add ${(50 - totalPrice).toFixed(2)} more for free shipping
                      </span>
                      <Truck className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((totalPrice / 50) * 100, 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
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
                        <h4 className="font-medium text-sm leading-tight">{item.product.node.title}</h4>
                        {item.selectedOptions.filter(option => option.value.toLowerCase() !== 'default title').length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {item.selectedOptions
                              .filter(option => option.value.toLowerCase() !== 'default title')
                              .map(option => option.value)
                              .join(' • ')}
                          </p>
                        )}
                        <div className="mt-1">
                          {item.product.node.title.toLowerCase().includes('pillow') && item.quantity >= 2 ? (
                            <div className="space-y-0.5">
                              <p className="text-sm text-muted-foreground line-through">
                                {item.price.currencyCode} ${(parseFloat(item.price.amount) * item.quantity).toFixed(2)}
                              </p>
                              <p className="font-semibold">
                                {item.price.currencyCode} ${((parseFloat(item.price.amount) * item.quantity) - (Math.floor(item.quantity / 2) * parseFloat(item.price.amount))).toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <p className="font-semibold">
                              {item.price.currencyCode} ${(parseFloat(item.price.amount) * item.quantity).toFixed(2)}
                            </p>
                          )}
                        </div>
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
                  
                  {/* Mobile Recommendations */}
                  {recommendedProducts.length > 0 && (
                    <div className="pt-4 border-t mt-4 lg:hidden">
                      <div className="grid grid-cols-2 gap-2">
                        {recommendedProducts.map((product) => {
                          const variant = product.node.variants.edges[0]?.node;
                          const image = product.node.images.edges[0]?.node;
                          
                          return (
                            <div 
                              key={product.node.id} 
                              className="border rounded-md p-2 flex flex-col h-full"
                            >
                              {image && (
                                <div className="w-20 h-20 mx-auto bg-secondary/20 rounded-sm overflow-hidden mb-2">
                                  <img
                                    src={image.url}
                                    alt={product.node.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex flex-col gap-1 flex-grow">
                                <h4 className="font-medium text-xs line-clamp-2 leading-tight">{product.node.title}</h4>
                                {variant && (
                                  <p className="text-sm font-semibold">
                                    ${parseFloat(variant.price.amount).toFixed(2)}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs mt-2"
                                onClick={() => handleAddRecommendation(product)}
                              >
                                Add to Cart
                              </Button>
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
                    <div className="text-xl font-bold">
                      ${totalPrice.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-muted-foreground">$0.00</span>
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
                
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {/* Visa */}
                  <svg className="h-6" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="32" rx="4" fill="#1434CB"/>
                    <path d="M20.5 11.5L17.5 20.5H15L13 13.5C12.9 13.2 12.7 12.9 12.4 12.8C11.8 12.5 10.9 12.2 10 12V11.5H14.5C15.1 11.5 15.6 11.9 15.7 12.5L16.5 17L18.5 11.5H20.5ZM29 18.3C29 20.5 26.5 20.5 26.5 19.5C26.5 18.5 27.5 18 28 18C28.5 18 28.8 18.1 29 18.2V18.3ZM31 20.5H29.5C29.4 20.1 29.3 19.7 29.2 19.3C28.8 19.5 28.3 19.6 27.8 19.6C26.5 19.6 25.5 18.9 25.5 17.8C25.5 16.2 27.3 16 28.5 15.9C28.8 15.9 29 15.9 29 15.7C29 15.3 28.7 15 28 15C27.5 15 26.8 15.2 26.3 15.4L26 13.9C26.6 13.6 27.5 13.4 28.3 13.4C30.1 13.4 31 14.2 31 15.8V20.5ZM23 15.5C23 14.5 23.8 13.4 25.5 13.4C26.2 13.4 26.7 13.6 27 13.8L26.5 15.3C26.2 15.1 25.8 15 25.5 15C24.8 15 24.5 15.3 24.5 15.7C24.5 17 27.5 16.8 27.5 19C27.5 20.3 26.5 21.1 25 21.1C24.2 21.1 23.4 20.9 23 20.6L23.5 19C23.9 19.2 24.5 19.4 25 19.4C25.5 19.4 26 19.2 26 18.7C26 17.2 23 17.5 23 15.5ZM38 11.5L36 20.5H34.5L32.5 11.5H34.5L35.5 17L37.5 11.5H38Z" fill="white"/>
                  </svg>
                  
                  {/* Mastercard */}
                  <svg className="h-6" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="32" rx="4" fill="#EB001B"/>
                    <circle cx="18" cy="16" r="8" fill="#FF5F00"/>
                    <circle cx="30" cy="16" r="8" fill="#F79E1B"/>
                    <path d="M24 10C22.5 11.3 21.5 13.5 21.5 16C21.5 18.5 22.5 20.7 24 22C25.5 20.7 26.5 18.5 26.5 16C26.5 13.5 25.5 11.3 24 10Z" fill="#FF5F00"/>
                  </svg>
                  
                  {/* PayPal */}
                  <svg className="h-6" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="32" rx="4" fill="#003087"/>
                    <path d="M19 11H23C25 11 26 12 26 14C26 16 25 17 23 17H21L20 21H18L19 11ZM21.5 15.5H22.5C23.5 15.5 24 15 24 14C24 13 23.5 12.5 22.5 12.5H21.5L21 15.5H21.5Z" fill="white"/>
                    <path d="M26 11H30C32 11 33 12 33 14C33 16 32 17 30 17H28L27 21H25L26 11ZM28.5 15.5H29.5C30.5 15.5 31 15 31 14C31 13 30.5 12.5 29.5 12.5H28.5L28 15.5H28.5Z" fill="#009CDE"/>
                  </svg>
                  
                  {/* Apple Pay */}
                  <svg className="h-6" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="32" rx="4" fill="#000000"/>
                    <path d="M17.5 13C17.2 13.3 16.7 13.5 16.3 13.5C16.2 13.1 16.4 12.6 16.7 12.3C17 12 17.5 11.8 17.9 11.8C17.9 12.2 17.8 12.7 17.5 13ZM17.9 13.6C17.2 13.6 16.6 14 16.3 14C15.9 14 15.4 13.6 14.8 13.6C14.1 13.6 13.5 14 13.1 14.6C12.3 15.8 12.9 17.6 13.7 18.6C14.1 19.1 14.5 19.7 15.1 19.7C15.6 19.7 15.8 19.4 16.5 19.4C17.2 19.4 17.4 19.7 18 19.7C18.6 19.7 19 19.2 19.4 18.7C19.8 18.1 20 17.6 20 17.6C20 17.6 18.9 17.1 18.9 16C18.9 15 19.7 14.5 19.8 14.5C19.3 13.8 18.6 13.7 18.4 13.7C17.9 13.6 17.9 13.6 17.9 13.6ZM23 14V19.5H24V17.5H25.5C26.6 17.5 27.5 16.7 27.5 15.5C27.5 14.3 26.6 13.5 25.5 13.5H23V14ZM24 14.5H25.3C26.1 14.5 26.5 14.9 26.5 15.5C26.5 16.1 26.1 16.5 25.3 16.5H24V14.5ZM28 17C28 18.4 29 19.5 30.5 19.5C31.2 19.5 31.8 19.3 32.2 18.9V19.5H33V15.5H30.5V16.5H32C31.9 17.5 31.3 18 30.5 18C29.5 18 29 17.3 29 16.5C29 15.7 29.5 15 30.5 15C31 15 31.5 15.2 31.7 15.5L32.5 15C32.1 14.4 31.4 14 30.5 14C29 14 28 15.1 28 16.5V17Z" fill="white"/>
                  </svg>
                  
                  {/* Amex */}
                  <svg className="h-6" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="32" rx="4" fill="#006FCF"/>
                    <path d="M15 13L13 19H15.5L16 17.5H17L17.5 19H20.5L18.5 13H15ZM16.3 16L16.8 14.5L17.3 16H16.3ZM21 13V19H23.5L25 16.5V19H27.5V13H25L23.5 15.5V13H21ZM28 13V19H33V17.5H30.5V16.5H32.5V15H30.5V14.5H33V13H28Z" fill="white"/>
                  </svg>
                  
                  {/* Klarna */}
                  <svg className="h-6" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="32" rx="4" fill="#FFB3C7"/>
                    <path d="M15 12H17V20H15V12ZM19 12V16.5L22 12H24.5L21 17L24.5 20H22L19 16.5V20H17V12H19ZM25 12H27V20H25V12Z" fill="#000000"/>
                  </svg>
                </div>
              </div>
            </>
          )}
        </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createStorefrontCheckout } from '@/lib/shopify';
import type { ShopifyProduct } from '@/lib/shopify';
import { trackAddToCart, trackInitiateCheckout, clearInitiateCheckoutFingerprint } from '@/lib/pinterest';
import { trackAddedToCart as trackKlaviyoAddToCart, trackStartedCheckout as trackKlaviyoStartedCheckout } from '@/lib/klaviyo';
import { trackRevenueAttribution } from '@/lib/personaAnalytics';
import { trackAddToCartEvent } from '@/lib/addToCartAnalytics';

export interface CartItem {
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice?: {
    amount: string;
    currencyCode: string;
  } | null;
  quantity: number;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

export interface FreeMaskSelection {
  variantId: string;
  color: string;
}

export interface CheckoutData {
  items: CartItem[];
  freeMaskVariants: FreeMaskSelection[];
  discountCodes: string[];
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isCartOpen: boolean;
  freeMaskSelections: FreeMaskSelection[];
  
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setCartId: (cartId: string) => void;
  setCheckoutUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  setCartOpen: (isOpen: boolean) => void;
  setFreeMaskSelections: (selections: FreeMaskSelection[]) => void;
  updateFreeMaskColor: (index: number, variantId: string, color: string) => void;
  createCheckout: () => Promise<CheckoutData | null>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
      isCartOpen: false,
      freeMaskSelections: [],

      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find(i => i.variantId === item.variantId);
        
        // Track Pinterest AddToCart event (async, fire-and-forget)
        trackAddToCart(
          item.product.node.id,
          item.variantId,
          parseFloat(item.price.amount) * item.quantity,
          item.price.currencyCode,
          item.quantity
        ).catch(() => {});

        // Track Klaviyo AddToCart event
        trackKlaviyoAddToCart({
          id: item.product.node.id,
          title: item.product.node.title,
          price: parseFloat(item.price.amount),
          quantity: item.quantity,
          sku: item.variantId,
          variantTitle: item.variantTitle,
          imageUrl: item.product.node.images?.edges?.[0]?.node?.url || "",
        });
        
        // Track revenue attribution with persona context
        trackRevenueAttribution("add_to_cart", {
          id: item.product.node.id,
          title: item.product.node.title,
          price: parseFloat(item.price.amount),
          currency: item.price.currencyCode,
          quantity: item.quantity,
        });

        // Track add-to-cart in Supabase analytics
        trackAddToCartEvent({
          productId: item.product.node.id,
          productTitle: item.product.node.title,
          variantId: item.variantId,
          variantTitle: item.variantTitle,
          price: parseFloat(item.price.amount),
          currency: item.price.currencyCode,
          quantity: item.quantity,
        });
        
        if (existingItem) {
          set({
            items: items.map(i =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          });
        } else {
          set({ items: [...items, item] });
        }
        
        // Clear InitiateCheckout fingerprint so new checkout can be tracked
        clearInitiateCheckoutFingerprint();
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.variantId === variantId ? { ...item, quantity } : item
          )
        });
        
        // Clear InitiateCheckout fingerprint so new checkout can be tracked
        clearInitiateCheckoutFingerprint();
      },

      removeItem: (variantId) => {
        set({
          items: get().items.filter(item => item.variantId !== variantId)
        });
        
        // Clear InitiateCheckout fingerprint so new checkout can be tracked
        clearInitiateCheckoutFingerprint();
      },

      clearCart: () => {
        set({ items: [], cartId: null, checkoutUrl: null, freeMaskSelections: [] });
        clearInitiateCheckoutFingerprint();
      },

      setCartId: (cartId) => set({ cartId }),
      setCheckoutUrl: (checkoutUrl) => set({ checkoutUrl }),
      setLoading: (isLoading) => set({ isLoading }),
      setCartOpen: (isCartOpen) => set({ isCartOpen }),
      
      setFreeMaskSelections: (freeMaskSelections) => set({ freeMaskSelections }),
      
      updateFreeMaskColor: (index, variantId, color) => {
        const { freeMaskSelections } = get();
        const newSelections = [...freeMaskSelections];
        newSelections[index] = { variantId, color };
        set({ freeMaskSelections: newSelections });
      },

      createCheckout: async () => {
        const { items, setLoading, setCheckoutUrl } = get();
        if (items.length === 0) return null;

        setLoading(true);
        try {
          // Fire-and-forget analytics - don't block checkout
          const checkoutItems = items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
            currencyCode: item.price.currencyCode,
          }));
          
          // Non-blocking: Pinterest tracking
          Promise.resolve().then(() => trackInitiateCheckout(checkoutItems)).catch(() => {});
          
          // Non-blocking: Klaviyo Started Checkout tracking
          const totalValue = items.reduce((sum, item) => sum + parseFloat(item.price.amount) * item.quantity, 0);
          const currencyCode = items[0]?.price.currencyCode || 'EUR';
          
          Promise.resolve().then(() => trackKlaviyoStartedCheckout({
            items: items.map(item => ({
              id: item.product.node.id,
              title: item.product.node.title,
              price: parseFloat(item.price.amount),
              quantity: item.quantity,
              variantTitle: item.variantTitle,
              imageUrl: item.product.node.images?.edges?.[0]?.node?.url || "",
            })),
            totalValue,
            currencyCode,
          })).catch(() => {});
          
          // Non-blocking: Persona analytics
          if (items.length > 0) {
            Promise.resolve().then(() => trackRevenueAttribution("begin_checkout", {
              id: items[0].product.node.id,
              title: `Checkout (${items.length} items)`,
              price: totalValue,
              currency: currencyCode,
              quantity: items.reduce((sum, item) => sum + item.quantity, 0),
            })).catch(() => {});
          }

          // Calculate pillow items for free mask calculation
          const ergonomicPillowItems = items.filter(item => 
            item.product.node.title.toLowerCase().includes('ergonomic sleep pillow')
          );
          
          const totalErgonomicPillows = ergonomicPillowItems.reduce((sum, item) => sum + item.quantity, 0);
          
          // Calculate free masks:
          // - Ergonomic pillow: 1 mask per pillow (included with each)
          // - Knee pillow: NO free masks included
          const freeMaskCount = totalErgonomicPillows;
          
          // Get the selected mask variants from state
          const { freeMaskSelections } = get();
          
          // Use selected variants, or empty array if none selected
          const freeMaskVariants = freeMaskSelections.slice(0, freeMaskCount);
          
          // Determine which discount codes to apply
          const discountCodes: string[] = [];
          
          // Add mask discount for ergonomic pillows
          if (totalErgonomicPillows > 0) {
            discountCodes.push('FREEMASKSERGONOMIC');
          }
          
          // Knee pillows no longer include free masks
          
          // Add free mask discount if applicable
          if (freeMaskCount > 0) {
            discountCodes.push('FREEMASKSFORYOU');
          }
          
          return { items, freeMaskVariants, discountCodes };
        } catch (error) {
          console.error('Failed to prepare checkout:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    }),
    {
      name: 'shopify-cart',
      storage: createJSONStorage(() => localStorage),
      // Don't persist loading state - it should always start as false
      partialize: (state) => ({
        items: state.items,
        cartId: state.cartId,
        checkoutUrl: state.checkoutUrl,
        freeMaskSelections: state.freeMaskSelections,
        // Explicitly exclude: isLoading, isCartOpen
      }),
      // Reset loading state on rehydrate to fix any stuck states
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          state.isCartOpen = false;
        }
      },
    }
  )
);

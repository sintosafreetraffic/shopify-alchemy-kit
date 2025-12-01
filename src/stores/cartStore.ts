import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createStorefrontCheckout } from '@/lib/shopify';
import type { ShopifyProduct } from '@/lib/shopify';

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

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isCartOpen: boolean;
  
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setCartId: (cartId: string) => void;
  setCheckoutUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  setCartOpen: (isOpen: boolean) => void;
  createCheckout: () => Promise<string | null>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
      isCartOpen: false,

      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find(i => i.variantId === item.variantId);
        
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
      },

      removeItem: (variantId) => {
        set({
          items: get().items.filter(item => item.variantId !== variantId)
        });
      },

      clearCart: () => {
        set({ items: [], cartId: null, checkoutUrl: null });
      },

      setCartId: (cartId) => set({ cartId }),
      setCheckoutUrl: (checkoutUrl) => set({ checkoutUrl }),
      setLoading: (isLoading) => set({ isLoading }),
      setCartOpen: (isCartOpen) => set({ isCartOpen }),

      createCheckout: async () => {
        const { items, setLoading, setCheckoutUrl } = get();
        if (items.length === 0) return null;

        setLoading(true);
        try {
          // Calculate pillow items only (exclude sleep mask for free gift calculation)
          const pillowItems = items.filter(item => 
            item.product.node.title.toLowerCase().includes('pillow')
          );
          const totalPillows = pillowItems.reduce((sum, item) => sum + item.quantity, 0);
          
          // Calculate free masks: Only for 2+ pillows - pairs of 2 = 2 masks each
          const freeMasks = totalPillows >= 2 ? Math.floor(totalPillows / 2) * 2 : 0;
          
          // Determine which discount codes to apply
          const discountCodes: string[] = [];
          
          // Check for Ergonomic Sleep Pillow
          const hasSleepPillow = items.some(item => 
            item.product.node.title.toLowerCase().includes('ergonomic sleep pillow')
          );
          if (hasSleepPillow) {
            discountCodes.push('FREESLEEPPILLOW');
          }
          
          // Check for Knee Pillow
          const hasKneePillow = items.some(item => 
            item.product.node.title.toLowerCase().includes('knee pillow')
          );
          if (hasKneePillow) {
            discountCodes.push('FREEKNEEPILLOW');
          }
          
          // Add free mask discount if applicable
          if (freeMasks > 0) {
            discountCodes.push('FREEMASKSFORYOU');
          }
          
          // Create checkout with items, free masks, and discount codes
          const checkoutUrl = await createStorefrontCheckout(
            items.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity,
            })),
            freeMasks,
            discountCodes
          );
          setCheckoutUrl(checkoutUrl);
          return checkoutUrl;
        } catch (error) {
          console.error('Failed to create checkout:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    }),
    {
      name: 'shopify-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

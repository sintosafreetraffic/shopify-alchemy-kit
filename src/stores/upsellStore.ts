/**
 * Upsell Store - Manages post-ATC upsell modal state
 */

import { create } from 'zustand';

interface UpsellStore {
  isUpsellOpen: boolean;
  triggerProductId: string | null;
  openUpsell: (productId?: string) => void;
  closeUpsell: () => void;
}

export const useUpsellStore = create<UpsellStore>((set) => ({
  isUpsellOpen: false,
  triggerProductId: null,
  
  openUpsell: (productId) => set({ 
    isUpsellOpen: true, 
    triggerProductId: productId || null 
  }),
  
  closeUpsell: () => set({ 
    isUpsellOpen: false, 
    triggerProductId: null 
  }),
}));

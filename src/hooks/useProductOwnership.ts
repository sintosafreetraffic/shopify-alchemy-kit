import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductOwnership } from '@/lib/productMapping';
import { toast } from 'sonner';

interface UseProductOwnershipResult {
  ownedProducts: ProductOwnership[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncProducts: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProductOwnership(email: string | null): UseProductOwnershipResult {
  const [ownedProducts, setOwnedProducts] = useState<ProductOwnership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const fetchOwnership = useCallback(async () => {
    if (!email) {
      setOwnedProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch from user_product_ownership table
      const { data, error } = await supabase
        .from('user_product_ownership')
        .select('*')
        .eq('email', email)
        .order('acquired_at', { ascending: false });

      if (error) {
        console.error('Error fetching product ownership:', error);
        setOwnedProducts([]);
      } else {
        setOwnedProducts(data || []);
        
        // Get last sync time from most recent record
        if (data && data.length > 0) {
          const latestSync = data.reduce((latest, item) => {
            return new Date(item.synced_at) > new Date(latest.synced_at) ? item : latest;
          });
          setLastSyncAt(latestSync.synced_at);
        }
      }
    } catch (err) {
      console.error('Error in fetchOwnership:', err);
      setOwnedProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const syncProducts = useCallback(async () => {
    if (!email) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-products', {
        body: { email },
      });

      if (error) {
        console.error('Sync error:', error);
        toast.error('Could not sync products', {
          description: 'Please try again later.',
        });
        return;
      }

      if (data?.success) {
        const count = data.synced_products?.length || 0;
        if (count > 0) {
          toast.success('Products synced', {
            description: `Found ${count} product${count !== 1 ? 's' : ''} from your orders.`,
          });
        } else {
          toast.info('No products found', {
            description: data.message || 'No fulfilled orders found for your email.',
          });
        }
        
        // Refresh the ownership data
        await fetchOwnership();
      }
    } catch (err) {
      console.error('Error syncing products:', err);
      toast.error('Sync failed', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [email, fetchOwnership]);

  useEffect(() => {
    fetchOwnership();
  }, [fetchOwnership]);

  return {
    ownedProducts,
    isLoading,
    isSyncing,
    lastSyncAt,
    syncProducts,
    refetch: fetchOwnership,
  };
}

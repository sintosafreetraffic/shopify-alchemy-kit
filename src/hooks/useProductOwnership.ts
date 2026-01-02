import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductOwnership } from '@/lib/productMapping';
import { toast } from 'sonner';

interface UseProductOwnershipResult {
  ownedProducts: ProductOwnership[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncProducts: (silent?: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProductOwnership(email: string | null): UseProductOwnershipResult {
  const [ownedProducts, setOwnedProducts] = useState<ProductOwnership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

  const fetchOwnership = useCallback(async (): Promise<{ hasNeverSynced: boolean }> => {
    if (!email) {
      setOwnedProducts([]);
      setIsLoading(false);
      return { hasNeverSynced: false };
    }

    try {
      // Check last_shopify_sync from sleep_profiles to determine if we've ever synced
      const { data: profileData } = await supabase
        .from('sleep_profiles')
        .select('last_shopify_sync')
        .eq('email', email)
        .single();
      
      const hasNeverSynced = !profileData?.last_shopify_sync;

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
        } else if (profileData?.last_shopify_sync) {
          setLastSyncAt(profileData.last_shopify_sync);
        }
      }
      
      return { hasNeverSynced };
    } catch (err) {
      console.error('Error in fetchOwnership:', err);
      setOwnedProducts([]);
      return { hasNeverSynced: false };
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const syncProducts = useCallback(async (silent = false) => {
    if (!email) return;
    
    setIsSyncing(true);
    try {
      console.log('[useProductOwnership] Syncing products for:', email, silent ? '(silent)' : '');
      const { data, error } = await supabase.functions.invoke('sync-shopify-products', {
        body: { email },
      });

      if (error) {
        console.error('Sync error:', error);
        if (!silent) {
          toast.error('Could not sync products', {
            description: 'Please try again later.',
          });
        }
        return;
      }

      if (data?.success) {
        const count = data.synced_products?.length || 0;
        if (!silent) {
          if (count > 0) {
            toast.success('Products synced', {
              description: `Found ${count} product${count !== 1 ? 's' : ''} from your orders.`,
            });
          } else {
            toast.info('No products found', {
              description: data.message || 'No fulfilled orders found for your email.',
            });
          }
        } else if (count > 0) {
          // Silent mode but found products - show a subtle notification
          console.log('[useProductOwnership] Auto-sync found', count, 'products');
        }
        
        // Refresh the ownership data
        await fetchOwnership();
      }
    } catch (err) {
      console.error('Error syncing products:', err);
      if (!silent) {
        toast.error('Sync failed', {
          description: 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [email, fetchOwnership]);

  // Auto-sync on first load if never synced before
  useEffect(() => {
    const initAndAutoSync = async () => {
      const { hasNeverSynced } = await fetchOwnership();
      
      // Auto-sync if this user has never synced before
      if (hasNeverSynced && email && !hasAutoSynced) {
        console.log('[useProductOwnership] First-time user, auto-syncing products...');
        setHasAutoSynced(true);
        await syncProducts(true); // Silent sync
      }
    };
    
    initAndAutoSync();
  }, [email]); // Only depend on email, not the functions

  // Wrap refetch to match Promise<void> signature
  const refetch = useCallback(async () => {
    await fetchOwnership();
  }, [fetchOwnership]);

  return {
    ownedProducts,
    isLoading,
    isSyncing,
    lastSyncAt,
    syncProducts,
    refetch,
  };
}

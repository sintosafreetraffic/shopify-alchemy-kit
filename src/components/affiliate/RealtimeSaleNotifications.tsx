/**
 * RealtimeSaleNotifications Component
 * 
 * Displays real-time notifications when affiliates earn commissions.
 * Uses Supabase Realtime to subscribe to commission inserts.
 * 
 * Premium, calm visual feedback with subtle celebration animations.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DollarSign, Sparkles, TrendingUp } from "lucide-react";

interface NewSaleNotification {
  id: string;
  amount: number;
  order_amount: number | null;
  level: number;
  created_at: string;
}

interface RealtimeSaleNotificationsProps {
  affiliateId: string;
  onNewSale?: (sale: NewSaleNotification) => void;
}

export function RealtimeSaleNotifications({ 
  affiliateId, 
  onNewSale 
}: RealtimeSaleNotificationsProps) {
  const [isConnected, setIsConnected] = useState(false);

  const showSaleToast = useCallback((sale: NewSaleNotification) => {
    const levelLabel = sale.level === 1 ? "Direct" : "Sub-affiliate";
    const emoji = sale.level === 1 ? "🎉" : "⭐";
    
    toast({
      title: `${emoji} New ${levelLabel} Sale!`,
      description: (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-semibold text-green-600">
            +${sale.amount.toFixed(2)} commission
          </span>
          {sale.order_amount && (
            <span className="text-muted-foreground text-sm">
              (${sale.order_amount.toFixed(2)} order)
            </span>
          )}
        </div>
      ),
      duration: 8000,
    });

    onNewSale?.(sale);
  }, [onNewSale]);

  useEffect(() => {
    if (!affiliateId) return;

    // Subscribe to commission inserts for this affiliate
    const channel = supabase
      .channel(`commissions_${affiliateId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commissions',
          filter: `affiliate_id=eq.${affiliateId}`,
        },
        (payload) => {
          const newCommission = payload.new as NewSaleNotification;
          console.log('[Realtime] New commission received:', newCommission.id);
          
          // Only show non-fraudulent commissions
          if (!(payload.new as any).fraud_flag) {
            showSaleToast(newCommission);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('[Realtime] Commission subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up commission subscription');
      supabase.removeChannel(channel);
    };
  }, [affiliateId, showSaleToast]);

  // Connection indicator (hidden but useful for debugging)
  return null;
}

export default RealtimeSaleNotifications;

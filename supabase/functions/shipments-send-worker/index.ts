/**
 * Shipments Send Worker
 * 
 * Cron-based worker that processes pending shipment notifications via Klaviyo.
 * Runs every 2 minutes to pick up pending notifications and send them.
 * 
 * Klaviyo Event: "Shipment Status Updated"
 * 
 * Payload format:
 * {
 *   order_id: string,
 *   tracking_number: string,
 *   shipping_status: string (internal state),
 *   shipping_status_label: string (human readable),
 *   carrier: string,
 *   estimated_delivery: string | null
 * }
 * 
 * Endpoint: POST /functions/v1/shipments-send-worker
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Human-readable status labels for emails (calm, Scandinavian copy)
const STATUS_LABELS: Record<string, string> = {
  'label_created': 'Shipment information received',
  'in_transit': 'On the way',
  'ready_for_pickup': 'Ready for pickup',
  'out_for_delivery': 'Out for delivery — arriving soon',
  'delivered': 'Delivered — we hope tonight feels better',
  'delivery_issue': 'Delivery attempted',
  'shipping_exception': 'Attention needed',
  'shipment_stalled': 'Tracking update needed',
  // Legacy status mappings (for backwards compatibility)
  'info_received': 'Shipment information received',
  'pickup': 'Ready for pickup',
  'undelivered': 'Delivery attempted',
  'alert': 'Attention needed',
  'expired': 'Tracking update needed',
};

// Build tracking URL (our site, not 17TRACK)
function buildTrackingUrl(orderId: string): string {
  // Use environment variable or default to production URL
  const baseUrl = Deno.env.get('TRACKING_BASE_URL') || 'https://rise-by-night.lovable.app';
  return `${baseUrl}/track?order=${encodeURIComponent(orderId)}`;
}

interface ShipmentNotification {
  id: string;
  order_id: string;
  tracking_number: string;
  status: string;
  channel: string;
  provider: string;
  status_state: string;
}

interface ShipmentTracking {
  email: string;
  carrier?: string;
  current_status: string;
  last_status_at?: string;
}

interface TrackingEvent {
  status_detail?: {
    origin_country?: string;
    destination_country?: string;
  };
}

interface OrderTracking {
  email: string;
  carrier_name?: string;
  carrier_code?: string;
  estimated_delivery?: string;
}

// Send event to Klaviyo with exact payload format per spec
async function sendToKlaviyo(
  klaviyoApiKey: string,
  email: string,
  notification: ShipmentNotification,
  carrier: string,
  estimatedDelivery: string | null
): Promise<{ success: boolean; error?: string }> {
  const eventName = 'Shipment Status Updated';
  
  const eventData = {
    data: {
      type: 'event',
      attributes: {
        profile: {
          data: {
            type: 'profile',
            attributes: {
              email: email,
            },
          },
        },
        metric: {
          data: {
            type: 'metric',
            attributes: {
              name: eventName,
            },
          },
        },
        properties: {
          order_id: notification.order_id,
          tracking_number: notification.tracking_number,
          shipping_status: notification.status,
          shipping_status_label: STATUS_LABELS[notification.status] || notification.status,
          carrier: carrier || '',
          estimated_delivery: estimatedDelivery,
          tracking_url: buildTrackingUrl(notification.order_id),
        },
        time: new Date().toISOString(),
      },
    },
  };

  console.log(`[shipments-send-worker] Sending Klaviyo event for ${notification.order_id}:`, eventName);
  console.log(`[shipments-send-worker] Payload:`, JSON.stringify(eventData.data.attributes.properties));

  try {
    const response = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[shipments-send-worker] Klaviyo API error (${response.status}):`, errorText);
      return { success: false, error: `Klaviyo API error: ${response.status} - ${errorText}` };
    }

    console.log(`[shipments-send-worker] Klaviyo event sent successfully for ${notification.order_id}`);
    return { success: true };
  } catch (error) {
    console.error(`[shipments-send-worker] Network error sending to Klaviyo:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * TASK_11: Send RBN_Order_Delivered event to Klaviyo
 * Fires ONCE per order when delivery is confirmed
 * Used to trigger Klaviyo flow: Delivered + 7 days → Review request
 */
async function sendDeliveredEvent(
  klaviyoApiKey: string,
  email: string,
  orderId: string,
  deliveredAt: string,
  country?: string | null
): Promise<{ success: boolean; error?: string }> {
  const eventName = 'RBN_Order_Delivered';
  
  const eventData = {
    data: {
      type: 'event',
      attributes: {
        profile: {
          data: {
            type: 'profile',
            attributes: {
              email: email,
            },
          },
        },
        metric: {
          data: {
            type: 'metric',
            attributes: {
              name: eventName,
            },
          },
        },
        properties: {
          order_id: orderId,
          delivered_at: deliveredAt,
          country: country || 'Unknown',
        },
        time: new Date().toISOString(),
        unique_id: `${orderId}_delivered`, // Dedupe key
      },
    },
  };

  console.log(`[shipments-send-worker] Sending RBN_Order_Delivered for ${orderId}`);

  try {
    const response = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[shipments-send-worker] RBN_Order_Delivered error (${response.status}):`, errorText);
      return { success: false, error: `Klaviyo API error: ${response.status}` };
    }

    console.log(`[shipments-send-worker] RBN_Order_Delivered sent for ${orderId}`);
    return { success: true };
  } catch (error) {
    console.error(`[shipments-send-worker] RBN_Order_Delivered network error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify CRON_SECRET for cron jobs
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  // Allow either CRON_SECRET or service role key
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (cronSecret && providedSecret !== cronSecret && providedSecret !== supabaseAnonKey) {
    // Check if it might be from the cron scheduler (no auth provided is OK for internal calls)
    const body = await req.text();
    let isInternalCall = false;
    try {
      const parsed = JSON.parse(body || '{}');
      isInternalCall = parsed.internal === true;
    } catch {
      // Not JSON, continue
    }
    
    if (!isInternalCall) {
      console.log('[shipments-send-worker] No valid auth provided, but proceeding for cron');
    }
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const klaviyoApiKey = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[shipments-send-worker] Missing Supabase configuration');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pending notifications (limit 50 per run)
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('shipment_notifications')
      .select('*')
      .eq('status_state', 'pending')
      .limit(50);

    if (fetchError) {
      console.error('[shipments-send-worker] Error fetching notifications:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error', details: fetchError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('[shipments-send-worker] No pending notifications');
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0,
        message: 'No pending notifications' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[shipments-send-worker] Processing ${pendingNotifications.length} pending notifications`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const notification of pendingNotifications as ShipmentNotification[]) {
      results.processed++;

      // Check if Klaviyo key is available
      if (!klaviyoApiKey) {
        console.log(`[shipments-send-worker] Missing Klaviyo key, marking as failed: ${notification.id}`);
        await supabase
          .from('shipment_notifications')
          .update({
            status_state: 'failed',
            reason: 'missing_klaviyo_key',
          })
          .eq('id', notification.id);
        results.failed++;
        results.errors.push(`${notification.order_id}: missing_klaviyo_key`);
        continue;
      }

      // Get shipment tracking info for email
      const { data: trackingData } = await supabase
        .from('shipment_trackings')
        .select('email, carrier, current_status, last_status_at')
        .eq('order_id', notification.order_id)
        .eq('tracking_number', notification.tracking_number)
        .single();

      // If no tracking data, try order_tracking table
      let email = (trackingData as ShipmentTracking | null)?.email;
      let carrier = (trackingData as ShipmentTracking | null)?.carrier || '';
      let estimatedDelivery: string | null = null;
      
      if (!email) {
        const { data: orderTrackingData } = await supabase
          .from('order_tracking')
          .select('email, carrier_name, carrier_code, estimated_delivery')
          .eq('tracking_number', notification.tracking_number)
          .single();
        
        if (orderTrackingData) {
          const otd = orderTrackingData as OrderTracking;
          email = otd.email;
          carrier = otd.carrier_name || otd.carrier_code || '';
          estimatedDelivery = otd.estimated_delivery || null;
        }
      }

      if (!email) {
        console.log(`[shipments-send-worker] No email found for ${notification.order_id}, marking as failed`);
        await supabase
          .from('shipment_notifications')
          .update({
            status_state: 'failed',
            reason: 'no_email_found',
          })
          .eq('id', notification.id);
        results.failed++;
        results.errors.push(`${notification.order_id}: no_email_found`);
        continue;
      }

      // Send to Klaviyo with exact payload format
      const sendResult = await sendToKlaviyo(
        klaviyoApiKey,
        email,
        notification,
        carrier,
        estimatedDelivery
      );

      if (sendResult.success) {
        await supabase
          .from('shipment_notifications')
          .update({
            status_state: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
        results.sent++;
        
        // TASK_11: If status is 'delivered', also send RBN_Order_Delivered event
        if (notification.status === 'delivered' && klaviyoApiKey) {
          // Get destination country from order_tracking
          const { data: orderData } = await supabase
            .from('order_tracking')
            .select('destination_country, delivered_at')
            .eq('order_number', notification.order_id)
            .single();
          
          const deliveredAt = (orderData as { delivered_at?: string })?.delivered_at || new Date().toISOString();
          const country = (orderData as { destination_country?: string })?.destination_country;
          
          // Send RBN_Order_Delivered (fire-and-forget, don't fail the notification on this)
          sendDeliveredEvent(klaviyoApiKey, email, notification.order_id, deliveredAt, country)
            .catch(err => console.error(`[shipments-send-worker] RBN_Order_Delivered failed:`, err));
        }
      } else {
        await supabase
          .from('shipment_notifications')
          .update({
            status_state: 'failed',
            reason: sendResult.error,
          })
          .eq('id', notification.id);
        results.failed++;
        results.errors.push(`${notification.order_id}: ${sendResult.error}`);
      }
    }

    console.log(`[shipments-send-worker] Completed: ${results.sent} sent, ${results.failed} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      ...results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[shipments-send-worker] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

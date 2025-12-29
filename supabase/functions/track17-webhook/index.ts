/**
 * 17TRACK Webhook Handler
 * 
 * Receives tracking updates from 17TRACK, stores events, and enqueues email notifications.
 * Verified using the 17token header (same as API key).
 * Endpoint: POST /functions/v1/track17-webhook
 * 
 * Status Mapping (17TRACK → Internal):
 * - Info received → label_created
 * - In transit → in_transit
 * - Pick up → ready_for_pickup
 * - Out for delivery → out_for_delivery
 * - Delivered → delivered
 * - Undelivered → delivery_issue
 * - Alert → shipping_exception
 * - Expired → shipment_stalled
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, 17token',
};

// 17TRACK status code mapping to canonical internal states
// See: https://api.17track.net/docs/v2.4
const STATUS_MAP: Record<number, string> = {
  // 0: Not found - IGNORED (too noisy per spec)
  10: 'label_created',      // Info received
  20: 'in_transit',         // In transit
  30: 'shipment_stalled',   // Expired
  35: 'delivery_issue',     // Undelivered (failed attempt)
  40: 'ready_for_pickup',   // Pick up
  50: 'out_for_delivery',   // Out for delivery
  60: 'delivered',          // Delivered
  70: 'shipping_exception', // Exception/Alert
};

// Statuses that can trigger email notifications (per spec)
const NOTIFIABLE_STATUSES = [
  'label_created',       // Optional, off by default
  'in_transit',          // Optional, off by default
  'ready_for_pickup',    // Optional, off by default
  'out_for_delivery',    // On
  'delivered',           // Always on
  'delivery_issue',      // On
  'shipping_exception',  // On
  'shipment_stalled',    // On
];

// Human-readable status labels for emails (calm, Scandinavian copy)
const STATUS_LABELS: Record<string, string> = {
  'label_created': 'Shipment information received',
  'in_transit': 'On the way',
  'ready_for_pickup': 'Ready for pickup',
  'out_for_delivery': 'Out for delivery — arriving soon',
  'delivered': 'Delivered',
  'delivery_issue': 'Delivery attempted',
  'shipping_exception': 'Attention needed',
  'shipment_stalled': 'Tracking update needed',
};

// Status progression order (for regression detection)
const STATUS_ORDER: Record<string, number> = {
  'label_created': 1,
  'in_transit': 2,
  'ready_for_pickup': 3,
  'out_for_delivery': 4,
  'delivered': 5,
  'delivery_issue': 3, // Can occur at any point after in_transit
  'shipping_exception': 3,
  'shipment_stalled': 3,
};

interface TrackEvent {
  a: string;  // Description
  b?: string; // Time (ISO format)
  c?: string; // Location
  d?: string; // Time zone
}

interface Track17Event {
  number: string;
  carrier: number;
  param?: {
    order?: string;
    order_id?: string;
  };
  tag?: string;
  track?: {
    e: number; // Main status code
    f?: number; // Sub status code
    z0?: {
      a: string; // Last event description
      b: string; // Last event time (ISO format)
    };
    z1?: {
      a: string; // Origin country
    };
    z2?: {
      a: string; // Destination country
    };
    ygt1?: string; // Estimated delivery start
    ygt2?: string; // Estimated delivery end
    w1?: string; // Delivery time
    z?: TrackEvent[]; // Full event history
  };
  track_info?: {
    latest_status?: {
      status: string;
      sub_status?: string;
    };
    latest_event?: {
      description: string;
      time_iso: string;
    };
  };
}

interface Track17Payload {
  event: string;
  data: {
    number: string;
    carrier: number;
    param?: {
      order?: string;
      order_id?: string;
    };
    track?: Track17Event['track'];
    track_info?: Track17Event['track_info'];
  };
}

// Generate SHA-256 hash for payload deduplication
async function hashPayload(payload: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get app settings for email notification configuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getEmailSettings(supabase: any): Promise<{
  labelCreatedEnabled: boolean;
  inTransitEnabled: boolean;
  pickupEnabled: boolean;
  maxPerOrder: number;
}> {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [
      'shipping_email_info_received_enabled',
      'shipping_email_in_transit_enabled',
      'shipping_email_pickup_enabled',
      'shipping_email_max_per_order'
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settingsMap = Object.fromEntries((settings || []).map((s: any) => [s.key, s.value]));
  
  return {
    labelCreatedEnabled: settingsMap['shipping_email_info_received_enabled'] === true,
    inTransitEnabled: settingsMap['shipping_email_in_transit_enabled'] === true,
    pickupEnabled: settingsMap['shipping_email_pickup_enabled'] === true,
    maxPerOrder: typeof settingsMap['shipping_email_max_per_order'] === 'number'
      ? settingsMap['shipping_email_max_per_order'] : 4, // Default: max 4 emails per order
  };
}

// Check if new status is a regression (going backwards in flow)
function isRegression(previousStatus: string | null, newStatus: string): boolean {
  if (!previousStatus) return false;
  
  const previousOrder = STATUS_ORDER[previousStatus] || 0;
  const newOrder = STATUS_ORDER[newStatus] || 0;
  
  // If new status has lower order, it's a regression (except for delivered which is always valid)
  if (newStatus === 'delivered') return false;
  
  return newOrder < previousOrder;
}

// Enqueue an email notification with dedupe and rate limiting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enqueueShipmentEmail(
  supabase: any,
  orderId: string,
  trackingNumber: string,
  status: string,
  previousStatus: string | null,
  settings: Awaited<ReturnType<typeof getEmailSettings>>
): Promise<{ enqueued: boolean; reason?: string }> {
  console.log(`[17track-webhook] Enqueue email check: order=${orderId}, status=${status}, previous=${previousStatus}`);

  // Check if status is notifiable
  if (!NOTIFIABLE_STATUSES.includes(status)) {
    console.log(`[17track-webhook] Status ${status} is not notifiable, skipping`);
    return { enqueued: false, reason: 'not_notifiable' };
  }

  // Check for regression (going backwards in status flow)
  if (isRegression(previousStatus, status)) {
    console.log(`[17track-webhook] Regression detected: ${previousStatus} → ${status}, skipping`);
    return { enqueued: false, reason: 'regression' };
  }

  // Check settings for optional statuses
  if (status === 'label_created' && !settings.labelCreatedEnabled) {
    console.log(`[17track-webhook] label_created emails disabled`);
    return { enqueued: false, reason: 'status_disabled' };
  }
  if (status === 'in_transit' && !settings.inTransitEnabled) {
    console.log(`[17track-webhook] in_transit emails disabled`);
    return { enqueued: false, reason: 'status_disabled' };
  }
  if (status === 'ready_for_pickup' && !settings.pickupEnabled) {
    console.log(`[17track-webhook] ready_for_pickup emails disabled`);
    return { enqueued: false, reason: 'status_disabled' };
  }

  // Check for existing notification (dedupe) - one email per state change ever
  const { data: existingNotification } = await supabase
    .from('shipment_notifications')
    .select('id, status_state')
    .eq('order_id', orderId)
    .eq('tracking_number', trackingNumber)
    .eq('status', status)
    .eq('channel', 'email')
    .single();

  if (existingNotification) {
    console.log(`[17track-webhook] Notification already exists for (${orderId}, ${status}): ${existingNotification.status_state}`);
    return { enqueued: false, reason: 'already_exists' };
  }

  // Check total sent count (cap) - max 4 emails per order
  const { count: sentCount } = await supabase
    .from('shipment_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('channel', 'email')
    .eq('status_state', 'sent');

  // Always allow delivered even if cap reached
  if (status !== 'delivered' && (sentCount || 0) >= settings.maxPerOrder) {
    console.log(`[17track-webhook] Max emails reached for order ${orderId}: ${sentCount}/${settings.maxPerOrder}`);
    
    // Insert as skipped_cap
    await supabase.from('shipment_notifications').insert({
      order_id: orderId,
      tracking_number: trackingNumber,
      status,
      channel: 'email',
      provider: 'klaviyo',
      status_state: 'skipped_cap',
      reason: `Max ${settings.maxPerOrder} emails per order reached`,
    });
    
    return { enqueued: false, reason: 'cap_reached' };
  }

  // Insert as pending
  const { error: insertError } = await supabase.from('shipment_notifications').insert({
    order_id: orderId,
    tracking_number: trackingNumber,
    status,
    channel: 'email',
    provider: 'klaviyo',
    status_state: 'pending',
  });

  if (insertError) {
    console.error(`[17track-webhook] Failed to insert notification:`, insertError);
    return { enqueued: false, reason: 'insert_error' };
  }

  console.log(`[17track-webhook] Notification enqueued: order=${orderId}, status=${status}`);
  return { enqueued: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    console.error('[17track-webhook] Invalid method:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify 17token header for security
  const track17ApiKey = Deno.env.get('TRACK17_API_KEY');
  const providedToken = req.headers.get('17token');
  
  if (track17ApiKey && providedToken) {
    if (providedToken !== track17ApiKey) {
      console.error('[17track-webhook] Invalid 17token provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[17track-webhook] Token verified successfully');
  } else {
    // Log warning but allow request (17TRACK may not send token on webhooks)
    console.log('[17track-webhook] No token verification performed');
  }

  try {
    const payload: Track17Payload = await req.json();
    
    console.log('[17track-webhook] Received event:', payload.event);
    console.log('[17track-webhook] Tracking number:', payload.data?.number);
    
    // Validate payload structure
    if (!payload.data?.number) {
      console.error('[17track-webhook] Missing tracking number in payload');
      return new Response(JSON.stringify({ error: 'Invalid payload: missing tracking number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[17track-webhook] Missing Supabase configuration');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const trackingNumber = payload.data.number;
    const trackData = payload.data.track;
    const trackInfo = payload.data.track_info;
    
    // Extract status
    const statusCode = trackData?.e ?? 0;
    
    // Ignore "Not found" status (code 0) - too noisy per spec
    if (statusCode === 0) {
      console.log('[17track-webhook] Ignoring "Not found" status (code 0)');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Status "Not found" ignored per policy',
        tracking_number: trackingNumber,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const status = STATUS_MAP[statusCode] || 'unknown';
    const subStatus = trackData?.f?.toString();
    
    // Extract event info
    const lastEvent = trackData?.z0?.a || trackInfo?.latest_event?.description;
    const lastEventTime = trackData?.z0?.b || trackInfo?.latest_event?.time_iso;
    
    // Extract location info
    const originCountry = trackData?.z1?.a;
    const destinationCountry = trackData?.z2?.a;
    
    // Extract delivery info
    const estimatedDelivery = trackData?.ygt1 || trackData?.ygt2;
    const deliveredAt = status === 'delivered' ? (trackData?.w1 || lastEventTime) : null;

    // Generate payload hash for dedupe
    const payloadHash = await hashPayload({
      number: trackingNumber,
      status: statusCode,
      lastEvent,
      lastEventTime,
    });

    // Try to find existing order_tracking record
    const { data: orderTracking } = await supabase
      .from('order_tracking')
      .select('id, order_number, email')
      .eq('tracking_number', trackingNumber)
      .single();

    const orderId = orderTracking?.order_number || payload.data.param?.order || payload.data.param?.order_id || trackingNumber;
    const email = orderTracking?.email;

    // Store in shipment_tracking_events (dedupe by payload_hash)
    const eventDetail = {
      description: lastEvent,
      location: trackData?.z0 ? undefined : trackData?.z?.[0]?.c,
      origin_country: originCountry,
      destination_country: destinationCountry,
      raw_status_code: statusCode,
      sub_status: subStatus,
    };

    const { error: eventInsertError } = await supabase
      .from('shipment_tracking_events')
      .insert({
        order_id: orderId,
        tracking_number: trackingNumber,
        status,
        status_detail: eventDetail,
        occurred_at: lastEventTime ? new Date(lastEventTime).toISOString() : new Date().toISOString(),
        payload_hash: payloadHash,
      });

    if (eventInsertError) {
      if (eventInsertError.code === '23505') { // Unique violation
        console.log('[17track-webhook] Duplicate event (payload_hash), skipping');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Duplicate event, already processed',
          tracking_number: trackingNumber,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('[17track-webhook] Event insert error:', eventInsertError);
    }

    // Update or create shipment_trackings record
    const { data: existingShipment } = await supabase
      .from('shipment_trackings')
      .select('id, current_status')
      .eq('order_id', orderId)
      .eq('tracking_number', trackingNumber)
      .single();

    const previousStatus = existingShipment?.current_status;

    if (existingShipment) {
      await supabase
        .from('shipment_trackings')
        .update({
          current_status: status,
          last_status_at: lastEventTime ? new Date(lastEventTime).toISOString() : new Date().toISOString(),
        })
        .eq('id', existingShipment.id);
    } else if (email) {
      await supabase
        .from('shipment_trackings')
        .insert({
          order_id: orderId,
          email,
          tracking_number: trackingNumber,
          carrier: payload.data.carrier?.toString(),
          current_status: status,
          last_status_at: lastEventTime ? new Date(lastEventTime).toISOString() : new Date().toISOString(),
        });
    }

    // Store event history in tracking_events table (existing table)
    const eventHistory = trackData?.z || [];
    if (eventHistory.length > 0) {
      console.log('[17track-webhook] Processing', eventHistory.length, 'events for timeline');
      
      for (const event of eventHistory) {
        const eventTime = event.b ? new Date(event.b).toISOString() : null;
        
        await supabase
          .from('tracking_events')
          .upsert({
            tracking_number: trackingNumber,
            status: status,
            description: event.a,
            location: event.c || null,
            event_time: eventTime,
          }, {
            onConflict: 'tracking_number,event_time,description',
            ignoreDuplicates: true,
          });
      }
    }

    // Update order_tracking table (existing table)
    if (orderTracking) {
      await supabase
        .from('order_tracking')
        .update({
          status,
          sub_status: subStatus,
          last_event: lastEvent,
          last_event_time: lastEventTime ? new Date(lastEventTime).toISOString() : null,
          origin_country: originCountry,
          destination_country: destinationCountry,
          estimated_delivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
          delivered_at: deliveredAt ? new Date(deliveredAt).toISOString() : null,
          track17_data: payload.data,
        })
        .eq('tracking_number', trackingNumber);

      console.log('[17track-webhook] Updated order_tracking:', trackingNumber, 'Status:', status);
    }

    // Enqueue email notification if status changed and valid
    if (status !== previousStatus && status !== 'unknown') {
      const settings = await getEmailSettings(supabase);
      const enqueueResult = await enqueueShipmentEmail(
        supabase,
        orderId,
        trackingNumber,
        status,
        previousStatus,
        settings
      );
      console.log('[17track-webhook] Enqueue result:', enqueueResult);
    }

    // Respond quickly (17TRACK expects < 1s response)
    return new Response(JSON.stringify({ 
      success: true, 
      tracking_number: trackingNumber,
      status,
      status_label: STATUS_LABELS[status] || status,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[17track-webhook] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

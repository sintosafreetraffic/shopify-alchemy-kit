/**
 * 17TRACK Webhook Handler
 * 
 * Receives tracking updates from 17TRACK, stores events, and enqueues email notifications.
 * Verified using the 17token header (same as API key).
 * Endpoint: POST /functions/v1/track17-webhook
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, 17token',
};

// 17TRACK status mapping to canonical statuses
const STATUS_MAP: Record<number, string> = {
  0: 'pending',           // Not found
  10: 'info_received',    // Info received
  20: 'in_transit',       // In transit
  30: 'expired',          // Expired
  35: 'undelivered',      // Undelivered (failed attempt)
  40: 'pickup',           // Ready for pickup
  50: 'out_for_delivery', // Out for delivery
  60: 'delivered',        // Delivered
  70: 'alert',            // Exception/Alert
};

// Statuses that can trigger email notifications
const NOTIFIABLE_STATUSES = [
  'info_received',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'pickup',
  'undelivered',
  'alert',
  'expired'
];

// Human-readable status labels for emails
const STATUS_LABELS: Record<string, string> = {
  'info_received': 'Shipment information received',
  'in_transit': 'In transit',
  'out_for_delivery': 'Out for delivery',
  'delivered': 'Delivered',
  'pickup': 'Ready for pickup',
  'undelivered': 'Delivery attempted',
  'alert': 'Attention required',
  'expired': 'Tracking expired',
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
  infoReceivedEnabled: boolean;
  pickupEnabled: boolean;
  cooldownHours: number;
  maxPerOrder: number;
}> {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [
      'shipping_email_info_received_enabled',
      'shipping_email_pickup_enabled',
      'shipping_email_cooldown_hours',
      'shipping_email_max_per_order'
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settingsMap = Object.fromEntries((settings || []).map((s: any) => [s.key, s.value]));
  
  return {
    infoReceivedEnabled: settingsMap['shipping_email_info_received_enabled'] === true,
    pickupEnabled: settingsMap['shipping_email_pickup_enabled'] === true,
    cooldownHours: typeof settingsMap['shipping_email_cooldown_hours'] === 'number' 
      ? settingsMap['shipping_email_cooldown_hours'] : 12,
    maxPerOrder: typeof settingsMap['shipping_email_max_per_order'] === 'number'
      ? settingsMap['shipping_email_max_per_order'] : 6,
  };
}

// Enqueue an email notification with dedupe and rate limiting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enqueueShipmentEmail(
  supabase: any,
  orderId: string,
  trackingNumber: string,
  status: string,
  settings: Awaited<ReturnType<typeof getEmailSettings>>
): Promise<{ enqueued: boolean; reason?: string }> {
  console.log(`[17track-webhook] Enqueue email check: order=${orderId}, status=${status}`);

  // Check if status is notifiable
  if (!NOTIFIABLE_STATUSES.includes(status)) {
    console.log(`[17track-webhook] Status ${status} is not notifiable, skipping`);
    return { enqueued: false, reason: 'not_notifiable' };
  }

  // Check settings for optional statuses
  if (status === 'info_received' && !settings.infoReceivedEnabled) {
    console.log(`[17track-webhook] info_received emails disabled`);
    return { enqueued: false, reason: 'status_disabled' };
  }
  if (status === 'pickup' && !settings.pickupEnabled) {
    console.log(`[17track-webhook] pickup emails disabled`);
    return { enqueued: false, reason: 'status_disabled' };
  }

  // Check for existing notification (dedupe)
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

  // Check total sent count (cap)
  const { count: sentCount } = await supabase
    .from('shipment_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('channel', 'email')
    .eq('status_state', 'sent');

  if ((sentCount || 0) >= settings.maxPerOrder) {
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

  // Check cooldown (last sent within cooldownHours, unless it's the first notification for this status)
  const cooldownTime = new Date(Date.now() - settings.cooldownHours * 60 * 60 * 1000).toISOString();
  
  const { data: recentNotifications } = await supabase
    .from('shipment_notifications')
    .select('id, sent_at, status')
    .eq('order_id', orderId)
    .eq('channel', 'email')
    .eq('status_state', 'sent')
    .gte('sent_at', cooldownTime)
    .limit(1);

  // If there's a recent notification and this isn't the first occurrence of this status, apply cooldown
  if (recentNotifications && recentNotifications.length > 0) {
    // Check if this is the first time we're seeing this status for this order
    const { count: statusCount } = await supabase
      .from('shipment_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('tracking_number', trackingNumber)
      .eq('status', status)
      .eq('channel', 'email')
      .in('status_state', ['sent', 'skipped_rate_limit', 'skipped_cap']);

    // For statuses like in_transit, we only send on first occurrence
    if (status === 'in_transit' && (statusCount || 0) > 0) {
      console.log(`[17track-webhook] in_transit already sent for this tracking, skipping`);
      await supabase.from('shipment_notifications').insert({
        order_id: orderId,
        tracking_number: trackingNumber,
        status,
        channel: 'email',
        provider: 'klaviyo',
        status_state: 'skipped_dedupe',
        reason: 'in_transit already notified',
      });
      return { enqueued: false, reason: 'in_transit_duplicate' };
    }

    // Apply cooldown for non-first-time statuses
    if ((statusCount || 0) > 0) {
      console.log(`[17track-webhook] Cooldown active for order ${orderId}, last sent within ${settings.cooldownHours}h`);
      await supabase.from('shipment_notifications').insert({
        order_id: orderId,
        tracking_number: trackingNumber,
        status,
        channel: 'email',
        provider: 'klaviyo',
        status_state: 'skipped_rate_limit',
        reason: `Cooldown: last email sent within ${settings.cooldownHours} hours`,
      });
      return { enqueued: false, reason: 'cooldown' };
    }
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

    // Enqueue email notification if status changed
    if (status !== previousStatus && status !== 'pending' && status !== 'unknown') {
      const settings = await getEmailSettings(supabase);
      const enqueueResult = await enqueueShipmentEmail(
        supabase,
        orderId,
        trackingNumber,
        status,
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

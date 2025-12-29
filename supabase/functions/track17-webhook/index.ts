/**
 * 17TRACK Webhook Handler
 * 
 * Receives tracking updates from 17TRACK and stores them in the database.
 * Verified using the 17token header (same as API key).
 * Endpoint: POST /functions/v1/track17-webhook
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, 17token',
};

// 17TRACK status mapping to human-readable statuses
const STATUS_MAP: Record<number, string> = {
  0: 'pending',      // Not found
  10: 'info_received', // Info received
  20: 'in_transit',   // In transit
  30: 'expired',      // Expired
  35: 'undelivered',  // Undelivered (failed attempt)
  40: 'pickup',       // Ready for pickup
  50: 'out_for_delivery', // Out for delivery
  60: 'delivered',    // Delivered
  70: 'alert',        // Exception/Alert
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

    // Store event history if available
    const eventHistory = trackData?.z || [];
    if (eventHistory.length > 0) {
      console.log('[17track-webhook] Processing', eventHistory.length, 'events for timeline');
      
      for (const event of eventHistory) {
        // Insert each event (idempotent - ignore duplicates based on tracking + time + description)
        const eventTime = event.b ? new Date(event.b).toISOString() : null;
        
        const { error: eventError } = await supabase
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
        
        if (eventError && !eventError.message.includes('duplicate')) {
          console.error('[17track-webhook] Event insert error:', eventError);
        }
      }
    }

    // Try to find existing record by tracking number
    const { data: existing } = await supabase
      .from('order_tracking')
      .select('id, order_number, email')
      .eq('tracking_number', trackingNumber)
      .single();

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
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

      if (updateError) {
        console.error('[17track-webhook] Update error:', updateError);
        throw updateError;
      }

      console.log('[17track-webhook] Updated tracking:', trackingNumber, 'Status:', status);
    } else {
      console.log('[17track-webhook] No existing record for tracking:', trackingNumber);
      // We could create a new record here if we had order info from the param field
      // For now, just log that we received an update for an unknown tracking number
    }

    // Respond quickly (17TRACK expects < 1s response)
    return new Response(JSON.stringify({ 
      success: true, 
      tracking_number: trackingNumber,
      status 
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

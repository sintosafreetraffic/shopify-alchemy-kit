/**
 * Track Lookup Edge Function
 * 
 * Looks up tracking info by order number + email.
 * Includes rate limiting (max 5 lookups per 24 hours per IP).
 * If not found locally, registers with 17TRACK API.
 * If found but stale, fetches real-time updates from 17TRACK.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRACK17_API_URL = 'https://api.17track.net/track/v2.4';
const RATE_LIMIT_MAX_REQUESTS = 5; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes - fetch fresh data if older

// 17TRACK status code mapping
const STATUS_MAP: Record<number, string> = {
  0: 'not_found',
  10: 'info_received',
  20: 'in_transit',
  30: 'expired',
  35: 'delivery_failed',
  40: 'available_for_pickup',
  50: 'out_for_delivery',
  60: 'delivered',
  70: 'exception',
};

interface TrackLookupRequest {
  order_number: string;
  email: string;
}

interface ShopifyOrder {
  id: string;
  email: string;
  fulfillments?: Array<{
    tracking_number?: string;
    tracking_company?: string;
    tracking_url?: string;
  }>;
}

// Simple hash function for IP anonymization
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'ip_' + Math.abs(hash).toString(16);
}

// Fetch tracking info from 17TRACK after registration
// Uses /gettrackinfo which works with basic API plans
async function fetchRegisteredTracking(
  trackingNumber: string,
  track17ApiKey: string
): Promise<{
  status: string;
  lastEvent: string | null;
  lastEventTime: string | null;
  events: Array<{ description: string; time: string | null; location: string | null }>;
  originCountry: string | null;
  destinationCountry: string | null;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  carrierName: string | null;
} | null> {
  try {
    console.log(`[track-lookup] Fetching tracking info for ${trackingNumber} via gettrackinfo`);
    
    const response = await fetch(`${TRACK17_API_URL}/gettrackinfo`, {
      method: 'POST',
      headers: {
        '17token': track17ApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    if (!response.ok) {
      console.error(`[track-lookup] 17TRACK API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`[track-lookup] 17TRACK gettrackinfo response:`, JSON.stringify(data).substring(0, 1000));

    if (data.code !== 0) {
      console.log(`[track-lookup] 17TRACK API error code: ${data.code}`);
      return null;
    }

    const accepted = data.data?.accepted || [];
    if (accepted.length === 0) {
      console.log(`[track-lookup] No accepted tracking data`);
      return null;
    }

    const trackItem = accepted[0];
    const trackInfo = trackItem.track_info;
    const track = trackItem.track; // Legacy format fallback
    
    if (!trackInfo && !track) {
      console.log(`[track-lookup] No track data in response`);
      return null;
    }

    // V2.4 uses track_info with human-readable status
    let status = 'unknown';
    let lastEvent: string | null = null;
    let lastEventTime: string | null = null;
    let events: Array<{ description: string; time: string | null; location: string | null }> = [];
    
    if (trackInfo) {
      // V2.4 format
      const latestStatus = trackInfo.latest_status?.status?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
      status = latestStatus;
      lastEvent = trackInfo.latest_event?.description || null;
      lastEventTime = trackInfo.latest_event?.time_iso || null;
    } else if (track) {
      // Legacy format fallback
      const statusCode = track.e ?? 0;
      status = STATUS_MAP[statusCode] || 'unknown';
      lastEvent = track.z0?.a || null;
      lastEventTime = track.z0?.b || null;
      events = (track.z || []).map((event: { a: string; b?: string; c?: string }) => ({
        description: event.a,
        time: event.b || null,
        location: event.c || null,
      }));
    }
    
    const originCountry = trackInfo?.shipping_info?.shipper_address?.country || track?.z1?.a || null;
    const destCountry = trackInfo?.shipping_info?.recipient_address?.country || track?.z2?.a || null;
    
    console.log(`[track-lookup] Parsed: status=${status}, lastEvent=${lastEvent}`);
    
    return {
      status,
      lastEvent,
      lastEventTime,
      events,
      originCountry,
      destinationCountry: destCountry,
      estimatedDelivery: track?.ygt1 || track?.ygt2 || null,
      deliveredAt: status === 'delivered' ? lastEventTime : null,
      carrierName: null,
    };
  } catch (error) {
    console.error(`[track-lookup] Error fetching tracking:`, error);
    return null;
  }
}

// Register tracking number with 17TRACK for tracking + webhook updates
async function registerWith17Track(
  trackingNumber: string,
  orderId: string,
  track17ApiKey: string
): Promise<{ success: boolean; alreadyRegistered: boolean }> {
  try {
    console.log(`[track-lookup] Registering ${trackingNumber} with 17TRACK`);
    
    const response = await fetch(`${TRACK17_API_URL}/register`, {
      method: 'POST',
      headers: {
        '17token': track17ApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        number: trackingNumber,
        auto_detection: true,
        tag: orderId,
      }]),
    });

    if (!response.ok) {
      console.error(`[track-lookup] 17TRACK register API error: ${response.status}`);
      return { success: false, alreadyRegistered: false };
    }

    const data = await response.json();
    console.log(`[track-lookup] 17TRACK register response:`, JSON.stringify(data).substring(0, 500));

    if (data.code !== 0) {
      console.log(`[track-lookup] 17TRACK register error code: ${data.code}`);
      return { success: false, alreadyRegistered: false };
    }

    const accepted = data.data?.accepted || [];
    const rejected = data.data?.rejected || [];
    
    if (rejected.length > 0) {
      const rejection = rejected[0];
      // -18019901 means already registered - that's fine!
      if (rejection?.error?.code === -18019901) {
        console.log(`[track-lookup] ${trackingNumber} already registered with 17TRACK`);
        return { success: true, alreadyRegistered: true };
      }
      console.log(`[track-lookup] Registration rejected:`, JSON.stringify(rejection));
      return { success: false, alreadyRegistered: false };
    }

    console.log(`[track-lookup] Successfully registered ${trackingNumber} with 17TRACK`);
    return { success: accepted.length > 0, alreadyRegistered: false };
  } catch (error) {
    console.error(`[track-lookup] Error registering with 17TRACK:`, error);
    return { success: false, alreadyRegistered: false };
  }
}

// Combined function: register if needed, then fetch tracking info
async function fetchRealTimeTracking(
  trackingNumber: string,
  track17ApiKey: string,
  orderId: string
): Promise<{
  status: string;
  lastEvent: string | null;
  lastEventTime: string | null;
  events: Array<{ description: string; time: string | null; location: string | null }>;
  originCountry: string | null;
  destinationCountry: string | null;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  carrierName: string | null;
} | null> {
  // Step 1: Register the tracking number (if not already)
  const registerResult = await registerWith17Track(trackingNumber, orderId, track17ApiKey);
  
  if (!registerResult.success) {
    console.log(`[track-lookup] Registration failed for ${trackingNumber}`);
    return null;
  }
  
  // Step 2: If just registered, tracking info won't be available immediately
  // Wait briefly for 17TRACK to process
  if (!registerResult.alreadyRegistered) {
    console.log(`[track-lookup] Just registered ${trackingNumber}, waiting 2s for 17TRACK to process...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Step 3: Fetch tracking info
  return await fetchRegisteredTracking(trackingNumber, track17ApiKey);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { order_number, email }: TrackLookupRequest = await req.json();

    if (!order_number || !email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        message: 'Both order_number and email are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOrderNumber = order_number.trim();
    
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    const ipHash = hashIP(clientIP);
    const lookupKey = `${normalizedOrderNumber}:${normalizedEmail}`;

    console.log('[track-lookup] Looking up order:', normalizedOrderNumber, 'email:', normalizedEmail);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const track17ApiKey = Deno.env.get('TRACK17_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have tracking cached in the database
    const { data: existingTracking, error: lookupError } = await supabase
      .from('order_tracking')
      .select('*')
      .eq('order_number', normalizedOrderNumber)
      .eq('email', normalizedEmail);

    if (lookupError) {
      console.error('[track-lookup] Database error:', lookupError);
      throw lookupError;
    }

    // If we have tracking data, check if it needs refreshing
    if (existingTracking && existingTracking.length > 0) {
      console.log('[track-lookup] Found existing tracking data');
      
      const trackingWithEvents = await Promise.all(
        existingTracking.map(async (tracking) => {
          if (!tracking.tracking_number) return { ...tracking, events: [] };

          // Check if data is stale (no real updates, just initial state)
          const isStale = !tracking.last_event_time || 
            tracking.status === 'info_received' ||
            (new Date().getTime() - new Date(tracking.updated_at).getTime() > STALE_THRESHOLD_MS);

          // Fetch fresh data from 17TRACK if stale and we have API key
          if (isStale && track17ApiKey) {
            console.log(`[track-lookup] Data is stale, fetching fresh tracking for ${tracking.tracking_number}`);
            
            // Register and fetch tracking data from 17TRACK
            const freshData = await fetchRealTimeTracking(tracking.tracking_number, track17ApiKey, tracking.order_number);
            
            if (freshData && freshData.status !== 'not_found' && freshData.status !== 'unknown') {
              console.log(`[track-lookup] Got fresh data: status=${freshData.status}, lastEvent=${freshData.lastEvent}`);
              
              // Update database with fresh data
              const updateData: Record<string, unknown> = {
                status: freshData.status,
                last_event: freshData.lastEvent,
                last_event_time: freshData.lastEventTime ? new Date(freshData.lastEventTime).toISOString() : null,
                origin_country: freshData.originCountry,
                destination_country: freshData.destinationCountry,
                updated_at: new Date().toISOString(),
              };
              
              if (freshData.estimatedDelivery) {
                updateData.estimated_delivery = new Date(freshData.estimatedDelivery).toISOString();
              }
              if (freshData.deliveredAt) {
                updateData.delivered_at = new Date(freshData.deliveredAt).toISOString();
              }
              if (freshData.carrierName) {
                updateData.carrier_name = freshData.carrierName;
              }
              
              await supabase
                .from('order_tracking')
                .update(updateData)
                .eq('id', tracking.id);

              // Upsert events to tracking_events table
              for (const event of freshData.events) {
                if (event.description) {
                  await supabase
                    .from('tracking_events')
                    .upsert({
                      tracking_number: tracking.tracking_number,
                      status: freshData.status,
                      description: event.description,
                      location: event.location,
                      event_time: event.time ? new Date(event.time).toISOString() : null,
                    }, {
                      onConflict: 'tracking_number,event_time,description',
                      ignoreDuplicates: true,
                    });
                }
              }

              return {
                ...tracking,
                status: freshData.status,
                carrier_name: freshData.carrierName || tracking.carrier_name,
                last_event: freshData.lastEvent,
                last_event_time: freshData.lastEventTime,
                origin_country: freshData.originCountry,
                destination_country: freshData.destinationCountry,
                estimated_delivery: freshData.estimatedDelivery,
                delivered_at: freshData.deliveredAt,
                events: freshData.events.map(e => ({
                  description: e.description,
                  location: e.location,
                  event_time: e.time,
                })),
              };
            } else {
              console.log(`[track-lookup] No fresh data available yet for ${tracking.tracking_number}`);
            }
          }

          // Fetch existing events from database
          const { data: events } = await supabase
            .from('tracking_events')
            .select('*')
            .eq('tracking_number', tracking.tracking_number)
            .order('event_time', { ascending: false })
            .limit(20);

          return { ...tracking, events: events || [] };
        })
      );

      return new Response(JSON.stringify({
        success: true,
        found: true,
        tracking: trackingWithEvents,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No existing tracking - check rate limit before querying Shopify
    let isAdmin = false;
    const authHeader = req.headers.get('authorization');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (authHeader && anonKey) {
      try {
        const authClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userError } = await authClient.auth.getUser();
        if (!userError && userData?.user?.id) {
          const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
            _user_id: userData.user.id,
            _role: 'admin',
          });

          if (!roleError && hasAdminRole === true) {
            isAdmin = true;
          }
        }
      } catch (e) {
        console.log('[track-lookup] Admin bypass check failed (continuing):', e);
      }
    }

    // Rate limit for uncached lookups
    if (!isAdmin) {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

      const { data: rateData } = await supabase
        .from('tracking_requests')
        .select('request_count, last_request_at')
        .eq('ip_hash', ipHash)
        .eq('tracking_lookup_key', lookupKey)
        .gte('last_request_at', windowStart)
        .maybeSingle();

      if (rateData && rateData.request_count >= RATE_LIMIT_MAX_REQUESTS) {
        console.log('[track-lookup] Rate limit exceeded for IP hash:', ipHash);
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many tracking requests. Please try again later.',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update rate limit counter
      if (rateData) {
        await supabase
          .from('tracking_requests')
          .update({
            request_count: rateData.request_count + 1,
            last_request_at: new Date().toISOString(),
          })
          .eq('ip_hash', ipHash)
          .eq('tracking_lookup_key', lookupKey);
      } else {
        await supabase
          .from('tracking_requests')
          .upsert({
            ip_hash: ipHash,
            tracking_lookup_key: lookupKey,
            request_count: 1,
            first_request_at: new Date().toISOString(),
            last_request_at: new Date().toISOString(),
          }, {
            onConflict: 'ip_hash,tracking_lookup_key',
          });
      }
    } else {
      console.log('[track-lookup] Admin bypass: skipping rate limit');
    }

    // No existing tracking - try to get from Shopify
    const shopifyToken = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN') || Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    const shopifyDomain = 'lovable-project-swlbs.myshopify.com';
    
    if (!shopifyToken) {
      console.log('[track-lookup] No Shopify token available, cannot look up order');
      return new Response(JSON.stringify({
        success: true,
        found: false,
        message: 'Order not found. Please check your order number and email address.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderNameToSearch = normalizedOrderNumber.startsWith('#') 
      ? normalizedOrderNumber 
      : `#${normalizedOrderNumber}`;
    
    console.log('[track-lookup] Searching Shopify for order name:', orderNameToSearch);
    
    const shopifySearchUrl = `https://${shopifyDomain}/admin/api/2024-01/orders.json?name=${encodeURIComponent(orderNameToSearch)}&status=any`;
    
    const shopifyResponse = await fetch(shopifySearchUrl, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      console.error('[track-lookup] Shopify API error:', shopifyResponse.status);
      return new Response(JSON.stringify({
        success: true,
        found: false,
        message: 'Unable to look up order. Please try again later.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const shopifyData = await shopifyResponse.json();
    const orders = shopifyData.orders || [];
    
    const matchingOrder = orders.find((order: ShopifyOrder) => 
      order.email?.toLowerCase() === normalizedEmail
    );

    if (!matchingOrder) {
      console.log('[track-lookup] No matching Shopify order found');
      return new Response(JSON.stringify({
        success: true,
        found: false,
        message: 'Order not found. Please verify your order number and the email address used for the order.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check fulfillments
    const fulfillments = matchingOrder.fulfillments || [];
    
    if (fulfillments.length === 0) {
      console.log('[track-lookup] Order has no fulfillments yet');
      return new Response(JSON.stringify({
        success: true,
        found: true,
        tracking: [{
          order_number: normalizedOrderNumber,
          email: normalizedEmail,
          status: 'processing',
          last_event: 'Your order is being prepared for shipment.',
          events: [],
        }],
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process fulfillments
    const trackingResults = [];

    for (const fulfillment of fulfillments) {
      if (!fulfillment.tracking_number) continue;

      // Insert into database
      const trackingData = {
        order_number: normalizedOrderNumber,
        email: normalizedEmail,
        tracking_number: fulfillment.tracking_number,
        carrier_name: fulfillment.tracking_company || 'Unknown',
        status: 'info_received',
        last_event: 'Tracking number received from Shopify',
      };

      const { data: inserted, error: insertError } = await supabase
        .from('order_tracking')
        .upsert(trackingData, { 
          onConflict: 'order_number,tracking_number',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (insertError) {
        console.error('[track-lookup] Insert error:', insertError);
        continue;
      }

      // Try to fetch real-time tracking immediately
      let events: Array<{ description: string; time: string | null; location: string | null }> = [];
      let finalStatus = 'info_received';
      let lastEvent = 'Tracking number received from Shopify';
      let lastEventTime: string | null = null;

      if (track17ApiKey) {
        // Register and fetch tracking data from 17TRACK
        const freshData = await fetchRealTimeTracking(fulfillment.tracking_number, track17ApiKey, normalizedOrderNumber);
        
        if (freshData && freshData.status !== 'not_found') {
          finalStatus = freshData.status;
          lastEvent = freshData.lastEvent || lastEvent;
          lastEventTime = freshData.lastEventTime;
          events = freshData.events;

          // Update database with fresh data
          await supabase
            .from('order_tracking')
            .update({
              status: freshData.status,
              last_event: freshData.lastEvent,
              last_event_time: freshData.lastEventTime ? new Date(freshData.lastEventTime).toISOString() : null,
              origin_country: freshData.originCountry,
              destination_country: freshData.destinationCountry,
              estimated_delivery: freshData.estimatedDelivery ? new Date(freshData.estimatedDelivery).toISOString() : null,
              delivered_at: freshData.deliveredAt ? new Date(freshData.deliveredAt).toISOString() : null,
            })
            .eq('id', inserted.id);
        }
      }

      trackingResults.push({
        ...inserted,
        status: finalStatus,
        last_event: lastEvent,
        last_event_time: lastEventTime,
        events: events.map(e => ({
          description: e.description,
          location: e.location,
          event_time: e.time,
        })),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      found: trackingResults.length > 0,
      tracking: trackingResults.length > 0 ? trackingResults : [{
        order_number: normalizedOrderNumber,
        email: normalizedEmail,
        status: 'processing',
        last_event: 'Your order is being prepared for shipment.',
        events: [],
      }],
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[track-lookup] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

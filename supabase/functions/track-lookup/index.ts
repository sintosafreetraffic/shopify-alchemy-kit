/**
 * Track Lookup Edge Function
 * 
 * Looks up tracking info by order number + email.
 * Includes rate limiting (max 3 lookups per hour per IP).
 * If not found locally, registers with 17TRACK API.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRACK17_API_URL = 'https://api.17track.net/track/v2.4';
const RATE_LIMIT_MAX_REQUESTS = 5; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check rate limit
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    
    const { data: rateData } = await supabase
      .from('tracking_requests')
      .select('request_count, last_request_at')
      .eq('ip_hash', ipHash)
      .eq('tracking_lookup_key', lookupKey)
      .gte('last_request_at', windowStart)
      .single();

    if (rateData && rateData.request_count >= RATE_LIMIT_MAX_REQUESTS) {
      console.log('[track-lookup] Rate limit exceeded for IP hash:', ipHash);
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many tracking requests. Please try again later.',
      }), {
        status: 429,
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

    // Check if we have existing tracking data
    const { data: existingTracking, error: lookupError } = await supabase
      .from('order_tracking')
      .select('*')
      .eq('order_number', normalizedOrderNumber)
      .eq('email', normalizedEmail);

    if (lookupError) {
      console.error('[track-lookup] Database error:', lookupError);
      throw lookupError;
    }

    if (existingTracking && existingTracking.length > 0) {
      console.log('[track-lookup] Found existing tracking data');
      
      // Fetch event history for each tracking number
      const trackingWithEvents = await Promise.all(
        existingTracking.map(async (tracking) => {
          if (!tracking.tracking_number) return { ...tracking, events: [] };
          
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

    // No existing tracking - try to get from Shopify
    // Prefer SHOPIFY_ADMIN_API_TOKEN, fall back to SHOPIFY_ACCESS_TOKEN
    const shopifyToken = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN') || Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    // Use the actual Shopify store domain
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

    // Shopify order names are prefixed with '#', so search with and without
    // E.g., order "1006" is stored as "#1006" in Shopify
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
    
    // Find order matching email
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

    // Process fulfillments and register with 17TRACK
    const track17ApiKey = Deno.env.get('TRACK17_API_KEY');
    const trackingResults = [];

    for (const fulfillment of fulfillments) {
      if (!fulfillment.tracking_number) continue;

      // Insert into our database
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
      } else {
        trackingResults.push({ ...inserted, events: [] });
      }

      // Register with 17TRACK if we have API key
      if (track17ApiKey) {
        try {
          const registerResponse = await fetch(`${TRACK17_API_URL}/register`, {
            method: 'POST',
            headers: {
              '17token': track17ApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([{
              number: fulfillment.tracking_number,
              auto_detection: true,
              param: {
                order: normalizedOrderNumber,
              },
            }]),
          });

          const registerData = await registerResponse.json();
          console.log('[track-lookup] 17TRACK register response:', registerData);
        } catch (registerError) {
          console.error('[track-lookup] 17TRACK register error:', registerError);
          // Continue - we still have the Shopify data
        }
      }
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

/**
 * Track Lookup Edge Function
 * 
 * Looks up tracking info by order number + email.
 * If not found locally, registers with 17TRACK API.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRACK17_API_URL = 'https://api.17track.net/track/v2.4';

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

    console.log('[track-lookup] Looking up order:', normalizedOrderNumber, 'email:', normalizedEmail);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
      return new Response(JSON.stringify({
        success: true,
        found: true,
        tracking: existingTracking,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No existing tracking - try to get from Shopify
    const shopifyToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    const shopifyDomain = 'rise-by-night.myshopify.com'; // Hardcoded for now
    
    if (!shopifyToken) {
      console.log('[track-lookup] No Shopify token, cannot look up order');
      return new Response(JSON.stringify({
        success: true,
        found: false,
        message: 'Order not found. Please check your order number and email address.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search Shopify for the order
    const shopifySearchUrl = `https://${shopifyDomain}/admin/api/2024-01/orders.json?name=${encodeURIComponent(normalizedOrderNumber)}&status=any`;
    
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
        trackingResults.push(inserted);
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

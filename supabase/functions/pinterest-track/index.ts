/**
 * Pinterest Track Edge Function
 * 
 * Proxy that forwards purchase events to the external Render tracking server.
 * This is the single source of truth for Pinterest CAPI delivery.
 * 
 * HARDENED:
 * - Strict payload validation
 * - Never throws unhandled errors
 * - Detailed logging
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseEvent {
  order_id: string;
  event_type?: string;
  value: number;
  currency?: string;
  products?: Array<{
    id: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
  email?: string;
  phone?: string;
  pinterest_click_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
}

// Validate payload shape
function validatePayload(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }
  
  if (!data.order_id || typeof data.order_id !== 'string') {
    return { valid: false, error: 'order_id is required and must be a string' };
  }
  
  if (data.value === undefined || data.value === null) {
    return { valid: false, error: 'value is required' };
  }
  
  const value = parseFloat(data.value);
  if (isNaN(value) || value < 0) {
    return { valid: false, error: 'value must be a valid non-negative number' };
  }
  
  // Validate products array if present
  if (data.products !== undefined) {
    if (!Array.isArray(data.products)) {
      return { valid: false, error: 'products must be an array' };
    }
    for (const product of data.products) {
      if (!product.id) {
        return { valid: false, error: 'Each product must have an id' };
      }
    }
  }
  
  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[pinterest-track] Method not allowed:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const trackingServerUrl = Deno.env.get('TRACKING_SERVER_URL');
    if (!trackingServerUrl) {
      console.error('[pinterest-track] TRACKING_SERVER_URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Tracking server not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    let orderData: any;
    try {
      orderData = await req.json();
    } catch (parseError) {
      console.error('[pinterest-track] Invalid JSON in request body');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[pinterest-track] Received order data:', {
      order_id: orderData.order_id,
      value: orderData.value,
      currency: orderData.currency,
      products_count: orderData.products?.length || 0,
      has_email: !!orderData.email,
      has_pinterest_click_id: !!orderData.pinterest_click_id,
      has_utm_source: !!orderData.utm_source,
    });

    // Validate payload shape
    const validation = validatePayload(orderData);
    if (!validation.valid) {
      console.log('[pinterest-track] Validation failed:', validation.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build payload for tracking server
    const payload: PurchaseEvent = {
      order_id: String(orderData.order_id),
      event_type: orderData.event_type || 'purchase',
      value: parseFloat(orderData.value.toString()),
      currency: orderData.currency || 'USD',
      products: orderData.products || [],
      email: orderData.email,
      phone: orderData.phone,
      pinterest_click_id: orderData.pinterest_click_id,
      utm_source: orderData.utm_source,
      utm_medium: orderData.utm_medium,
      utm_campaign: orderData.utm_campaign,
      utm_content: orderData.utm_content,
      utm_term: orderData.utm_term,
      referrer: orderData.referrer,
      landing_page: orderData.landing_page,
    };

    console.log('[pinterest-track] Forwarding to tracking server:', trackingServerUrl);

    // Forward to tracking server with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const trackingResponse = await fetch(`${trackingServerUrl}/track/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let trackingResult: any;
      try {
        trackingResult = await trackingResponse.json();
      } catch {
        trackingResult = { message: 'Non-JSON response from tracking server' };
      }

      console.log('[pinterest-track] Tracking server response:', {
        status: trackingResponse.status,
        success: trackingResult.success,
      });

      // Return response
      if (trackingResponse.ok && trackingResult.success) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Purchase tracked successfully',
            tracking_result: trackingResult,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        console.error('[pinterest-track] Tracking server error:', trackingResult);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Tracking server error',
            details: trackingResult,
          }),
          {
            status: trackingResponse.status >= 400 ? trackingResponse.status : 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('[pinterest-track] Request to tracking server timed out');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Tracking server timeout',
          }),
          {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      console.error('[pinterest-track] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to reach tracking server',
          details: fetchError.message,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('[pinterest-track] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

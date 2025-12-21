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

  try {
    const orderData: PurchaseEvent = await req.json();
    console.log('[pinterest-track] Received order data:', {
      order_id: orderData.order_id,
      value: orderData.value,
      currency: orderData.currency,
      products_count: orderData.products?.length || 0,
      has_email: !!orderData.email,
      has_pinterest_click_id: !!orderData.pinterest_click_id,
    });

    // Validate required fields
    if (!orderData.order_id || orderData.value === undefined) {
      console.log('[pinterest-track] Missing required fields');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: order_id and value are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build payload for tracking server
    const payload: PurchaseEvent = {
      order_id: orderData.order_id,
      event_type: orderData.event_type || 'purchase',
      value: parseFloat(orderData.value.toString()),
      currency: orderData.currency || 'EUR',
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

    // Forward to tracking server
    const trackingResponse = await fetch(`${trackingServerUrl}/track/client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const trackingResult = await trackingResponse.json();
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
          status: trackingResponse.status || 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('[pinterest-track] Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

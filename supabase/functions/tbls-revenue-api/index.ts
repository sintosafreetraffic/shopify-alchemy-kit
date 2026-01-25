/**
 * TBLS Revenue API Edge Function
 * 
 * Provides revenue attribution data to TBLS (The Big Landing Store) for analytics.
 * Allows TBLS to query which pages/pins generate the most revenue.
 * 
 * Endpoints:
 * - GET /tbls-revenue-api?page_id=xxx - Get revenue for specific page
 * - GET /tbls-revenue-api?pin_id=xxx - Get revenue for specific pin
 * - GET /tbls-revenue-api?summary=true - Get aggregated revenue by page/pin
 * - GET /tbls-revenue-api?start_date=xxx&end_date=xxx - Filter by date range
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tbls-api-key',
};

// Verify TBLS API key (shared secret between RBN and TBLS)
function verifyTblsApiKey(req: Request): boolean {
  const apiKey = req.headers.get('x-tbls-api-key');
  const expectedKey = Deno.env.get('TBLS_WEBHOOK_SECRET');
  
  // If no secret configured, reject all requests
  if (!expectedKey) {
    console.warn('[TBLS-API] TBLS_WEBHOOK_SECRET not configured');
    return false;
  }
  
  return apiKey === expectedKey;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key
    if (!verifyTblsApiKey(req)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pageId = url.searchParams.get('page_id');
    const pinId = url.searchParams.get('pin_id');
    const template = url.searchParams.get('template');
    const category = url.searchParams.get('category');
    const summary = url.searchParams.get('summary') === 'true';
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query
    let query = supabase
      .from('tbls_purchase_attribution')
      .select('*');

    // Apply filters
    if (pageId) {
      query = query.eq('tbls_page_id', pageId);
    }
    if (pinId) {
      query = query.eq('tbls_pin_id', pinId);
    }
    if (template) {
      query = query.eq('tbls_template', template);
    }
    if (category) {
      query = query.eq('tbls_category', category);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data: attributions, error } = await query;

    if (error) {
      console.error('[TBLS-API] Query error:', error.message);
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If summary requested, aggregate the data
    if (summary) {
      const summaryByPage: Record<string, { 
        page_id: string; 
        orders: number; 
        total_revenue: number; 
        avg_order_value: number;
        currencies: Record<string, number>;
      }> = {};

      const summaryByPin: Record<string, { 
        pin_id: string; 
        orders: number; 
        total_revenue: number; 
        avg_order_value: number;
      }> = {};

      const summaryByTemplate: Record<string, { 
        template: string; 
        orders: number; 
        total_revenue: number; 
      }> = {};

      for (const attr of attributions || []) {
        // By page
        if (attr.tbls_page_id) {
          if (!summaryByPage[attr.tbls_page_id]) {
            summaryByPage[attr.tbls_page_id] = {
              page_id: attr.tbls_page_id,
              orders: 0,
              total_revenue: 0,
              avg_order_value: 0,
              currencies: {},
            };
          }
          summaryByPage[attr.tbls_page_id].orders++;
          summaryByPage[attr.tbls_page_id].total_revenue += parseFloat(attr.order_value);
          summaryByPage[attr.tbls_page_id].currencies[attr.currency] = 
            (summaryByPage[attr.tbls_page_id].currencies[attr.currency] || 0) + parseFloat(attr.order_value);
        }

        // By pin
        if (attr.tbls_pin_id) {
          if (!summaryByPin[attr.tbls_pin_id]) {
            summaryByPin[attr.tbls_pin_id] = {
              pin_id: attr.tbls_pin_id,
              orders: 0,
              total_revenue: 0,
              avg_order_value: 0,
            };
          }
          summaryByPin[attr.tbls_pin_id].orders++;
          summaryByPin[attr.tbls_pin_id].total_revenue += parseFloat(attr.order_value);
        }

        // By template
        if (attr.tbls_template) {
          if (!summaryByTemplate[attr.tbls_template]) {
            summaryByTemplate[attr.tbls_template] = {
              template: attr.tbls_template,
              orders: 0,
              total_revenue: 0,
            };
          }
          summaryByTemplate[attr.tbls_template].orders++;
          summaryByTemplate[attr.tbls_template].total_revenue += parseFloat(attr.order_value);
        }
      }

      // Calculate averages
      for (const page of Object.values(summaryByPage)) {
        page.avg_order_value = page.orders > 0 ? page.total_revenue / page.orders : 0;
      }
      for (const pin of Object.values(summaryByPin)) {
        pin.avg_order_value = pin.orders > 0 ? pin.total_revenue / pin.orders : 0;
      }

      // Sort by revenue descending
      const sortedPages = Object.values(summaryByPage).sort((a, b) => b.total_revenue - a.total_revenue);
      const sortedPins = Object.values(summaryByPin).sort((a, b) => b.total_revenue - a.total_revenue);
      const sortedTemplates = Object.values(summaryByTemplate).sort((a, b) => b.total_revenue - a.total_revenue);

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            total_orders: attributions?.length || 0,
            total_revenue: attributions?.reduce((sum, a) => sum + parseFloat(a.order_value), 0) || 0,
            by_page: sortedPages,
            by_pin: sortedPins,
            by_template: sortedTemplates,
          },
          date_range: {
            start: startDate || 'all',
            end: endDate || 'all',
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return raw attribution data (excluding email hashes for privacy)
    const sanitizedData = (attributions || []).map(attr => ({
      order_id: attr.order_id,
      order_number: attr.order_number,
      order_value: attr.order_value,
      currency: attr.currency,
      tbls_page_id: attr.tbls_page_id,
      tbls_pin_id: attr.tbls_pin_id,
      tbls_template: attr.tbls_template,
      tbls_subdomain: attr.tbls_subdomain,
      tbls_category: attr.tbls_category,
      landing_page: attr.landing_page,
      utm_source: attr.utm_source,
      utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign,
      created_at: attr.created_at,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        count: sanitizedData.length,
        data: sanitizedData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[TBLS-API] Error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

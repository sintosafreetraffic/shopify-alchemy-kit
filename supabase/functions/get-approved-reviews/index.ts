/**
 * Get Approved Reviews Edge Function
 * 
 * Public API for fetching approved product reviews.
 * Used by TBLS landing pages to display social proof.
 * 
 * Endpoints:
 * - GET /get-approved-reviews?product_handle=xxx - Get reviews for specific product
 * - GET /get-approved-reviews?limit=10 - Limit number of reviews
 * - GET /get-approved-reviews?min_rating=4 - Filter by minimum rating
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const productHandle = url.searchParams.get('product_handle');
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const minRating = parseInt(url.searchParams.get('min_rating') || '1', 10);
    const featured = url.searchParams.get('featured') === 'true';

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Build query - only approved reviews
    let query = supabase
      .from('product_reviews')
      .select('id, customer_name, rating, title, body, variant_title, is_verified_purchase, helpful_count, created_at, admin_reply')
      .eq('status', 'approved')
      .gte('rating', minRating)
      .order('helpful_count', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by product if specified
    if (productHandle) {
      query = query.eq('product_handle', productHandle);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('[Reviews] Query error:', error.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reviews' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate aggregate stats
    const stats = {
      total_count: reviews?.length || 0,
      average_rating: 0,
      rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
    };

    if (reviews && reviews.length > 0) {
      let totalRating = 0;
      for (const review of reviews) {
        totalRating += review.rating;
        stats.rating_distribution[review.rating] = (stats.rating_distribution[review.rating] || 0) + 1;
      }
      stats.average_rating = Math.round((totalRating / reviews.length) * 10) / 10;
    }

    // Format reviews for display
    const formattedReviews = (reviews || []).map(review => ({
      id: review.id,
      author: review.customer_name,
      rating: review.rating,
      title: review.title,
      body: review.body,
      variant: review.variant_title,
      verified: review.is_verified_purchase,
      helpful_count: review.helpful_count || 0,
      date: review.created_at,
      reply: review.admin_reply,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        product_handle: productHandle || 'all',
        stats,
        reviews: formattedReviews,
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          // Cache for 5 minutes (reviews don't change often)
          'Cache-Control': 'public, max-age=300',
        } 
      }
    );

  } catch (err: any) {
    console.error('[Reviews] Error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

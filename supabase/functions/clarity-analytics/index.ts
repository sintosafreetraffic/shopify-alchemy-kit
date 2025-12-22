import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClarityMetrics {
  totalSessions: number;
  totalPageviews: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ url: string; views: number }>;
  error?: string;
  rawResponse?: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clarityToken = Deno.env.get('CLARITY_API_TOKEN');
    
    if (!clarityToken) {
      console.error('CLARITY_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Clarity API token not configured',
          metrics: null,
          mockData: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Parse request body for numOfDays (1, 2, or 3)
    let numOfDays = 3; // Default to 3 days (72 hours)
    
    try {
      const body = await req.json();
      if (body.numOfDays && [1, 2, 3].includes(body.numOfDays)) {
        numOfDays = body.numOfDays;
      }
    } catch {
      // Use default
    }

    console.log(`Fetching Clarity data for last ${numOfDays} days`);

    // Clarity Data Export API - correct endpoint per documentation
    // https://www.clarity.ms/export-data/api/v1/project-live-insights
    const clarityApiUrl = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${numOfDays}&dimension1=URL`;
    
    console.log(`Calling Clarity API: ${clarityApiUrl}`);

    const response = await fetch(clarityApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${clarityToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Clarity API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Clarity API error: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({
          error: `Clarity API returned ${response.status}`,
          errorDetails: errorText,
          metrics: null,
          mockData: true,
          note: 'Failed to fetch Clarity data. Check API token validity.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const data = await response.json();
    console.log(`Clarity API raw response:`, JSON.stringify(data).substring(0, 500));

    // Process Clarity response based on the documented format
    const metrics = processClarityResponse(data);

    return new Response(
      JSON.stringify({
        metrics,
        mockData: false,
        numOfDays,
        rawResponse: data // Include raw response for debugging
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error in clarity-analytics:', errorMessage);
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        metrics: null,
        mockData: true,
        note: 'Error fetching Clarity data.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});

function processClarityResponse(data: any[]): ClarityMetrics {
  // The API returns an array of metric objects
  // Each has metricName and information array
  
  let totalSessions = 0;
  let uniqueUsers = 0;
  let totalPageviews = 0;
  let avgSessionDuration = 0;
  let bounceRate = 0;
  const topPages: Array<{ url: string; views: number }> = [];

  if (!Array.isArray(data)) {
    console.log('Unexpected response format - not an array');
    return { totalSessions, totalPageviews, uniqueUsers, avgSessionDuration, bounceRate, topPages };
  }

  for (const metric of data) {
    const metricName = metric.metricName;
    const info = metric.information || [];

    if (metricName === 'Traffic') {
      // Traffic metric contains session counts
      for (const item of info) {
        totalSessions += parseInt(item.totalSessionCount || '0', 10);
        uniqueUsers += parseInt(item.distantUserCount || '0', 10);
        // Calculate pageviews from PagesPerSessionPercentage * sessions
        const pagesPerSession = parseFloat(item.PagesPerSessionPercentage || '1');
        const sessionCount = parseInt(item.totalSessionCount || '0', 10);
        totalPageviews += Math.round(sessionCount * pagesPerSession);
      }
    }

    if (metricName === 'Scroll Depth' || metricName === 'Engagement Time') {
      // Could extract engagement metrics here
    }

    if (metricName === 'Popular Pages') {
      // Extract top pages
      for (const item of info) {
        if (item.URL) {
          topPages.push({
            url: item.URL,
            views: parseInt(item.totalSessionCount || item.count || '0', 10)
          });
        }
      }
    }
  }

  // Sort top pages by views
  topPages.sort((a, b) => b.views - a.views);

  console.log(`Processed metrics: sessions=${totalSessions}, users=${uniqueUsers}, pageviews=${totalPageviews}`);

  return {
    totalSessions,
    totalPageviews,
    uniqueUsers,
    avgSessionDuration,
    bounceRate,
    topPages: topPages.slice(0, 10)
  };
}

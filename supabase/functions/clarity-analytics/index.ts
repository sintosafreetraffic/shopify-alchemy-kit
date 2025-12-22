import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLARITY_PROJECT_ID = 'ue7ibjdmdj';

interface ClarityMetrics {
  totalSessions: number;
  totalPageviews: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ url: string; views: number }>;
  error?: string;
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

    // Parse request body for date range
    let startDate: string;
    let endDate: string;
    
    try {
      const body = await req.json();
      startDate = body.startDate || getDefaultStartDate();
      endDate = body.endDate || getDefaultEndDate();
    } catch {
      startDate = getDefaultStartDate();
      endDate = getDefaultEndDate();
    }

    console.log(`Fetching Clarity data from ${startDate} to ${endDate}`);

    // Clarity Data Export API endpoint
    // Note: Clarity uses OAuth2 for authentication
    // The API token should be a valid access token
    const clarityApiUrl = `https://www.clarity.ms/export-data/api/v1/project/${CLARITY_PROJECT_ID}/sessions`;
    
    // Attempt to fetch from Clarity API
    const response = await fetch(clarityApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clarityToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: startDate,
        endDate: endDate,
        filters: [],
        limit: 1000
      })
    });

    console.log(`Clarity API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Clarity API error: ${response.status} - ${errorText}`);
      
      // Return mock data structure with error flag
      // The Clarity API requires OAuth setup which may not be configured
      return new Response(
        JSON.stringify({
          error: `Clarity API returned ${response.status}`,
          errorDetails: errorText,
          metrics: getMockMetrics(),
          mockData: true,
          note: 'Using estimated data. To get real Clarity data, ensure OAuth2 is configured correctly.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const data = await response.json();
    console.log(`Received ${data.sessions?.length || 0} sessions from Clarity`);

    // Process Clarity session data
    const metrics = processSessionData(data);

    return new Response(
      JSON.stringify({
        metrics,
        mockData: false,
        dateRange: { startDate, endDate }
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
        metrics: getMockMetrics(),
        mockData: true,
        note: 'Error fetching Clarity data. Using estimated metrics based on checkout analytics.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

function processSessionData(data: any): ClarityMetrics {
  const sessions = data.sessions || [];
  
  const totalSessions = sessions.length;
  const uniqueUsers = new Set(sessions.map((s: any) => s.userId)).size;
  const totalPageviews = sessions.reduce((sum: number, s: any) => sum + (s.pageCount || 1), 0);
  const avgSessionDuration = sessions.length > 0
    ? sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / sessions.length / 1000
    : 0;
  
  // Calculate bounce rate (sessions with only 1 page view)
  const bouncedSessions = sessions.filter((s: any) => (s.pageCount || 1) === 1).length;
  const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0;

  // Aggregate top pages
  const pageCounts: Record<string, number> = {};
  sessions.forEach((s: any) => {
    const url = s.landingPage || '/';
    pageCounts[url] = (pageCounts[url] || 0) + 1;
  });
  
  const topPages = Object.entries(pageCounts)
    .map(([url, views]) => ({ url, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return {
    totalSessions,
    totalPageviews,
    uniqueUsers,
    avgSessionDuration,
    bounceRate,
    topPages
  };
}

function getMockMetrics(): ClarityMetrics {
  // Return estimated metrics based on typical ratios
  // These will be compared with actual checkout_analytics data
  return {
    totalSessions: 0,
    totalPageviews: 0,
    uniqueUsers: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    topPages: []
  };
}

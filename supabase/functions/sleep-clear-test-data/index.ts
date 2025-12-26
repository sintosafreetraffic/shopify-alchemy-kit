import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Sleep Clear Test Data v1.0
// POST /sleep-clear-test-data
// 
// Safely deletes test data (is_test = true) from sleep tables.
// Guards: JWT auth + ALLOW_TEST_SYNC env + optional admin for "all" scope
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ClearScope = 'me' | 'all';

interface ClearRequest {
  scope: ClearScope;
}

interface ClearResponse {
  status: 'success' | 'error';
  message: string;
  deleted?: {
    sleep_nights: number;
    sleep_raw_events: number;
  };
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'sleep-clear-test-data',
    message,
    ...data,
  };
  
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

async function checkAdminRole(supabaseAdmin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();
  
  return !error && !!data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Method not allowed' } as ClearResponse),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const allowTestSync = Deno.env.get('ALLOW_TEST_SYNC') === 'true';
    
    // Guard: ALLOW_TEST_SYNC must be enabled
    if (!allowTestSync) {
      log('warn', 'Clear test data attempted but test mode disabled');
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'Test mode is not enabled. Cannot clear test data.' 
        } as ClearResponse),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    // Authenticate via JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Authentication required' } as ClearResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Invalid authentication token' } as ClearResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = user.id;
    
    // Parse request body
    let body: ClearRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Invalid JSON body' } as ClearResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const scope = body.scope || 'me';
    
    if (scope !== 'me' && scope !== 'all') {
      return new Response(
        JSON.stringify({ status: 'error', message: 'scope must be "me" or "all"' } as ClearResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Guard: "all" scope requires admin role
    if (scope === 'all') {
      const isAdmin = await checkAdminRole(supabaseAdmin, userId);
      if (!isAdmin) {
        log('warn', 'Non-admin attempted to clear all test data', { userId });
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Admin role required to clear all test data' 
          } as ClearResponse),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    log('info', 'Clearing test data', { userId, scope });
    
    // Delete sleep_nights first (FK: sleep_nights.raw_event_id -> sleep_raw_events.id)
    let nightsQuery = supabaseAdmin
      .from('sleep_nights')
      .delete()
      .eq('is_test', true);
    
    if (scope === 'me') {
      nightsQuery = nightsQuery.eq('user_id', userId);
    }
    
    const { data: deletedNights, error: nightsError } = await nightsQuery.select('id');
    
    if (nightsError) {
      log('error', 'Failed to delete sleep_nights', { error: nightsError.message });
      throw new Error(`Failed to delete sleep nights: ${nightsError.message}`);
    }
    
    const nightsCount = deletedNights?.length || 0;
    
    // Delete sleep_raw_events
    let rawEventsQuery = supabaseAdmin
      .from('sleep_raw_events')
      .delete()
      .eq('is_test', true);
    
    if (scope === 'me') {
      rawEventsQuery = rawEventsQuery.eq('user_id', userId);
    }
    
    const { data: deletedRawEvents, error: rawEventsError } = await rawEventsQuery.select('id');
    
    if (rawEventsError) {
      log('error', 'Failed to delete sleep_raw_events', { error: rawEventsError.message });
      throw new Error(`Failed to delete raw events: ${rawEventsError.message}`);
    }
    
    const rawEventsCount = deletedRawEvents?.length || 0;
    
    const duration = Date.now() - startTime;
    log('info', 'Test data cleared successfully', { 
      userId, 
      scope, 
      nightsCount, 
      rawEventsCount, 
      duration 
    });
    
    return new Response(
      JSON.stringify({
        status: 'success',
        message: `Cleared ${nightsCount} test nights and ${rawEventsCount} raw events`,
        deleted: {
          sleep_nights: nightsCount,
          sleep_raw_events: rawEventsCount,
        },
      } as ClearResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', 'Clear test data failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
    
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Internal server error' 
      } as ClearResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

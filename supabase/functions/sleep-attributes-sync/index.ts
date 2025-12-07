/**
 * Sleep Attributes Sync Edge Function
 * 
 * Handles both authenticated (JWT) and service-to-service (internal) calls.
 * 
 * Endpoints:
 * - POST /sync - Generate and store attributes (requires auth OR internal token)
 * - GET / - Retrieve current attributes (requires auth)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SleepAttributes,
  SCHEMA_VERSION,
} from "../_shared/types.ts";
import {
  generateSleepAttributes,
  buildSleepSyncEvent,
  syncAndStoreAttributes,
  sendKlaviyoEvent,
} from "../_shared/sleep-sync.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const KLAVIYO_PRIVATE_API_KEY = Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
    const CRON_SECRET = Deno.env.get('CRON_SECRET');

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Determine authentication method
    let email: string | null = null;
    let isInternalCall = false;

    // Check for internal service token (for service-to-service calls)
    const internalToken = req.headers.get('x-internal-token');
    if (internalToken && CRON_SECRET && internalToken === CRON_SECRET) {
      isInternalCall = true;
      // For internal calls, email comes from request body
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        email = body.email;
      }
    }

    // If not internal, require JWT auth
    if (!isInternalCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authorization header required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user?.email) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      email = user.email;
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // POST /sync - Generate and store attributes
    if (req.method === 'POST' && (path === 'sync' || path === 'sleep-attributes-sync')) {
      let source = "manual";
      if (!isInternalCall) {
        try {
          const body = await req.json().catch(() => ({}));
          source = body.source || "manual";
        } catch {
          // Body already consumed for internal call
        }
      } else {
        const body = await req.clone().json().catch(() => ({}));
        source = body.source || "internal";
      }

      console.log(`[Sleep Sync] Generating attributes for: ${email}, source: ${source}`);
      
      const attributes = await generateSleepAttributes(supabase, email);
      const event = buildSleepSyncEvent(attributes, source);

      // Store in state table
      const { error: upsertError } = await supabase
        .from('sleep_attributes_state')
        .upsert({
          email,
          data: attributes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      if (upsertError) {
        console.error('[Sleep Sync] Error storing state:', upsertError);
        throw upsertError;
      }

      // Store in history table
      await supabase
        .from('sleep_attributes_history')
        .insert({ email, data: attributes });

      // Send to Klaviyo
      if (KLAVIYO_PRIVATE_API_KEY) {
        try {
          await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, event.eventName, event.payload);
          console.log('[Sleep Sync] Klaviyo event sent successfully');
        } catch (klaviyoError) {
          console.error('[Sleep Sync] Klaviyo error:', klaviyoError);
          // Non-blocking
        }
      }

      console.log(`[Sleep Sync] Attributes synced successfully for: ${email}`);

      return new Response(JSON.stringify({
        success: true,
        email,
        attributes,
        event,
        schema_version: SCHEMA_VERSION,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (req.method === 'GET') {
      // GET - Retrieve current attributes
      const { data, error } = await supabase
        .from('sleep_attributes_state')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(JSON.stringify({ 
          email, 
          attributes: null,
          message: 'No attributes found. Call POST /sync first.',
          schema_version: SCHEMA_VERSION,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        email,
        attributes: data.data,
        updated_at: data.updated_at,
        schema_version: SCHEMA_VERSION,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('[Sleep Sync] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

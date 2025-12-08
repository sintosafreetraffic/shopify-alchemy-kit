/**
 * Sleep Attributes Sync Edge Function
 * 
 * Handles both authenticated (JWT) and service-to-service (internal) calls.
 * Uses centralized env/auth/sleep-sync helpers.
 * 
 * Endpoints:
 * - POST /sync - Generate and store attributes (requires auth OR internal token)
 * - GET / - Retrieve current attributes (requires auth)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SCHEMA_VERSION, SleepSyncSource } from "../_shared/types.ts";
import {
  corsHeaders,
  requireEnvVar,
  getEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import {
  fullSleepSync,
} from "../_shared/sleep-sync.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use centralized env helpers
    const SUPABASE_URL = requireEnvVar('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = requireEnvVar('SUPABASE_ANON_KEY');
    const KLAVIYO_PRIVATE_API_KEY = getEnvVar('KLAVIYO_PRIVATE_API_KEY');
    const CRON_SECRET = getEnvVar('CRON_SECRET');

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Determine authentication method
    let email: string | null = null;
    let isInternalCall = false;
    let source: SleepSyncSource = "manual";

    // Clone request to read body potentially multiple times
    const bodyText = await req.text();
    let requestBody: { email?: string; source?: SleepSyncSource } = {};
    try {
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      // Ignore parse errors
    }

    // Check for internal service token (for service-to-service calls)
    const internalToken = req.headers.get('x-internal-token');
    if (internalToken && CRON_SECRET && internalToken === CRON_SECRET) {
      isInternalCall = true;
      email = requestBody.email || null;
      source = requestBody.source || "internal";
    }

    // If not internal, require JWT auth
    if (!isInternalCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return createErrorResponse('Authorization header required', 401);
      }

      const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user?.email) {
        return createErrorResponse('Invalid or expired token', 401);
      }
      email = user.email;
      
      // Get source from parsed body
      if (req.method === 'POST' && requestBody.source) {
        source = requestBody.source;
      }
    }

    if (!email) {
      return createErrorResponse('Email is required', 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // POST /sync - Generate and store attributes using fullSleepSync
    if (req.method === 'POST' && (path === 'sync' || path === 'sleep-attributes-sync')) {
      console.log(`[Sleep Sync] Full sync triggered for: ${email}, source: ${source}`);
      
      // Use fullSleepSync for complete 3-layer sync + Klaviyo
      const { attributes, event } = await fullSleepSync(
        supabase,
        email,
        source,
        KLAVIYO_PRIVATE_API_KEY || undefined
      );

      console.log(`[Sleep Sync] Full sync completed for: ${email}`);
      return createSuccessResponse({
        success: true,
        email,
        attributes,
        event,
        schema_version: SCHEMA_VERSION,
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
        return createSuccessResponse({ 
          email, 
          attributes: null,
          message: 'No attributes found. Call POST /sync first.',
          schema_version: SCHEMA_VERSION,
        });
      }

      return createSuccessResponse({
        email,
        attributes: data.data,
        updated_at: data.updated_at,
        schema_version: SCHEMA_VERSION,
      });

    } else {
      return createErrorResponse('Method not allowed', 405);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sleep Sync] Error:', errorMessage);
    return createErrorResponse(errorMessage, 500);
  }
});

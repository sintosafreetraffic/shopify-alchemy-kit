/**
 * track-context Edge Function
 * 
 * Captures first-party context (IP/UA + attribution) for Pinterest CAPI enrichment.
 * Called from frontend on page load / route changes with attribution params.
 * 
 * CRITICAL RULES:
 * - FIRST-TOUCH for attribution (UTMs, landing_page, referrer) - never overwrite non-null
 * - LAST-TOUCH for epik - always overwrite with latest
 * - Refreshable for IP/UA - always update when consent granted
 * - Consent-gated: only store IP/UA when consent_status === 'granted'
 * - NEVER log raw IP or UA
 * - ALWAYS return 200 success (silent fail)
 * - PII HASHING: email_hash and phone_hash are SHA-256 hashed at ingestion (Phase Day 1-2)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// PII HASHING (Day 1-2: Compliance Risk Elimination)
// ============================================================================

/**
 * SHA-256 hash for PII fields
 * CRITICAL: Raw PII must not persist beyond ingestion
 */
async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize phone to E.164 format before hashing
 */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

// CORS configuration - allow production + preview origins
const getAllowedOrigin = (origin: string | null): string => {
  if (!origin) return 'https://risebynight.com';
  
  const allowedOrigins = [
    'https://risebynight.com',
    'https://www.risebynight.com',
  ];
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) return origin;
  
  // Check lovable.app preview domains
  if (origin.endsWith('.lovable.app')) return origin;
  
  // Default to production
  return 'https://risebynight.com';
};

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(origin),
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Max-Age': '86400',
});

// Extract client IP from headers with priority
function extractClientIp(headers: Headers): string | null {
  // Priority 1: x-forwarded-for (first IP, trimmed)
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  
  // Priority 2: cf-connecting-ip (Cloudflare)
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  
  // Priority 3: x-real-ip
  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  
  return null;
}

interface TrackContextPayload {
  context_id: string;
  consent_status: 'granted' | 'denied';
  epik?: string;
  landing_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  // PII fields - will be hashed at ingestion, never stored raw
  email?: string;
  phone?: string;
  // Meta (Facebook) cookies for server-side CAPI enrichment
  meta_fbc?: string;
  meta_fbp?: string;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Always return success - never fail the caller
  const successResponse = () => new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
  
  try {
    // Parse payload
    const payload: TrackContextPayload = await req.json();
    
    // Validate context_id
    if (!payload.context_id || typeof payload.context_id !== 'string' || payload.context_id.length < 10) {
      console.log('[track-context] Invalid context_id, skipping');
      return successResponse();
    }
    
    // Validate consent_status
    if (!['granted', 'denied'].includes(payload.consent_status)) {
      console.log('[track-context] Invalid consent_status, skipping');
      return successResponse();
    }
    
    // Extract IP and UA from request headers
    const clientIp = extractClientIp(req.headers);
    const clientUa = req.headers.get('user-agent');
    
    // Log only booleans - NEVER raw IP/UA
    console.log('[track-context] Processing:', {
      context_id: payload.context_id,
      consent_status: payload.consent_status,
      has_epik: !!payload.epik,
      has_landing_page: !!payload.landing_page,
      has_utm_source: !!payload.utm_source,
      has_ip: !!clientIp,
      has_ua: !!clientUa,
      has_meta_fbc: !!payload.meta_fbc,
      has_meta_fbp: !!payload.meta_fbp,
    });
    
    // Get service role client for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[track-context] Missing Supabase env vars');
      return successResponse();
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Fetch existing row to implement first-touch / last-touch logic
    const { data: existing } = await supabase
      .from('pinterest_context')
      .select('*')
      .eq('context_id', payload.context_id)
      .maybeSingle();
    
    // Build upsert data with proper merge logic
    const upsertData: Record<string, any> = {
      context_id: payload.context_id,
      consent_status: payload.consent_status,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // FIRST-TOUCH fields: only set if existing value is NULL
    if (!existing?.landing_page && payload.landing_page) {
      upsertData.landing_page = payload.landing_page;
    }
    if (!existing?.utm_source && payload.utm_source) {
      upsertData.utm_source = payload.utm_source;
    }
    if (!existing?.utm_medium && payload.utm_medium) {
      upsertData.utm_medium = payload.utm_medium;
    }
    if (!existing?.utm_campaign && payload.utm_campaign) {
      upsertData.utm_campaign = payload.utm_campaign;
    }
    if (!existing?.utm_content && payload.utm_content) {
      upsertData.utm_content = payload.utm_content;
    }
    if (!existing?.utm_term && payload.utm_term) {
      upsertData.utm_term = payload.utm_term;
    }
    if (!existing?.referrer && payload.referrer) {
      upsertData.referrer = payload.referrer;
    }
    
    // LAST-TOUCH epik: overwrite if provided and different
    if (payload.epik) {
      upsertData.epik = payload.epik;
    }
    
    // LAST-TOUCH Meta cookies: overwrite if provided (latest click takes precedence)
    if (payload.meta_fbc) {
      upsertData.meta_fbc = payload.meta_fbc;
    }
    if (payload.meta_fbp) {
      upsertData.meta_fbp = payload.meta_fbp;
    }
    
    // ========================================================================
    // PII HASHING (Day 1-2: Compliance Risk Elimination)
    // Hash email and phone at ingestion - NEVER store raw PII
    // ========================================================================
    if (payload.email) {
      upsertData.email_hash = await sha256Hash(payload.email);
      console.log('[track-context] Email hashed for context:', payload.context_id);
    }
    
    if (payload.phone) {
      const normalizedPhone = normalizePhone(payload.phone);
      if (normalizedPhone) {
        upsertData.phone_hash = await sha256Hash(normalizedPhone);
        console.log('[track-context] Phone hashed for context:', payload.context_id);
      }
    }
    
    // MATCH SIGNALS: consent-gated
    if (payload.consent_status === 'granted') {
      // Store latest IP/UA when consent granted
      if (clientIp) upsertData.client_ip_address = clientIp;
      if (clientUa) upsertData.client_user_agent = clientUa;
    } else {
      // Clear IP/UA when consent denied
      upsertData.client_ip_address = null;
      upsertData.client_user_agent = null;
    }
    
    // Upsert the row
    const { error } = await supabase
      .from('pinterest_context')
      .upsert(upsertData, {
        onConflict: 'context_id',
      });
    
    if (error) {
      console.error('[track-context] Upsert error:', error.message);
    } else {
      console.log('[track-context] ✅ Context saved:', payload.context_id);
    }
    
    return successResponse();
  } catch (err: any) {
    // Always return success - silent fail
    console.error('[track-context] Error (non-blocking):', err.message);
    return successResponse();
  }
});

/**
 * Klaviyo Profile Edge Function
 * 
 * Creates/updates Klaviyo profiles for WhatsApp settings and properties.
 * Uses centralized env/cors helpers.
 * 
 * PUBLIC ENDPOINT - Validates email from request body for quiz flow.
 * When authenticated, uses JWT email instead for security.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import {
  authenticateRequest,
} from "../_shared/auth.ts";

// Input validation schema - email required for unauthenticated calls
const profileSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  properties: z.record(z.unknown()).optional().default({}),
  phone_number: z.string().max(20, "Phone number too long").optional(),
  whatsapp_enabled: z.boolean().optional().default(false),
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use centralized env helpers
    const SUPABASE_URL = requireEnvVar('SUPABASE_URL');
    const SUPABASE_ANON_KEY = requireEnvVar('SUPABASE_ANON_KEY');
    const KLAVIYO_PRIVATE_API_KEY = requireEnvVar('KLAVIYO_PRIVATE_API_KEY');

    // Validate input first
    const rawBody = await req.json();
    const parseResult = profileSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("[Klaviyo] Validation error:", parseResult.error.errors);
      return createErrorResponse("Invalid input", 400);
    }

    const { email: bodyEmail, properties, phone_number, whatsapp_enabled } = parseResult.data;

    // ============================================================
    // AUTH BLOCK: Optional JWT authentication
    // If authenticated, use JWT email (more secure)
    // Otherwise, require email in request body (for quiz flow)
    // ============================================================
    let email: string;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const authResult = await authenticateRequest(authHeader, SUPABASE_URL, SUPABASE_ANON_KEY);
      if (authResult.user?.email) {
        email = authResult.user.email;
        console.log(`[Klaviyo] Using authenticated email: ${email}`);
      } else if (bodyEmail) {
        email = bodyEmail;
        console.log(`[Klaviyo] Auth failed, using body email: ${email}`);
      } else {
        return createErrorResponse('Email required', 400);
      }
    } else if (bodyEmail) {
      email = bodyEmail;
      console.log(`[Klaviyo] Using body email (unauthenticated): ${email}`);
    } else {
      return createErrorResponse('Email required', 400);
    }
    
    console.log(`[Klaviyo] Updating profile for ${email}, WhatsApp: ${whatsapp_enabled}`);

    // Find profile by email
    const searchResponse = await fetch(
      `https://a.klaviyo.com/api/profiles/?filter=equals(email,"${encodeURIComponent(email)}")`,
      {
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          'revision': '2024-02-15',
        },
      }
    );

    const searchData = await searchResponse.json();
    const profileId = searchData.data[0]?.id;

    // Build profile attributes
    const profileAttributes: Record<string, unknown> = {
      email,
      properties: {
        ...properties,
        whatsapp_enabled: whatsapp_enabled || false,
      },
    };

    // Add phone number if WhatsApp is enabled
    if (whatsapp_enabled && phone_number) {
      profileAttributes.phone_number = phone_number;
      (profileAttributes.properties as Record<string, unknown>).whatsapp_phone = phone_number;
      console.log(`[Klaviyo] Syncing WhatsApp phone: ${phone_number}`);
    }

    if (!profileId) {
      console.log('[Klaviyo] Profile not found, creating new one');
      // Create new profile
      const createResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-02-15',
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: profileAttributes,
          },
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[Klaviyo] Create profile error:', errorText);
      } else {
        console.log('[Klaviyo] Profile created successfully');
      }

      return createSuccessResponse({ success: true, created: true });
    }

    // Update existing profile
    const updateResponse = await fetch(`https://a.klaviyo.com/api/profiles/${profileId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          id: profileId,
          attributes: {
            phone_number: whatsapp_enabled && phone_number ? phone_number : undefined,
            properties: {
              ...properties,
              whatsapp_enabled: whatsapp_enabled || false,
              whatsapp_phone: whatsapp_enabled ? phone_number : null,
            },
          },
        },
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[Klaviyo] Update profile error:', errorText);
    }

    console.log('[Klaviyo] Profile updated successfully');
    return createSuccessResponse({ success: true });
  } catch (error: any) {
    console.error('[Klaviyo] Error in klaviyo-profile:', error);
    return createErrorResponse(error.message, 500);
  }
});
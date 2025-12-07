/**
 * Klaviyo Subscribe Edge Function
 * 
 * Handles email popup signups and triggers Sleep Sync.
 * Uses centralized env/cors helpers and syncAndStoreAttributes.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  corsHeaders,
  requireEnvVar,
  getEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";
import {
  syncAndStoreAttributes,
  sendKlaviyoEvent,
} from "../_shared/sleep-sync.ts";

// Input validation schema
const subscribeSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  listId: z.string().max(50, "List ID too long").optional(),
  source: z.string().max(50).optional().default("email_popup"),
});

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const rawBody = await req.json();
    const parseResult = subscribeSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("[Klaviyo] Validation error:", parseResult.error.errors);
      return createErrorResponse("Invalid input", 400);
    }
    
    const { email, listId, source } = parseResult.data;
    
    console.log("[Klaviyo] Subscribe request:", { email, listId, source });

    // Use centralized env helpers
    const KLAVIYO_PRIVATE_API_KEY = requireEnvVar("KLAVIYO_PRIVATE_API_KEY");
    const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    // Create or update profile in Klaviyo
    console.log("[Klaviyo] Creating profile for:", email);
    const profileResponse = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
        "Content-Type": "application/json",
        "revision": "2024-02-15",
      },
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: { 
            email,
            properties: {
              signup_source: source,
              signup_date: new Date().toISOString(),
            }
          },
        },
      }),
    });

    const profileData = await profileResponse.json();
    console.log("[Klaviyo] Profile response status:", profileResponse.status);

    // Get profile ID - handle both new creation and existing profile
    let profileId = profileData.data?.id;
    if (!profileId && profileData.errors) {
      const duplicateError = profileData.errors.find((e: any) => e.code === "duplicate_profile");
      if (duplicateError?.meta?.duplicate_profile_id) {
        profileId = duplicateError.meta.duplicate_profile_id;
      }
    }

    // If listId is provided, subscribe to list
    if (listId && profileId) {
      console.log("[Klaviyo] Subscribing profile to list:", listId);
      await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
        method: "POST",
        headers: {
          "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
          "Content-Type": "application/json",
          "revision": "2024-02-15",
        },
        body: JSON.stringify({
          data: [{ type: "profile", id: profileId }],
        }),
      });
    }

    // Track signup event
    await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
        "Content-Type": "application/json",
        "revision": "2024-02-15",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            profile: { $email: email },
            metric: { name: "Email Popup Signup" },
            properties: {
              source,
              signup_date: new Date().toISOString(),
            },
          },
        },
      }),
    });

    // TRIGGER SLEEP SYNC - Use centralized syncAndStoreAttributes
    console.log("[Sleep Sync] Triggering for new subscriber:", email);
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Use single source of truth for Sleep Sync
      const { attributes, event } = await syncAndStoreAttributes(supabase, email, "email_signup");
      
      // Send Sleep Sync event to Klaviyo
      await sendKlaviyoEvent(KLAVIYO_PRIVATE_API_KEY, email, event.eventName, event.payload);
      console.log("[Sleep Sync] Completed for:", email);
    } catch (syncError) {
      console.error("[Sleep Sync] Error:", syncError);
      // Non-blocking - continue with success response
    }

    console.log("[Klaviyo] Successfully processed subscription");
    return createSuccessResponse({ success: true });
  } catch (error: any) {
    console.error("[Klaviyo] Subscribe error:", error);
    return createErrorResponse(error.message, 500);
  }
});

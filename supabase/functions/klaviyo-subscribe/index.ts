/**
 * Klaviyo Subscribe Edge Function
 * 
 * Handles email popup signups and triggers Sleep Sync
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  generateSleepAttributes,
  buildSleepSyncEvent,
  sendKlaviyoEvent,
} from "../_shared/sleep-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const subscribeSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  listId: z.string().max(50, "List ID too long").optional(),
  source: z.string().max(50).optional().default("email_popup"),
});

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const rawBody = await req.json();
    const parseResult = subscribeSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { email, listId, source } = parseResult.data;
    
    console.log("Klaviyo subscribe request:", { email, listId, source });

    const klaviyoApiKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!klaviyoApiKey) {
      console.error("Klaviyo API key not configured");
      return new Response(
        JSON.stringify({ error: "Klaviyo API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update profile in Klaviyo
    console.log("Creating profile in Klaviyo for:", email);
    const profileResponse = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${klaviyoApiKey}`,
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
    console.log("Klaviyo profile response:", profileData);

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
      console.log("Subscribing profile to list:", listId);
      await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
        method: "POST",
        headers: {
          "Authorization": `Klaviyo-API-Key ${klaviyoApiKey}`,
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
        "Authorization": `Klaviyo-API-Key ${klaviyoApiKey}`,
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

    // TRIGGER SLEEP SYNC - Generate initial attributes for new subscriber
    console.log("[Sleep Sync] Triggering for new subscriber:", email);
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const attributes = await generateSleepAttributes(supabase, email);
      const event = buildSleepSyncEvent(attributes, "email_signup");

      // Store attributes
      await supabase
        .from('sleep_attributes_state')
        .upsert({
          email,
          data: attributes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      await supabase
        .from('sleep_attributes_history')
        .insert({ email, data: attributes });

      // Send Sleep Sync event to Klaviyo
      await sendKlaviyoEvent(klaviyoApiKey, email, event.eventName, event.payload);
      console.log("[Sleep Sync] Completed for:", email);
    } catch (syncError) {
      console.error("[Sleep Sync] Error:", syncError);
      // Non-blocking - continue with success response
    }

    console.log("Successfully processed Klaviyo subscription");
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Klaviyo subscribe error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

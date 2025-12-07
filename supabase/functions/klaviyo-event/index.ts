/**
 * Klaviyo Event Edge Function
 * 
 * Tracks custom events in Klaviyo.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  corsHeaders,
  requireEnvVar,
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/env.ts";

const eventSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  event: z.string().min(1, "Event name required").max(100, "Event name too long"),
  properties: z.record(z.unknown()).optional().default({}),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KLAVIYO_PRIVATE_API_KEY = requireEnvVar('KLAVIYO_PRIVATE_API_KEY');

    const rawBody = await req.json();
    const parseResult = eventSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("[klaviyo-event] Validation error:", parseResult.error.errors);
      return createErrorResponse("Invalid input", 400);
    }
    
    const { email, event, properties } = parseResult.data;

    console.log(`[Klaviyo] Tracking event "${event}" for ${email}`);

    const response = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_API_KEY}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'event',
          attributes: {
            metric: { data: { type: 'metric', attributes: { name: event } } },
            profile: { data: { type: 'profile', attributes: { email } } },
            properties,
            time: new Date().toISOString(),
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Klaviyo] API error:', errorText);
      throw new Error(`Klaviyo API error: ${errorText}`);
    }

    console.log('[Klaviyo] Event tracked successfully');
    return createSuccessResponse({ success: true });
  } catch (error: any) {
    console.error('[klaviyo-event] Error:', error);
    return createErrorResponse(error.message, 500);
  }
});

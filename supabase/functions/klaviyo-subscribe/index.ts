import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const subscribeSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  listId: z.string().max(50, "List ID too long").optional(),
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
    
    const { email, listId } = parseResult.data;
    
    console.log("Klaviyo subscribe request:", { email, listId });

    const klaviyoApiKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
    
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
          attributes: { email },
        },
      }),
    });

    const profileData = await profileResponse.json();
    console.log("Klaviyo profile response:", profileData);

    // If listId is provided, subscribe to list
    if (listId && profileData.data?.id) {
      console.log("Subscribing profile to list:", listId);
      const listResponse = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
        method: "POST",
        headers: {
          "Authorization": `Klaviyo-API-Key ${klaviyoApiKey}`,
          "Content-Type": "application/json",
          "revision": "2024-02-15",
        },
        body: JSON.stringify({
          data: [{ type: "profile", id: profileData.data.id }],
        }),
      });
      console.log("Klaviyo list subscription response status:", listResponse.status);
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

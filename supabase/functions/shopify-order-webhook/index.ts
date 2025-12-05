import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shopify-topic, x-shopify-hmac-sha256, x-shopify-shop-domain",
};

const KLAVIYO_LIST_ID = "UEJzEU";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopifyTopic = req.headers.get("x-shopify-topic");
    console.log("Shopify webhook received, topic:", shopifyTopic);

    // Only process order creation/payment events
    if (shopifyTopic !== "orders/create" && shopifyTopic !== "orders/paid") {
      console.log("Ignoring non-order topic:", shopifyTopic);
      return new Response(JSON.stringify({ success: true, message: "Ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = await req.json();
    console.log("Order received:", order.id, order.email);

    const email = order.email;
    if (!email) {
      console.log("No email in order, skipping");
      return new Response(JSON.stringify({ success: true, message: "No email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const klaviyoApiKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
    if (!klaviyoApiKey) {
      console.error("KLAVIYO_PRIVATE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Klaviyo API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update profile in Klaviyo
    console.log("Creating/updating Klaviyo profile for:", email);
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
            first_name: order.customer?.first_name || order.billing_address?.first_name,
            last_name: order.customer?.last_name || order.billing_address?.last_name,
            phone_number: order.customer?.phone || order.billing_address?.phone,
            properties: {
              shopify_customer_id: order.customer?.id,
              total_spent: order.total_price,
              last_order_date: order.created_at,
              last_order_id: order.id,
            },
          },
        },
      }),
    });

    const profileData = await profileResponse.json();
    console.log("Klaviyo profile response status:", profileResponse.status);

    // Get profile ID - handle both new creation and existing profile responses
    let profileId = profileData.data?.id;
    
    // If profile already exists, Klaviyo returns 409 with the existing profile
    if (!profileId && profileData.errors) {
      const duplicateError = profileData.errors.find((e: any) => e.code === "duplicate_profile");
      if (duplicateError?.meta?.duplicate_profile_id) {
        profileId = duplicateError.meta.duplicate_profile_id;
        console.log("Using existing profile ID:", profileId);
      }
    }

    // Subscribe to list
    if (profileId) {
      console.log("Subscribing profile to list:", KLAVIYO_LIST_ID);
      const listResponse = await fetch(`https://a.klaviyo.com/api/lists/${KLAVIYO_LIST_ID}/relationships/profiles/`, {
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
      console.log("Klaviyo list subscription response status:", listResponse.status);
    } else {
      console.warn("Could not get profile ID, skipping list subscription");
    }

    // Track the order event
    console.log("Tracking Placed Order event");
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
            metric: { name: "Placed Order" },
            properties: {
              OrderId: order.id,
              OrderNumber: order.order_number,
              Value: parseFloat(order.total_price),
              Currency: order.currency,
              ItemCount: order.line_items?.length || 0,
              Items: order.line_items?.map((item: any) => ({
                ProductID: item.product_id,
                SKU: item.sku,
                ProductName: item.title,
                Quantity: item.quantity,
                ItemPrice: parseFloat(item.price),
                VariantName: item.variant_title,
              })),
            },
            value: parseFloat(order.total_price),
            unique_id: `order_${order.id}`,
          },
        },
      }),
    });

    console.log("Successfully processed Shopify order webhook");
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Shopify webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

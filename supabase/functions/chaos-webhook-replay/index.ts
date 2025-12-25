/**
 * Chaos Webhook Replay Helper
 * 
 * Allows admin users to trigger webhook-based chaos tests (C1, C2, C3, C6, C8, C9)
 * by replaying a sample order payload with proper HMAC signature.
 * 
 * Auth: Requires JWT + admin role
 * 
 * Tests:
 * - C1: Pinterest Timeout (chaos=pinterest_timeout)
 * - C2: Pinterest Partial Success (chaos=pinterest_partial_success)
 * - C3: Duplicate Webhook (replay same payload twice)
 * - C6: DB Fail Before Send (chaos=db_write_fail_before_send)
 * - C8: DB Unavailable (chaos=db_unavailable)
 * - C9: Auth Failure (invalid HMAC signature)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sample order payload for testing (no real PII)
const SAMPLE_ORDER_PAYLOAD = {
  id: 9999999999999,
  admin_graphql_api_id: "gid://shopify/Order/9999999999999",
  app_id: null,
  browser_ip: null,
  buyer_accepts_marketing: false,
  cancel_reason: null,
  cancelled_at: null,
  cart_token: null,
  checkout_id: 99999999999999,
  checkout_token: "chaos_test_token",
  client_details: null,
  closed_at: null,
  company: null,
  confirmation_number: "CHAOSTEST",
  confirmed: true,
  contact_email: "chaos-test@example.com",
  created_at: new Date().toISOString(),
  currency: "EUR",
  current_subtotal_price: "49.99",
  current_subtotal_price_set: {
    shop_money: { amount: "49.99", currency_code: "EUR" },
    presentment_money: { amount: "49.99", currency_code: "EUR" }
  },
  current_total_additional_fees_set: null,
  current_total_discounts: "0.00",
  current_total_discounts_set: {
    shop_money: { amount: "0.00", currency_code: "EUR" },
    presentment_money: { amount: "0.00", currency_code: "EUR" }
  },
  current_total_duties_set: null,
  current_total_price: "49.99",
  current_total_price_set: {
    shop_money: { amount: "49.99", currency_code: "EUR" },
    presentment_money: { amount: "49.99", currency_code: "EUR" }
  },
  current_total_tax: "0.00",
  current_total_tax_set: {
    shop_money: { amount: "0.00", currency_code: "EUR" },
    presentment_money: { amount: "0.00", currency_code: "EUR" }
  },
  customer_locale: "en",
  device_id: null,
  discount_applications: [],
  discount_codes: [],
  email: "chaos-test@example.com",
  estimated_taxes: false,
  financial_status: "paid",
  fulfillment_status: null,
  landing_site: "/?epik=chaos_test_epik&utm_source=pinterest&utm_medium=cpc",
  landing_site_ref: null,
  line_items: [
    {
      id: 88888888888888,
      admin_graphql_api_id: "gid://shopify/LineItem/88888888888888",
      fulfillable_quantity: 1,
      fulfillment_service: "manual",
      fulfillment_status: null,
      gift_card: false,
      grams: 500,
      name: "Chaos Test Product",
      price: "49.99",
      price_set: {
        shop_money: { amount: "49.99", currency_code: "EUR" },
        presentment_money: { amount: "49.99", currency_code: "EUR" }
      },
      product_id: 77777777777777,
      quantity: 1,
      sku: "CHAOS-TEST-SKU",
      taxable: true,
      title: "Chaos Test Product",
      total_discount: "0.00",
      variant_id: 66666666666666,
      variant_title: null,
      vendor: "Chaos Test Vendor"
    }
  ],
  name: "#CHAOS-TEST-001",
  note: "Chaos test order - not real",
  note_attributes: [
    { name: "_context_id", value: "chaos_test_context_123" }
  ],
  number: 1,
  order_number: 9999001,
  order_status_url: "https://example.com/order/status",
  payment_gateway_names: ["manual"],
  phone: null,
  presentment_currency: "EUR",
  processed_at: new Date().toISOString(),
  reference: null,
  referring_site: "https://pinterest.com/",
  source_identifier: null,
  source_name: "web",
  source_url: null,
  subtotal_price: "49.99",
  subtotal_price_set: {
    shop_money: { amount: "49.99", currency_code: "EUR" },
    presentment_money: { amount: "49.99", currency_code: "EUR" }
  },
  tags: "chaos_test",
  taxes_included: false,
  test: true,
  token: "chaos_test_order_token",
  total_discounts: "0.00",
  total_discounts_set: {
    shop_money: { amount: "0.00", currency_code: "EUR" },
    presentment_money: { amount: "0.00", currency_code: "EUR" }
  },
  total_line_items_price: "49.99",
  total_line_items_price_set: {
    shop_money: { amount: "49.99", currency_code: "EUR" },
    presentment_money: { amount: "49.99", currency_code: "EUR" }
  },
  total_outstanding: "0.00",
  total_price: "49.99",
  total_price_set: {
    shop_money: { amount: "49.99", currency_code: "EUR" },
    presentment_money: { amount: "49.99", currency_code: "EUR" }
  },
  total_shipping_price_set: {
    shop_money: { amount: "0.00", currency_code: "EUR" },
    presentment_money: { amount: "0.00", currency_code: "EUR" }
  },
  total_tax: "0.00",
  total_tax_set: {
    shop_money: { amount: "0.00", currency_code: "EUR" },
    presentment_money: { amount: "0.00", currency_code: "EUR" }
  },
  total_tip_received: "0.00",
  total_weight: 500,
  updated_at: new Date().toISOString(),
  user_id: null,
  billing_address: null,
  customer: {
    id: 55555555555555,
    email: "chaos-test@example.com",
    first_name: "Chaos",
    last_name: "Test",
    phone: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    orders_count: 1,
    state: "enabled",
    total_spent: "49.99",
    verified_email: true,
    tax_exempt: false,
    tags: "chaos_test",
    currency: "EUR"
  },
  shipping_address: null,
  shipping_lines: []
};

async function computeHmacSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

interface WebhookReplayResult {
  test: string;
  success: boolean;
  dry_run: boolean;
  order_id: string;
  hmac_valid: boolean;
  response: unknown;
  duration_ms: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Verify JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const webhookSecret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");

    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_WEBHOOK_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const url = new URL(req.url);
    const testType = url.searchParams.get("test");
    const dryRun = url.searchParams.get("dry_run") !== "0";

    const validTests = ["c1", "c2", "c3", "c6", "c8", "c9"];
    if (!testType || !validTests.includes(testType)) {
      return new Response(
        JSON.stringify({
          error: "Invalid test type. Supported: c1, c2, c3, c6, c8, c9",
          available_tests: {
            c1: "Pinterest Timeout",
            c2: "Pinterest Partial Success",
            c3: "Duplicate Webhook (idempotency)",
            c6: "DB Fail Before Send",
            c8: "DB Unavailable",
            c9: "Auth Failure (invalid HMAC)",
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WebhookReplay] Admin running test ${testType}, dry_run=${dryRun}`);

    // Generate unique order ID for this test run
    const testOrderId = Date.now();
    const orderPayload = {
      ...SAMPLE_ORDER_PAYLOAD,
      id: testOrderId,
      name: `#CHAOS-${testType.toUpperCase()}-${testOrderId}`,
      order_number: testOrderId,
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const bodyString = JSON.stringify(orderPayload);

    // Compute HMAC signature (valid or invalid based on test type)
    let hmacSignature: string;
    let useValidHmac = true;

    if (testType === "c9") {
      // C9: Invalid HMAC - use wrong signature
      hmacSignature = "invalid_signature_for_c9_test";
      useValidHmac = false;
    } else {
      hmacSignature = await computeHmacSignature(bodyString, webhookSecret);
    }

    // Determine chaos mode query param
    let chaosParam = "";
    switch (testType) {
      case "c1":
        chaosParam = "chaos=pinterest_timeout";
        break;
      case "c2":
        chaosParam = "chaos=pinterest_partial_success";
        break;
      case "c3":
        chaosParam = ""; // No chaos - just duplicate replay
        break;
      case "c6":
        chaosParam = "chaos=db_write_fail_before_send";
        break;
      case "c8":
        chaosParam = "chaos=db_unavailable";
        break;
      case "c9":
        chaosParam = ""; // No chaos - testing auth failure
        break;
    }

    // Add dry_run param if enabled
    const queryParams = [
      chaosParam,
      dryRun ? "dry_run=1" : "",
    ].filter(Boolean).join("&");

    const webhookUrl = `${supabaseUrl}/functions/v1/shopify-order-webhook${queryParams ? `?${queryParams}` : ""}`;

    console.log(`[WebhookReplay] Calling ${webhookUrl}`);

    const testStart = Date.now();

    // For C3 (duplicate), we send twice
    const callCount = testType === "c3" ? 2 : 1;
    const results: Array<{ status: number; body: unknown }> = [];

    for (let i = 0; i < callCount; i++) {
      if (i > 0) {
        console.log(`[WebhookReplay] C3: Sending duplicate webhook (attempt ${i + 1})`);
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-SHA256": hmacSignature,
          "X-Shopify-Shop-Domain": "chaos-test.myshopify.com",
          "X-Shopify-Topic": "orders/paid",
        },
        body: bodyString,
      });

      let responseData: unknown;
      try {
        responseData = await response.json();
      } catch {
        responseData = { raw: await response.text() };
      }

      results.push({ status: response.status, body: responseData });
    }

    const testDuration = Date.now() - testStart;

    // Determine success based on expected behavior
    let testSuccess = false;
    let expectedBehavior = "";

    switch (testType) {
      case "c1":
        // C1: Should succeed (webhook handles timeout gracefully)
        testSuccess = results[0].status === 200;
        expectedBehavior = "Webhook should return 200, Pinterest call times out internally";
        break;
      case "c2":
        // C2: Should succeed (partial success is still 200)
        testSuccess = results[0].status === 200;
        expectedBehavior = "Webhook should return 200, Pinterest reports partial success";
        break;
      case "c3":
        // C3: First should succeed, second should be idempotent (also 200 or detect duplicate)
        testSuccess = results[0].status === 200 && results[1].status === 200;
        expectedBehavior = "Both calls should return 200 (idempotency)";
        break;
      case "c6":
        // C6: DB failure before send - should return error
        testSuccess = results[0].status === 500 || results[0].status === 200;
        expectedBehavior = "Webhook should handle DB failure gracefully";
        break;
      case "c8":
        // C8: DB unavailable - should return error
        testSuccess = results[0].status === 500 || results[0].status === 200;
        expectedBehavior = "Webhook should handle DB unavailability gracefully";
        break;
      case "c9":
        // C9: Invalid HMAC - should return 401
        testSuccess = results[0].status === 401;
        expectedBehavior = "Webhook should reject with 401 Unauthorized";
        break;
    }

    const result: WebhookReplayResult = {
      test: testType.toUpperCase(),
      success: testSuccess,
      dry_run: dryRun,
      order_id: `CHAOS-${testType.toUpperCase()}-${testOrderId}`,
      hmac_valid: useValidHmac,
      response: testType === "c3" ? { first: results[0], second: results[1] } : results[0].body,
      duration_ms: testDuration,
    };

    if (!testSuccess) {
      result.error = `Expected: ${expectedBehavior}. Got: HTTP ${results[0].status}`;
    }

    console.log(`[WebhookReplay] Test ${testType} completed:`, {
      success: testSuccess,
      duration_ms: testDuration,
      http_status: results.map(r => r.status),
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[WebhookReplay] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

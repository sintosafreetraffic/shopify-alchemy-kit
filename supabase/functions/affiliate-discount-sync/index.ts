/**
 * Affiliate Discount Code Sync Edge Function
 * 
 * Syncs affiliate discount codes with Shopify Price Rules + Discount Codes.
 * Ensures codes work at checkout and prevents collisions.
 * 
 * Actions:
 * - create: Create price rule + discount code in Shopify, then insert to DB
 * - check: Check if code exists in Shopify
 * - deactivate: Disable code in Shopify and DB
 * - activate: Re-enable code in Shopify and DB
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_DOMAIN = 'lovable-project-swlbs.myshopify.com';
const SHOPIFY_API_VERSION = '2024-10';

interface CreateRequest {
  action: 'create';
  code: string;
  discountValue: number;
  affiliateId: string;
}

interface CheckRequest {
  action: 'check';
  code: string;
}

interface ToggleRequest {
  action: 'activate' | 'deactivate';
  code: string;
  codeId: string;
}

type RequestBody = CreateRequest | CheckRequest | ToggleRequest;

/**
 * Check if a discount code already exists in Shopify
 */
async function checkCodeExistsInShopify(code: string, shopifyToken: string): Promise<boolean> {
  try {
    // Search for discount codes matching this code
    const url = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/discount_codes/lookup.json?code=${encodeURIComponent(code)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 200) {
      // Code exists
      console.log(`[Shopify] Code "${code}" already exists in Shopify`);
      return true;
    } else if (response.status === 404) {
      // Code doesn't exist
      console.log(`[Shopify] Code "${code}" is available in Shopify`);
      return false;
    } else {
      console.error(`[Shopify] Unexpected status checking code: ${response.status}`);
      // Fail safe - assume it exists to prevent duplicates
      return true;
    }
  } catch (error) {
    console.error('[Shopify] Error checking code existence:', error);
    // Fail safe
    return true;
  }
}

/**
 * Create a Price Rule and Discount Code in Shopify
 */
async function createShopifyDiscount(
  code: string,
  discountValue: number,
  shopifyToken: string
): Promise<{ success: boolean; priceRuleId?: string; discountCodeId?: string; error?: string }> {
  try {
    // Step 1: Create Price Rule
    const priceRulePayload = {
      price_rule: {
        title: `Affiliate: ${code}`,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: 'percentage',
        value: `-${discountValue}`, // Negative for discount
        customer_selection: 'all',
        starts_at: new Date().toISOString(),
        usage_limit: null, // Unlimited uses
        once_per_customer: false,
      },
    };

    console.log(`[Shopify] Creating price rule for code: ${code}`);
    
    const priceRuleResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/price_rules.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(priceRulePayload),
      }
    );

    if (!priceRuleResponse.ok) {
      const errorText = await priceRuleResponse.text();
      console.error('[Shopify] Price rule creation failed:', errorText);
      return { success: false, error: `Failed to create price rule: ${errorText}` };
    }

    const priceRuleData = await priceRuleResponse.json();
    const priceRuleId = priceRuleData.price_rule.id;
    console.log(`[Shopify] Price rule created: ${priceRuleId}`);

    // Step 2: Create Discount Code attached to Price Rule
    const discountCodePayload = {
      discount_code: {
        code: code,
      },
    };

    const discountCodeResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/price_rules/${priceRuleId}/discount_codes.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountCodePayload),
      }
    );

    if (!discountCodeResponse.ok) {
      const errorText = await discountCodeResponse.text();
      console.error('[Shopify] Discount code creation failed:', errorText);
      
      // Cleanup: Delete the price rule since discount code failed
      await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/price_rules/${priceRuleId}.json`,
        {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
          },
        }
      );
      
      return { success: false, error: `Failed to create discount code: ${errorText}` };
    }

    const discountCodeData = await discountCodeResponse.json();
    const discountCodeId = discountCodeData.discount_code.id;
    console.log(`[Shopify] Discount code created: ${discountCodeId}`);

    return { success: true, priceRuleId: String(priceRuleId), discountCodeId: String(discountCodeId) };
  } catch (error: any) {
    console.error('[Shopify] Error creating discount:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deactivate a discount code in Shopify by setting ends_at to now
 */
async function deactivateShopifyDiscount(
  code: string,
  shopifyToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, find the discount code
    const lookupUrl = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/discount_codes/lookup.json?code=${encodeURIComponent(code)}`;
    
    const lookupResponse = await fetch(lookupUrl, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (lookupResponse.status === 404) {
      console.log(`[Shopify] Code "${code}" not found in Shopify, skipping deactivation`);
      return { success: true }; // Not an error - code might have been created before sync
    }

    if (!lookupResponse.ok) {
      return { success: false, error: 'Failed to lookup discount code' };
    }

    const lookupData = await lookupResponse.json();
    const priceRuleId = lookupData.discount_code.price_rule_id;

    // Update price rule to end now
    const updateResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/price_rules/${priceRuleId}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_rule: {
            id: priceRuleId,
            ends_at: new Date().toISOString(),
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[Shopify] Failed to deactivate price rule:', errorText);
      return { success: false, error: errorText };
    }

    console.log(`[Shopify] Deactivated price rule ${priceRuleId} for code: ${code}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Shopify] Error deactivating discount:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reactivate a discount code in Shopify by clearing ends_at
 */
async function activateShopifyDiscount(
  code: string,
  shopifyToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const lookupUrl = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/discount_codes/lookup.json?code=${encodeURIComponent(code)}`;
    
    const lookupResponse = await fetch(lookupUrl, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (lookupResponse.status === 404) {
      // Code doesn't exist in Shopify - need to create it
      console.log(`[Shopify] Code "${code}" not found, cannot reactivate`);
      return { success: false, error: 'Code not found in Shopify. Please create a new code.' };
    }

    if (!lookupResponse.ok) {
      return { success: false, error: 'Failed to lookup discount code' };
    }

    const lookupData = await lookupResponse.json();
    const priceRuleId = lookupData.discount_code.price_rule_id;

    // Update price rule to remove end date
    const updateResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/price_rules/${priceRuleId}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_rule: {
            id: priceRuleId,
            ends_at: null,
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[Shopify] Failed to activate price rule:', errorText);
      return { success: false, error: errorText };
    }

    console.log(`[Shopify] Activated price rule ${priceRuleId} for code: ${code}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Shopify] Error activating discount:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopifyToken = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!shopifyToken) {
      console.error('[DiscountSync] Missing SHOPIFY_ADMIN_API_TOKEN');
      return new Response(
        JSON.stringify({ error: 'Shopify not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[DiscountSync] Missing Supabase config');
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: RequestBody = await req.json();

    console.log(`[DiscountSync] Action: ${body.action}`);

    // Handle CHECK action
    if (body.action === 'check') {
      const exists = await checkCodeExistsInShopify(body.code, shopifyToken);
      return new Response(
        JSON.stringify({ exists }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle CREATE action
    if (body.action === 'create') {
      const { code, discountValue, affiliateId } = body;

      // Step 1: Check if code exists in Shopify
      const existsInShopify = await checkCodeExistsInShopify(code, shopifyToken);
      if (existsInShopify) {
        return new Response(
          JSON.stringify({ error: 'This code already exists in Shopify. Please choose a different code.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 2: Check if code exists in our DB
      const { data: existingCode } = await supabase
        .from('affiliate_discount_codes')
        .select('id')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      if (existingCode) {
        return new Response(
          JSON.stringify({ error: 'This code is already used by another affiliate.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 3: Create in Shopify first
      const shopifyResult = await createShopifyDiscount(code, discountValue, shopifyToken);
      if (!shopifyResult.success) {
        return new Response(
          JSON.stringify({ error: shopifyResult.error || 'Failed to create code in Shopify' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 4: Insert into our DB with Shopify IDs
      const { data: insertedCode, error: insertError } = await supabase
        .from('affiliate_discount_codes')
        .insert({
          affiliate_id: affiliateId,
          code: code.toUpperCase(),
          discount_type: 'percentage',
          discount_value: discountValue,
          is_active: true,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[DiscountSync] DB insert failed:', insertError);
        // Shopify code was created but DB failed - log for manual cleanup
        console.error(`[DiscountSync] ORPHANED SHOPIFY CODE: ${code} - needs manual cleanup`);
        return new Response(
          JSON.stringify({ error: 'Failed to save code. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[DiscountSync] Successfully created code: ${code}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          code: insertedCode,
          shopifyPriceRuleId: shopifyResult.priceRuleId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DEACTIVATE action
    if (body.action === 'deactivate') {
      const { code, codeId } = body;

      // Deactivate in Shopify
      const shopifyResult = await deactivateShopifyDiscount(code, shopifyToken);
      if (!shopifyResult.success) {
        console.warn(`[DiscountSync] Shopify deactivation warning: ${shopifyResult.error}`);
        // Continue anyway - we still want to deactivate in DB
      }

      // Deactivate in DB
      const { error: updateError } = await supabase
        .from('affiliate_discount_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (updateError) {
        console.error('[DiscountSync] DB deactivation failed:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to deactivate code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[DiscountSync] Deactivated code: ${code}`);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle ACTIVATE action
    if (body.action === 'activate') {
      const { code, codeId } = body;

      // Activate in Shopify
      const shopifyResult = await activateShopifyDiscount(code, shopifyToken);
      if (!shopifyResult.success) {
        return new Response(
          JSON.stringify({ error: shopifyResult.error || 'Failed to activate in Shopify' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Activate in DB
      const { error: updateError } = await supabase
        .from('affiliate_discount_codes')
        .update({ is_active: true })
        .eq('id', codeId);

      if (updateError) {
        console.error('[DiscountSync] DB activation failed:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to activate code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[DiscountSync] Activated code: ${code}`);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[DiscountSync] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

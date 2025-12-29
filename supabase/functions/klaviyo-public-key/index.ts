const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const klaviyoApiKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");

    if (!klaviyoApiKey) {
      console.error("[klaviyo-public-key] Missing KLAVIYO_PRIVATE_API_KEY");
      return new Response(JSON.stringify({ error: "missing_klaviyo_private_api_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NOTE: This returns the public API key (company_id) used by Klaviyo onsite JS.
    const resp = await fetch("https://a.klaviyo.com/api/accounts/", {
      method: "GET",
      headers: {
        Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
        accept: "application/json",
        revision: "2024-02-15",
      },
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error(`[klaviyo-public-key] Klaviyo error ${resp.status}:`, text);
      return new Response(
        JSON.stringify({ error: "klaviyo_error", status: resp.status, details: text }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const json = JSON.parse(text || "{}");

    // Klaviyo returns `data` as an array; the public key is the account resource `id`.
    const companyId = Array.isArray(json?.data)
      ? json.data?.[0]?.id
      : json?.data?.id;

    if (!companyId || typeof companyId !== "string") {
      console.error("[klaviyo-public-key] Could not parse company_id", json);
      return new Response(JSON.stringify({ error: "company_id_not_found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[klaviyo-public-key] Resolved company_id:", companyId);

    return new Response(JSON.stringify({ company_id: companyId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[klaviyo-public-key] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

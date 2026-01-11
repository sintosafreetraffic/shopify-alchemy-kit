import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ResolveRequestBody = {
  checkout_url: string;
  preferred_hosts?: string[];
  fallback_host?: string;
};

type Attempt = {
  url: string;
  status?: number;
  ok: boolean;
  error?: string;
};

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function buildCheckoutUrlWithHost(checkoutUrl: string, host: string): string {
  const u = new URL(checkoutUrl);
  u.hostname = host;
  u.protocol = "https:";
  return u.toString();
}

async function probeUrl(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "LovableCheckoutResolver/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    // We specifically want to avoid known-bad states that caused the issue:
    // - 404 (page not found)
    // - TLS/DNS failures (handled by catch)
    // Anything else means the host is at least reachable and likely usable.
    if (res.status === 404 || res.status === 410) {
      return { ok: false, status: res.status };
    }

    return { ok: true, status: res.status };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ResolveRequestBody;

    if (!body?.checkout_url) {
      return new Response(JSON.stringify({ error: "Missing checkout_url" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const checkoutUrl = body.checkout_url;
    const fallbackHost = body.fallback_host;

    // Validate checkout URL
    let parsed: URL;
    try {
      parsed = new URL(checkoutUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid checkout_url" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const preferredHosts = Array.isArray(body.preferred_hosts) ? body.preferred_hosts : [];

    // Candidate order: preferred hosts first, then fallback host, then original host.
    const candidateHosts = uniq([
      ...preferredHosts.filter(Boolean),
      ...(fallbackHost ? [fallbackHost] : []),
      parsed.hostname,
    ]);

    const attempts: Attempt[] = [];

    for (const host of candidateHosts) {
      const candidateUrl = buildCheckoutUrlWithHost(checkoutUrl, host);
      const result = await probeUrl(candidateUrl);

      attempts.push({ url: candidateUrl, ok: result.ok, status: result.status, error: result.error });

      if (result.ok) {
        console.log(`[checkout-url-resolver] Resolved to host=${host} status=${result.status}`);
        return new Response(JSON.stringify({ resolved_url: candidateUrl, attempts }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Final fallback (should be original URL)
    console.warn("[checkout-url-resolver] No candidate hosts reachable; returning original URL");
    return new Response(JSON.stringify({ resolved_url: checkoutUrl, attempts }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[checkout-url-resolver] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackEventRequest {
  session_id: string;
  event_type: "viewed" | "submitted" | "dismissed";
  form_id?: string;
  page_path: string;
  meta?: Record<string, unknown>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as TrackEventRequest;
    
    // Validate required fields
    if (!body.session_id || typeof body.session_id !== "string") {
      console.error("[track-klaviyo-form-event] Missing or invalid session_id");
      return new Response(
        JSON.stringify({ ok: false, error: "session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.event_type || !["viewed", "submitted", "dismissed"].includes(body.event_type)) {
      console.error("[track-klaviyo-form-event] Invalid event_type:", body.event_type);
      return new Response(
        JSON.stringify({ ok: false, error: "event_type must be viewed, submitted, or dismissed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.page_path || typeof body.page_path !== "string") {
      console.error("[track-klaviyo-form-event] Missing or invalid page_path");
      return new Response(
        JSON.stringify({ ok: false, error: "page_path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user_id from auth header if present (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const anonClient = createClient(
          supabaseUrl,
          Deno.env.get("SUPABASE_ANON_KEY")!
        );
        const { data: { user } } = await anonClient.auth.getUser(
          authHeader.replace("Bearer ", "")
        );
        userId = user?.id || null;
      } catch {
        // Ignore auth errors - user_id is optional
      }
    }

    // Prepare meta with enrichment
    const meta = {
      ...(body.meta || {}),
      tracked_at: new Date().toISOString(),
    };

    // Use 'default' for null form_id to match unique constraint
    const formId = body.form_id || "default";

    // Insert with ON CONFLICT DO NOTHING for idempotency
    const { data, error } = await supabase
      .from("klaviyo_form_events")
      .upsert(
        {
          session_id: body.session_id,
          event_type: body.event_type,
          form_id: formId,
          page_path: body.page_path,
          user_id: userId,
          meta,
          source: "web",
        },
        {
          onConflict: "session_id,form_id,event_type",
          ignoreDuplicates: true,
        }
      )
      .select("id")
      .maybeSingle();

    if (error) {
      // Check for unique constraint violation (duplicate)
      if (error.code === "23505") {
        console.log("[track-klaviyo-form-event] Deduped event", {
          session_id_hash: body.session_id.substring(0, 8),
          event_type: body.event_type,
          form_id: body.form_id || "default",
        });
        return new Response(
          JSON.stringify({ ok: true, deduped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("[track-klaviyo-form-event] Insert error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isNew = data?.id != null;
    console.log("[track-klaviyo-form-event] Event tracked", {
      session_id_hash: body.session_id.substring(0, 8),
      event_type: body.event_type,
      form_id: body.form_id || "default",
      page_path: body.page_path,
      inserted: isNew,
    });

    return new Response(
      JSON.stringify({ ok: true, deduped: !isNew }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[track-klaviyo-form-event] Unexpected error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

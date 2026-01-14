/**
 * notify-join-request
 * Looks up club admins (creator + club_members role=admin) and posts to an n8n webhook.
 *
 * Required secrets (Supabase project-level):
 *  SUPABASE_URL
 *  SUPABASE_ANON_KEY
 *  SUPABASE_SERVICE_ROLE_KEY
 *  N8N_JOIN_REQUEST_WEBHOOK_URL
 * Optional:
 *  N8N_WEBHOOK_SECRET (sent as x-webhook-secret)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

interface RequestBody {
  slug: string;
  member_association?: boolean;
}

interface ClubRow {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  status: string | null;
}

interface ClubMemberRow {
  user_id: string;
}

interface UserProfileRow {
  id: string;
  email: string | null;
}

const N8N_URL = (Deno.env.get("N8N_JOIN_REQUEST_WEBHOOK_URL") ?? "").trim();
const N8N_SECRET = (Deno.env.get("N8N_WEBHOOK_SECRET") ?? "").trim();

function isValidSlug(slug: string): boolean {
  // Be permissive but safe; adjust if you enforce stricter slugs.
  return /^[a-z0-9-]{2,64}$/i.test(slug);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("authorization")?.split(" ")[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // User-scoped client (to identify requester)
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${authHeader}` } } }
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (parsed ?? {}) as Partial<RequestBody>;

    /**
     * Normalize user input so:
     * - leading/trailing spaces don’t matter
     * - case doesn’t matter for the user
     * - we always query the DB using the canonical format (UPPERCASE)
     */
    const slug = String(body.slug ?? "")
      .trim()
      .toUpperCase();

    const memberAssociation = Boolean(body.member_association ?? false);

    if (!slug || !isValidSlug(slug)) {
      return new Response(JSON.stringify({ error: "Invalid slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!N8N_URL) {
      // Misconfiguration; do not fail the caller’s UX.
      return new Response(
        JSON.stringify({ ok: false, error: "Missing N8N URL" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Service-role client (bypass RLS for admin email lookup)
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing service role key" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey
    );

    // 1) Club lookup (by slug)
    const { data: club, error: clubErr } = await adminClient
      .from("clubs")
      .select("id,name,slug,created_by,status")
      .eq("slug", slug)
      .maybeSingle<ClubRow>();

    if (clubErr || !club || club.status !== "active") {
      // Don’t leak whether the club exists; still return ok.
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Admin user IDs (creator + club_members role=admin, active)
    const { data: adminMembers, error: adminMembersErr } = await adminClient
      .from("club_members")
      .select("user_id")
      .eq("club_id", club.id)
      .eq("role", "admin")
      .eq("status", "active")
      .eq("is_active", true)
      .returns<ClubMemberRow[]>();

    if (adminMembersErr) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminIds = new Set<string>([
      club.created_by,
      ...(adminMembers ?? []).map((r) => r.user_id),
    ]);

    // 3) Admin emails from user_profiles
    const adminIdList = Array.from(adminIds);
    const { data: adminProfiles, error: profilesErr } = await adminClient
      .from("user_profiles")
      .select("id,email")
      .in("id", adminIdList)
      .returns<UserProfileRow[]>();

    if (profilesErr) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admins = (adminProfiles ?? [])
      .filter((p) => typeof p.email === "string" && p.email.trim() !== "")
      .map((p) => ({ id: p.id, email: p.email as string }));

    if (admins.length === 0) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Post to n8n webhook
    const payload = {
      event: "club_join_request_created",
      club: { id: club.id, name: club.name, slug: club.slug },
      requester: { id: user.id, email: user.email ?? null },
      member_association: memberAssociation,
      admins,
      occurred_at: new Date().toISOString(),
    };

    console.log("[notify-join-request] Posting to n8n:", N8N_URL);

    const res = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_SECRET ? { "x-webhook-secret": N8N_SECRET } : {}),
      },
      body: JSON.stringify(payload),
    });

    // Even if n8n fails, we do not fail the caller; the join request is already created.
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn("[notify-join-request] n8n returned:", res.status, txt);
    } else {
      // Useful while debugging; you can remove later
      console.log("[notify-join-request] n8n OK:", res.status);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.warn("[notify-join-request] unexpected:", String(err));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

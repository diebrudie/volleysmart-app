/**
 * notify-join-request
 * Sends a branded email to all club admins when someone requests to join.
 * Called fire-and-forget from the frontend after request_join_club / accept_invitation.
 *
 * Required secrets: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml, sendEmail } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("authorization")?.split(" ")[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticated client to identify the requester
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${authHeader}` } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service-role client for cross-table lookups + admin email addresses
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const parsed = await req.json();
    let clubId: string | undefined = parsed.club_id;
    const token: string | undefined = parsed.token;

    // Resolve club_id from invite token if needed
    if (!clubId && token) {
      const { data: inv } = await supabase
        .from("club_invitations")
        .select("club_id")
        .eq("token", token)
        .single();
      clubId = inv?.club_id;
    }

    if (!clubId) {
      return new Response(
        JSON.stringify({ error: "club_id or token required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch club name
    const { data: club } = await supabase
      .from("clubs")
      .select("name")
      .eq("id", clubId)
      .single();

    if (!club) {
      return new Response(
        JSON.stringify({ error: "Club not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch requester's player profile
    const { data: player } = await supabase
      .from("players")
      .select("id, first_name, last_name, city, image_url")
      .eq("user_id", user.id)
      .single();

    if (!player) {
      return new Response(
        JSON.stringify({ error: "Player profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch primary position
    const { data: posRow } = await supabase
      .from("player_positions")
      .select("positions(name)")
      .eq("player_id", player.id)
      .eq("is_primary", true)
      .single();

    const primaryPosition =
      (posRow as any)?.positions?.name ?? null;

    // Fetch admin user_ids for the club
    const { data: admins } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .eq("role", "admin")
      .eq("status", "active")
      .eq("is_active", true);

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, note: "No admins found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve admin email addresses
    const adminEmails: string[] = [];
    for (const admin of admins) {
      if (!admin.user_id) continue;
      const { data: { user: adminUser } } = await supabase.auth.admin.getUserById(admin.user_id);
      if (adminUser?.email) adminEmails.push(adminUser.email);
    }

    if (adminEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, note: "No admin emails found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build profile card HTML
    const name = `${escapeHtml(player.first_name ?? "")} ${escapeHtml(player.last_name ?? "")}`.trim();
    const imgSrc = player.image_url
      ? escapeHtml(player.image_url)
      : "https://volleysmart.app/placeholder.svg";
    const positionLine = primaryPosition
      ? `<span style="color:#6B7280;font-size:13px;">${escapeHtml(primaryPosition)}</span>`
      : "";
    const cityLine = player.city
      ? `<span style="color:#6B7280;font-size:13px;">${escapeHtml(player.city)}</span>`
      : "";
    const detailParts = [positionLine, cityLine].filter(Boolean).join(
      '<span style="color:#D1D5DB;margin:0 6px;">·</span>',
    );

    const bodyHtml = `
      <p style="margin:0 0 16px;">Someone has requested to join <strong>${escapeHtml(club.name)}</strong>.</p>
      <table border="0" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#F9FAFB;border-radius:12px;padding:16px;width:100%;">
        <tr>
          <td style="width:56px;vertical-align:top;padding-right:12px;">
            <img src="${imgSrc}" alt="${name}"
                 style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
          </td>
          <td style="vertical-align:center;font-family:Helvetica,Arial,sans-serif;">
            <strong style="font-size:15px;color:#111827;">${name}</strong><br/>
            ${detailParts}
          </td>
        </tr>
      </table>`;

    const html = buildEmailHtml({
      heading: `New Join Request for ${escapeHtml(club.name)}`,
      bodyHtml,
      ctaUrl: "https://volleysmart.app/manage-requests",
      ctaText: "Review Requests",
      footerText: `You received this because you are an admin of ${escapeHtml(club.name)}.`,
    });

    const subject = `New join request: ${name} wants to join ${club.name}`;

    // Send to all admins
    const results: Array<{ email: string; ok: boolean; error?: string }> = [];
    for (const email of adminEmails) {
      const result = await sendEmail(RESEND_API_KEY, { to: email, subject, html });
      results.push({ email, ok: result.ok, error: result.error });
    }

    const sent = results.filter((r) => r.ok).length;
    return new Response(
      JSON.stringify({ success: true, sent, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("notify-join-request error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

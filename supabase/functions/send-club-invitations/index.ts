/**
 * send-club-invitations
 * Sends branded club invitation emails via Resend.
 *
 * Required secret: RESEND_API_KEY
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

interface Invite {
  name: string;
  email: string;
}
interface ClubInfo {
  id: string;
  name: string;
  inviteToken: string;
}
interface RequestBody {
  invites: Invite[];
  clubInfo: ClubInfo;
}

const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("authorization")?.split(" ")[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${authHeader}` } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invites, clubInfo } = (parsed ?? {}) as Partial<RequestBody>;
    const invalid =
      !clubInfo ||
      typeof clubInfo.id !== "string" ||
      typeof clubInfo.name !== "string" ||
      typeof clubInfo.inviteToken !== "string" ||
      !Array.isArray(invites) ||
      invites.length === 0 ||
      invites.some(
        (i) =>
          !i ||
          typeof i.name !== "string" ||
          i.name.trim() === "" ||
          typeof i.email !== "string" ||
          i.email.trim() === "" ||
          !emailRegex.test(i.email)
      );

    if (invalid) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid invites/club info" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Permission check
    const { data: clubRow, error: clubErr } = await supabase
      .from("clubs")
      .select("created_by")
      .eq("id", clubInfo!.id)
      .single();

    if (clubErr || !clubRow) {
      return new Response(JSON.stringify({ error: "Club not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (clubRow.created_by !== user.id) {
      const { data: memberRow, error: memberErr } = await supabase
        .from("club_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("club_id", clubInfo!.id)
        .eq("is_active", true)
        .eq("status", "active")
        .maybeSingle();

      const notAdmin = !!memberErr || !memberRow || memberRow.role !== "admin";
      if (notAdmin) {
        return new Response(
          JSON.stringify({ error: "Not authorized to invite members to this club" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const club = clubInfo as ClubInfo;
    const joinUrl = `https://volleysmart.app/invite/${club.inviteToken}`;

    const results: Array<{ email: string; ok: boolean; error?: string }> = [];
    for (const invite of invites as Invite[]) {
      const html = buildEmailHtml({
        heading: `You're invited to join ${escapeHtml(club.name)}`,
        bodyHtml: `<p style="margin:0 0 8px;">Hi ${escapeHtml(invite.name || "there")},</p>
          <p style="margin:0;">You've been invited to join <strong>${escapeHtml(club.name)}</strong> on VolleySmart.</p>`,
        ctaUrl: joinUrl,
        ctaText: `Join ${escapeHtml(club.name)}`,
        footerText: "If you didn't expect this invitation, you can ignore this email.",
      });

      const subject = `You're invited to join ${club.name} on VolleySmart`;
      const result = await sendEmail(RESEND_API_KEY, {
        to: invite.email,
        subject,
        html,
      });

      results.push({
        email: invite.email,
        ok: result.ok,
        error: result.error,
      });
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({ success: failed === 0, sent, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in send-club-invitations:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

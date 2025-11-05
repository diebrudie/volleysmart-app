/**
 * send-club-invitations
 * Gmail SMTP sender for club invites (VolleySmart).
 * Fixes Deno 2 runtime issue by polyfilling Deno.writeAll before importing smtp client.
 *
 * Required secrets (project-level):
 *  SMTP_HOST=smtp.gmail.com
 *  SMTP_PORT=465
 *  SMTP_USER=isabel.b@diebrudie.com
 *  SMTP_PASS=<Gmail App Password>
 *  FROM_EMAIL=noreply@volleysmart.app
 *  FROM_NAME="VolleySmart App"
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { writeAll } from "https://deno.land/std@0.177.0/streams/write_all.ts";

// --------- Polyfill for Deno 2 ----------
/**
 * Some third-party libs still call `Deno.writeAll`, which was removed in Deno 2.
 * We safely attach a polyfill using std/streams/write_all.
 */
try {
  (Deno as unknown as { writeAll?: typeof writeAll }).writeAll = writeAll;
} catch {
  // ignore if not allowed – runtime will still have the global polyfilled
}
// ----------------------------------------

/**
 * Dynamic import of the SMTP client *after* polyfilling writeAll.
 * Minimal interface to avoid `any`.
 */
interface ISmtpClient {
  connectTLS(options: {
    hostname: string;
    port: number;
    username: string;
    password: string;
  }): Promise<void>;
  send(options: {
    from: string;
    to: string;
    subject: string;
    content: string;
  }): Promise<void>;
  close(): Promise<void>;
}

const { SmtpClient } = await import("https://deno.land/x/smtp/mod.ts");
const SmtpCtor = SmtpClient as unknown as { new (): ISmtpClient };

// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

// ---- Types ----
interface Invite {
  name: string;
  email: string;
}
interface ClubInfo {
  id: string;
  name: string;
  joinCode: string;
}
interface RequestBody {
  invites: Invite[];
  clubInfo: ClubInfo;
}

// ---- Env ----
const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? 465); // SMTPS
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@volleysmart.app";
const FROM_NAME = Deno.env.get("FROM_NAME") ?? "VolleySmart App";

// ---- Helpers ----
const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function buildText(
  invite: Invite,
  club: ClubInfo
): { subject: string; text: string } {
  const joinUrl = `https://volleysmart.app/join/${club.joinCode}`;
  const subject = `You're invited to join ${club.name} on VolleySmart`;
  const text =
    `Hello ${invite.name || "there"},\n\n` +
    `You’ve been invited to join ${club.name} on VolleySmart.\n` +
    `Join using this link: ${joinUrl}\n\n` +
    `If you didn’t expect this, you can ignore this email.\n\n` +
    `— ${FROM_NAME}`;
  return { subject, text };
}

function hasSmtpSecrets(): boolean {
  return Boolean(
    SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && FROM_EMAIL && FROM_NAME
  );
}

// ---- Main handler ----
serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Auth
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

    // Parse + validate body
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
      typeof clubInfo.joinCode !== "string" ||
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
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Permission check
    const { data: clubRow, error: clubErr } = await supabase
      .from("clubs")
      .select("created_by")
      .eq("id", clubInfo.id)
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
        .eq("club_id", clubInfo.id)
        .eq("is_active", true)
        .eq("status", "active")
        .maybeSingle();

      const notAdmin = !!memberErr || !memberRow || memberRow.role !== "admin";
      if (notAdmin) {
        return new Response(
          JSON.stringify({
            error: "Not authorized to invite members to this club",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (!hasSmtpSecrets()) {
      return new Response(JSON.stringify({ error: "SMTP is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SMTPS 465
    const smtp: ISmtpClient = new SmtpCtor();
    await smtp.connectTLS({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASS,
    });

    const results: Array<{ email: string; ok: boolean; error?: string }> = [];
    for (const invite of invites) {
      try {
        const { subject, text } = buildText(
          invite as Invite,
          clubInfo as ClubInfo
        );
        await smtp.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: invite.email,
          subject,
          content: text, // plaintext for deliverability
        });
        results.push({ email: invite.email, ok: true });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        console.error("Invite send failed:", invite.email, message);
        results.push({ email: invite.email, ok: false, error: message });
      }
    }

    await smtp.close();

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({ success: failed === 0, sent, failed, results }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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

/**
 * notify-contact-submission
 * Sends an email to the team when a new contact form submission is inserted.
 * Triggered via database webhook on contact_submissions INSERT.
 *
 * Required secret: RESEND_API_KEY
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { buildEmailHtml, sendEmail } from "../_shared/emailTemplate.ts";

const NOTIFY_TO = "isabel.b@diebrudie.com";

const REASON_LABELS: Record<string, string> = {
  general_question: "General Question",
  account_support: "Account Support",
  report_bug: "Bug Report",
  feature_request: "Feature Request",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

interface ContactRecord {
  name: string;
  email: string;
  reason: string;
  message: string;
  attachment_url?: string | null;
  source?: string;
  created_at?: string;
}

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
      console.error("RESEND_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();

    // Support both webhook formats:
    // - Supabase DB webhook: { type: "INSERT", record: {...} }
    // - Direct call: { record: {...} }
    const record: ContactRecord = payload.record ?? payload;

    if (!record.name || !record.email || !record.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reasonLabel = REASON_LABELS[record.reason] ?? record.reason;

    const attachmentLine = record.attachment_url
      ? `<p style="margin:12px 0 0;"><strong>Attachment:</strong><br/>
         <a href="${escapeHtml(record.attachment_url)}" target="_blank" style="color:#1D4ED8;text-decoration:underline;">
           View attachment
         </a></p>`
      : "";

    const bodyHtml = `
      <p style="margin:0 0 12px;"><strong>From:</strong> ${escapeHtml(record.name)} &lt;${escapeHtml(record.email)}&gt;</p>
      <p style="margin:0 0 12px;"><strong>Reason:</strong> ${escapeHtml(reasonLabel)}</p>
      <p style="margin:0 0 4px;"><strong>Message:</strong></p>
      <p style="margin:0;padding:12px;background:#F9FAFB;border-radius:8px;white-space:pre-wrap;">${escapeHtml(record.message)}</p>
      ${attachmentLine}
      ${record.source ? `<p style="margin:12px 0 0;font-size:12px;color:#9CA3AF;">Source: ${escapeHtml(record.source)}</p>` : ""}
    `;

    const html = buildEmailHtml({
      heading: "New Contact Submission",
      bodyHtml,
      footerText: "This is an internal notification from the VolleySmart contact form.",
    });

    const subject = `New contact: ${reasonLabel} from ${record.name}`;

    const result = await sendEmail(RESEND_API_KEY, {
      to: NOTIFY_TO,
      subject,
      html,
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("notify-contact-submission error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

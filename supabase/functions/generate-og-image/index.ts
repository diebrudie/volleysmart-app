/**
 * generate-og-image
 * Generates dynamic OG preview images (1200x630 PNG) for shared event and club links.
 * Images are cached in the og-images storage bucket.
 *
 * GET ?type=event|club&id=<uuid>&lang=en|es|de
 *
 * Required secrets: SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import satori from "https://esm.sh/satori@0.12.1";
import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";
import { t, tPlural, type OgLang } from "../_shared/ogTranslations.ts";

const WIDTH = 1200;
const HEIGHT = 630;
const VALID_TYPES = ["event", "club"] as const;
const VALID_LANGS: OgLang[] = ["en", "es", "de"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BRAND_BLUE = "#1E3A8A";
const BRAND_YELLOW = "#FBBF24";
const BRAND_LIGHT_BG = "#F0F4FF";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6B7280";
const BADGE_BG = "#E0E7FF";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
} as const;

let fontData: ArrayBuffer | null = null;
let wasmInitialized = false;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  const resp = await fetch(
    "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
  );
  fontData = await resp.arrayBuffer();
  return fontData;
}

async function ensureWasm(): Promise<void> {
  if (wasmInitialized) return;
  try {
    const wasmModule = await fetch(
      "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
    );
    await initWasm(wasmModule);
    wasmInitialized = true;
  } catch (e) {
    if (e instanceof Error && e.message.includes("Already initialized")) {
      wasmInitialized = true;
      return;
    }
    throw e;
  }
}

function contentHash(updatedAt: string): string {
  let h = 0;
  for (let i = 0; i < updatedAt.length; i++) {
    h = ((h << 5) - h + updatedAt.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function formatDate(dateStr: string, lang: OgLang): string {
  const date = new Date(dateStr + "T00:00:00");
  const localeMap: Record<OgLang, string> = { en: "en-US", es: "es-ES", de: "de-DE" };
  return date.toLocaleDateString(localeMap[lang], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  return `${h}:${m}`;
}

function formatDeadline(deadlineStr: string, lang: OgLang): string {
  const date = new Date(deadlineStr);
  const localeMap: Record<OgLang, string> = { en: "en-US", es: "es-ES", de: "de-DE" };
  const formatted = date.toLocaleDateString(localeMap[lang], { month: "short", day: "numeric" });
  return t(lang, "rsvpBy", { date: formatted });
}

// Satori uses a React-like VDOM format: { type, props, children }
// We build it manually without JSX since we're in Deno.

function badge(text: string, bg = BADGE_BG, color = BRAND_BLUE) {
  return {
    type: "div",
    props: {
      style: {
        backgroundColor: bg,
        color,
        padding: "8px 20px",
        borderRadius: "24px",
        fontSize: "28px",
        fontWeight: 600,
      },
      children: text,
    },
  };
}

function infoRow(icon: string, text: string) {
  return {
    type: "div",
    props: {
      style: { display: "flex", alignItems: "center", gap: "12px" },
      children: [
        { type: "div", props: { style: { fontSize: "30px", minWidth: "36px" }, children: icon } },
        { type: "div", props: { style: { fontSize: "30px", color: TEXT_SECONDARY }, children: text } },
      ],
    },
  };
}

function buildEventImage(event: any, lang: OgLang) {
  const eventTypeLabel = t(lang, `eventType.${event.event_type}`);
  const activityLabel = t(lang, `activityType.${event.activity_type}`);
  const genderLabel = event.event_gender && event.event_gender !== "mixed"
    ? t(lang, `gender.${event.event_gender}`)
    : null;

  const dateFormatted = formatDate(event.date, lang);
  const timeFormatted = formatTime(event.start_time);
  const timeStr = event.end_time
    ? `${dateFormatted}  ·  ${timeFormatted} – ${formatTime(event.end_time)}`
    : `${dateFormatted}  ·  ${timeFormatted}`;

  const locationName = event.locations?.name ?? event.locations?.address ?? "";
  const clubName = event.clubs?.name ?? "";

  const badges = [
    badge(eventTypeLabel),
    badge(activityLabel, event.activity_type === "beach" ? "#FEF3C7" : BADGE_BG, event.activity_type === "beach" ? "#92400E" : BRAND_BLUE),
  ];
  if (genderLabel) {
    badges.push(badge(genderLabel, "#F3E8FF", "#7C3AED"));
  }

  const infoRows = [
    infoRow("📅", timeStr),
  ];
  if (locationName) infoRows.push(infoRow("📍", locationName));
  if (event.rsvp_deadline) infoRows.push(infoRow("⏰", formatDeadline(event.rsvp_deadline, lang)));

  return {
    type: "div",
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: BRAND_LIGHT_BG,
        padding: "48px 56px",
        fontFamily: "Inter",
      },
      children: [
        // Header: volleyball icon + club name (or VolleySmart fallback)
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" },
            children: [
              { type: "div", props: { style: { fontSize: "32px" }, children: "🏐" } },
              { type: "div", props: { style: { fontSize: "26px", fontWeight: 700, color: BRAND_BLUE }, children: clubName || "VolleySmart" } },
            ],
          },
        },
        // Divider
        { type: "div", props: { style: { height: "2px", backgroundColor: "#CBD5E1", marginBottom: "32px", width: "100%" }, children: "" } },
        // Title
        {
          type: "div",
          props: {
            style: {
              fontSize: "48px",
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: "20px",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxHeight: "120px",
            },
            children: event.title,
          },
        },
        // Badges row
        {
          type: "div",
          props: {
            style: { display: "flex", gap: "14px", marginBottom: "32px", flexWrap: "wrap" },
            children: badges,
          },
        },
        // Info rows
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "16px" },
            children: infoRows,
          },
        },
        // Bottom accent bar
        {
          type: "div",
          props: {
            style: {
              marginTop: "auto",
              height: "6px",
              backgroundColor: BRAND_YELLOW,
              borderRadius: "3px",
              width: "100%",
            },
            children: "",
          },
        },
      ],
    },
  };
}

function buildClubImage(club: any, memberCount: number, lang: OgLang) {
  const description = club.description
    ? club.description.length > 120
      ? club.description.slice(0, 117) + "..."
      : club.description
    : "";

  const locationParts = [club.city, club.country].filter(Boolean);
  const locationStr = locationParts.join(", ");
  const membersStr = tPlural(lang, "members", memberCount);

  const children: any[] = [
    // Header
    {
      type: "div",
      props: {
        style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
        children: [
          {
            type: "div",
            props: {
              style: { display: "flex", alignItems: "center", gap: "12px" },
              children: [
                { type: "div", props: { style: { fontSize: "32px" }, children: "🏐" } },
                { type: "div", props: { style: { fontSize: "24px", fontWeight: 700, color: BRAND_BLUE }, children: "VolleySmart" } },
              ],
            },
          },
          { type: "div", props: { children: "" } },
        ],
      },
    },
    // Divider
    { type: "div", props: { style: { height: "2px", backgroundColor: "#CBD5E1", marginBottom: "36px", width: "100%" }, children: "" } },
  ];

  // Club content area
  const contentChildren: any[] = [];

  // Club image (if available)
  if (club.image_url) {
    contentChildren.push({
      type: "img",
      props: {
        src: club.image_url,
        width: 120,
        height: 120,
        style: {
          borderRadius: "60px",
          objectFit: "cover",
          marginBottom: "24px",
        },
      },
    });
  }

  // Club name
  contentChildren.push({
    type: "div",
    props: {
      style: {
        fontSize: "52px",
        fontWeight: 700,
        color: TEXT_PRIMARY,
        marginBottom: "16px",
        lineHeight: 1.2,
        textAlign: "center",
      },
      children: club.name,
    },
  });

  // Description
  if (description) {
    contentChildren.push({
      type: "div",
      props: {
        style: {
          fontSize: "24px",
          color: TEXT_SECONDARY,
          marginBottom: "20px",
          textAlign: "center",
          maxWidth: "800px",
          lineHeight: 1.4,
        },
        children: description,
      },
    });
  }

  // Badges: location + members
  const clubBadges: any[] = [];
  if (locationStr) clubBadges.push(badge(`📍 ${locationStr}`));
  clubBadges.push(badge(`👥 ${membersStr}`));

  contentChildren.push({
    type: "div",
    props: {
      style: { display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" },
      children: clubBadges,
    },
  });

  children.push({
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
      },
      children: contentChildren,
    },
  });

  // Bottom accent bar
  children.push({
    type: "div",
    props: {
      style: {
        marginTop: "auto",
        height: "6px",
        backgroundColor: BRAND_YELLOW,
        borderRadius: "3px",
        width: "100%",
      },
      children: "",
    },
  });

  return {
    type: "div",
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: BRAND_LIGHT_BG,
        padding: "48px 56px",
        fontFamily: "Inter",
      },
      children,
    },
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") as typeof VALID_TYPES[number] | null;
    const id = url.searchParams.get("id");
    const rawLang = url.searchParams.get("lang") ?? "en";
    const baseLang = rawLang.split("-")[0] as OgLang;
    const lang = VALID_LANGS.includes(baseLang) ? baseLang : "en";

    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(JSON.stringify({ error: "type must be 'event' or 'club'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!id || !UUID_RE.test(id)) {
      return new Response(JSON.stringify({ error: "id must be a valid UUID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let vdom: any;
    let cacheKey: string;

    if (type === "event") {
      const { data: event, error } = await supabase
        .from("planned_events")
        .select("id, title, event_type, event_gender, activity_type, date, start_time, end_time, rsvp_deadline, updated_at, location_id, clubs:event_clubs(clubs(name)), locations(name, address)")
        .eq("id", id)
        .single();

      if (error || !event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Flatten the nested clubs join
      const clubRow = Array.isArray(event.clubs) && event.clubs.length > 0
        ? (event.clubs[0] as any)?.clubs
        : null;
      const flatEvent = { ...event, clubs: clubRow };

      cacheKey = `event-${id}-${lang}-${contentHash(event.updated_at)}`;
      vdom = buildEventImage(flatEvent, lang);
    } else {
      const { data: club, error } = await supabase
        .from("clubs")
        .select("id, name, image_url, description, city, country, updated_at: modified_at")
        .eq("id", id)
        .single();

      if (error || !club) {
        return new Response(JSON.stringify({ error: "Club not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { count } = await supabase
        .from("club_members")
        .select("id", { count: "exact", head: true })
        .eq("club_id", id)
        .eq("status", "active")
        .eq("is_active", true);

      cacheKey = `club-${id}-${lang}-${contentHash(club.updated_at ?? club.id)}`;
      vdom = buildClubImage(club, count ?? 0, lang);
    }

    // Check cache
    const storagePath = `${cacheKey}.png`;
    const { data: existingFile } = await supabase.storage
      .from("og-images")
      .createSignedUrl(storagePath, 60);

    if (existingFile?.signedUrl) {
      // Cached image exists — redirect to public URL
      const { data: publicUrlData } = supabase.storage
        .from("og-images")
        .getPublicUrl(storagePath);

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: publicUrlData.publicUrl,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Generate image
    const font = await loadFont();
    await ensureWasm();

    const svg = await satori(vdom, {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "Inter",
          data: font,
          weight: 400,
          style: "normal" as const,
        },
      ],
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width" as const, value: WIDTH },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Upload to storage
    await supabase.storage
      .from("og-images")
      .upload(storagePath, pngBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("generate-og-image error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

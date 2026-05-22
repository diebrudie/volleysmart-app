interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

interface EventContext {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

type PagesFunction<E> = (context: EventContext & { env: E }) => Promise<Response>;

const BOT_PATTERNS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
  "Applebot",
  "iMessageLinkPreview",
  "Googlebot",
  "bingbot",
];

const EVENT_RE = /^\/events\/([0-9a-f-]{36})$/;
const CLUB_RE = /^\/clubs\/([0-9a-f-]{36})$/;

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMetaHtml(opts: {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}): string {
  const t = escapeHtml(opts.title);
  const d = escapeHtml(opts.description);
  const img = escapeHtml(opts.imageUrl);
  const u = escapeHtml(opts.url);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${t}</title>
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${u}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />
</head>
<body></body>
</html>`;
}

type EventRow = {
  title: string;
  event_type: string;
  activity_type: string;
  date: string;
  start_time: string;
  locations: { name: string; address: string } | null;
};

type ClubRow = {
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
};

const EVENT_TYPE_LABELS: Record<string, Record<string, string>> = {
  en: { friendly_game: "Friendly Game", social_game: "Social Game", training: "Training", tournament: "Tournament" },
  es: { friendly_game: "Partido amistoso", social_game: "Partido social", training: "Entrenamiento", tournament: "Torneo" },
  de: { friendly_game: "Freundschaftsspiel", social_game: "Freizeitspiel", training: "Training", tournament: "Turnier" },
};

const ACTIVITY_LABELS: Record<string, Record<string, string>> = {
  en: { indoor: "Indoor", beach: "Beach" },
  es: { indoor: "Interior", beach: "Playa" },
  de: { indoor: "Halle", beach: "Beach" },
};

function formatDateForMeta(dateStr: string, lang: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const localeMap: Record<string, string> = { en: "en-US", es: "es-ES", de: "de-DE" };
  return date.toLocaleDateString(localeMap[lang] ?? "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const ua = context.request.headers.get("user-agent") ?? "";
  if (!isBot(ua)) {
    return context.next();
  }

  const url = new URL(context.request.url);
  const path = url.pathname;
  const lang = url.searchParams.get("lang") ?? "en";
  const validLang = ["en", "es", "de"].includes(lang) ? lang : "en";

  const eventMatch = path.match(EVENT_RE);
  const clubMatch = path.match(CLUB_RE);

  if (!eventMatch && !clubMatch) {
    return context.next();
  }

  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return context.next();
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    if (eventMatch) {
      const eventId = eventMatch[1];
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/planned_events?id=eq.${eventId}&select=title,event_type,activity_type,date,start_time,locations(name,address)`,
        { headers },
      );

      if (!resp.ok) return context.next();

      const rows = (await resp.json()) as EventRow[];
      if (!rows.length) return context.next();

      const event = rows[0];
      const typeLabel = EVENT_TYPE_LABELS[validLang]?.[event.event_type] ?? event.event_type;
      const activityLabel = ACTIVITY_LABELS[validLang]?.[event.activity_type] ?? event.activity_type;
      const dateFormatted = formatDateForMeta(event.date, validLang);
      const locationName = event.locations?.name ?? "";

      const descParts = [typeLabel, activityLabel, dateFormatted];
      if (locationName) descParts.push(locationName);
      const description = descParts.join(" · ");

      const ogImageUrl = `${supabaseUrl}/functions/v1/generate-og-image?type=event&id=${eventId}&lang=${validLang}`;

      return new Response(
        buildMetaHtml({
          title: event.title,
          description,
          imageUrl: ogImageUrl,
          url: `https://volleysmart.app/events/${eventId}`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        },
      );
    }

    if (clubMatch) {
      const clubId = clubMatch[1];
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/clubs?id=eq.${clubId}&select=name,description,city,country`,
        { headers },
      );

      if (!resp.ok) return context.next();

      const rows = (await resp.json()) as ClubRow[];
      if (!rows.length) return context.next();

      const club = rows[0];
      const descParts: string[] = [];
      if (club.description) {
        descParts.push(club.description.length > 150 ? club.description.slice(0, 147) + "..." : club.description);
      }
      const location = [club.city, club.country].filter(Boolean).join(", ");
      if (location) descParts.push(location);
      const description = descParts.join(" · ") || "Volleyball Club on VolleySmart";

      const ogImageUrl = `${supabaseUrl}/functions/v1/generate-og-image?type=club&id=${clubId}&lang=${validLang}`;

      return new Response(
        buildMetaHtml({
          title: club.name,
          description,
          imageUrl: ogImageUrl,
          url: `https://volleysmart.app/clubs/${clubId}`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        },
      );
    }
  } catch (e) {
    console.error("OG catchall error:", e);
  }

  return context.next();
};

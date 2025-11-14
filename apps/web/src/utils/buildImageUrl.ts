/**
 * buildImageUrl — attach Supabase image transform params to a public storage URL.
 * Defaults chosen for performance; override per-call when needed.
 */
export type ImageFormat = "webp" | "avif" | "jpg" | "png";

type Opts = {
  w?: number; // width in px
  h?: number; // optional height in px
  q?: number; // quality 1–100
  format?: ImageFormat;
};

export function buildImageUrl(url?: string | null, opts: Opts = {}): string {
  if (!url) return "";
  const u = new URL(url);

  // Sensible defaults: small & efficient unless overridden
  const w = opts.w ?? 720;
  const q = opts.q ?? 60;
  const format = opts.format ?? "avif";

  u.searchParams.set("width", String(w));
  u.searchParams.set("quality", String(q));
  u.searchParams.set("format", format);

  if (opts.h) u.searchParams.set("height", String(opts.h));
  return u.toString();
}

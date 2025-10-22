/**
 * buildImageUrl — attach Supabase image transform params to a public storage URL.
 * Works with: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * Supported params used here: width, height (optional), quality (1–100), format (webp|avif|jpg|png)
 */
export type ImageFormat = "webp" | "avif" | "jpg" | "png";
export function buildImageUrl(
  url?: string | null,
  opts?: { w?: number; h?: number; q?: number; format?: ImageFormat }
): string {
  if (!url) return "";
  const u = new URL(url);
  if (opts?.w) u.searchParams.set("width", String(opts.w));
  if (opts?.h) u.searchParams.set("height", String(opts.h));
  if (opts?.q) u.searchParams.set("quality", String(opts.q));
  if (opts?.format) u.searchParams.set("format", opts.format);
  return u.toString();
}

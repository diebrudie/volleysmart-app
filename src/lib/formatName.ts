/**
 * Formats "First Last" as "First L."
 */
export function formatFirstLastInitial(
  first?: string | null,
  last?: string | null
) {
  const f = (first || "").trim();
  const l = (last || "").trim();
  return l ? `${f} ${l.charAt(0)}.` : f || "Unknown";
}

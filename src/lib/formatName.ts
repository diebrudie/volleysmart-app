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

/**
 * formatShortName
 * - If first_name has spaces, use only the first token.
 * - Last name reduced to initial + period.
 * Examples:
 *   first="Isabel Cristina", last="Bruda Plasencia" -> "Isabel B."
 *   first="Alvaro", last="Garcia" -> "Alvaro G."
 */
export function formatShortName(
  first?: string | null,
  last?: string | null
): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const firstToken = f.split(/\s+/)[0] ?? "";
  const lastInitial = l ? `${l[0].toUpperCase()}.` : "";
  return [firstToken, lastInitial].filter(Boolean).join(" ").trim();
}

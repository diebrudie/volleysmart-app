/**
 * Canonical role normalization & ordering for team display and assignment.
 * IDs from your positions table are preserved for lookups.
 */
export type CanonicalRole =
  | "Setter"
  | "Middle Blocker"
  | "Opposite"
  | "Outside Hitter"
  | "Libero";

export const POSITION_IDS = {
  Setter: "e6981022-8728-4bdd-9d41-8e2a4ce0d8f7",
  "Outside Hitter": "8ef208ad-97bb-4ad1-b160-35de6c859ded",
  "Middle Blocker": "4caf345a-ede8-4c70-bfb7-202ee0595b5d",
  Libero: "68e09387-8118-4458-a6da-8c5e759fc0ab",
  Opposite: "bfd22850-f8c1-4eb5-90a7-879670dcd38c",
} as const;

/** Map any DB/display string to our canonical role */
export function normalizeRole(input?: string | null): CanonicalRole {
  const v = (input ?? "").trim();
  if (v === "Opposite") return "Opposite";
  if (v === "Setter") return "Setter";
  if (v === "Middle Blocker") return "Middle Blocker";
  if (v === "Outside Hitter") return "Outside Hitter";
  if (v === "Libero") return "Libero";
  // Safe default bucket so sorting is stable if data is odd
  return "Opposite";
}

/** Canonical display/alignment order for both teams */
export const CANONICAL_ORDER: Readonly<CanonicalRole[]> = [
  "Setter",
  "Middle Blocker",
  "Opposite",
  "Outside Hitter",
  "Libero",
] as const;

/** For sorting arrays of players by their assigned (normalized) role */
export function roleIndex(role: CanonicalRole): number {
  return CANONICAL_ORDER.indexOf(role);
}

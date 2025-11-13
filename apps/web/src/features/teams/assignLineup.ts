/**
 * Greedy lineup assignment with volleyball constraints.
 * Ideal 6: 1 Setter, 1 Opposite, 1 Middle Blocker, 2 Outside Hitters, 1 Libero (optional)
 * Fallback minimum: ensure ≥1 Setter, ≥1 Middle Blocker, ≥1 Outside Hitter.
 */
import type { CanonicalRole } from "./positions";
import { normalizeRole, CANONICAL_ORDER } from "./positions";

export type PlayerForAssignment = {
  id: string;
  first_name: string;
  last_name: string;
  gender?: string | null;
  skillRating?: number | null;
  // Primary first, then secondaries (strings from DB)
  eligiblePositions: string[];
};

export type Assigned = PlayerForAssignment & { assignedRole: CanonicalRole };

export function assignLineup(players: PlayerForAssignment[]): Assigned[] {
  const normalized = players.map((p) => ({
    ...p,
    prefers: p.eligiblePositions.map(normalizeRole),
  }));

  const assignments: Assigned[] = [];
  const available = new Set(normalized.map((p) => p.id));

  const takeForRole = (role: CanonicalRole, count: number) => {
    for (let k = 0; k < count; k++) {
      let bestIdx = -1;
      let bestScore = Number.POSITIVE_INFINITY; // lower is better
      for (let i = 0; i < normalized.length; i++) {
        const p = normalized[i];
        if (!available.has(p.id)) continue;
        const idx = p.prefers.indexOf(role);
        if (idx === -1) continue;
        if (idx < bestScore) {
          bestScore = idx;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        const p = normalized[bestIdx];
        assignments.push({ ...p, assignedRole: role });
        available.delete(p.id);
      } else {
        break; // can’t fill more of this role
      }
    }
  };

  // Ideal (6)
  takeForRole("Setter", 1);
  takeForRole("Opposite", 1);
  takeForRole("Middle Blocker", 1);
  takeForRole("Outside Hitter", 2);
  takeForRole("Libero", 1); // optional

  // Fallback minimum
  const ensureAtLeast = (role: CanonicalRole) => {
    if (!assignments.some((a) => a.assignedRole === role)) takeForRole(role, 1);
  };
  ensureAtLeast("Setter");
  ensureAtLeast("Middle Blocker");
  ensureAtLeast("Outside Hitter");

  // Fill up to 6 with best remaining preference
  for (const p of normalized) {
    if (assignments.length >= 6) break;
    if (!available.has(p.id)) continue;
    const chosen = p.prefers[0] ?? "Opposite";
    assignments.push({ ...p, assignedRole: chosen });
    available.delete(p.id);
  }

  assignments.sort(
    (a, b) =>
      CANONICAL_ORDER.indexOf(a.assignedRole) -
      CANONICAL_ORDER.indexOf(b.assignedRole)
  );
  return assignments;
}

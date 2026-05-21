/**
 * Team assignment utilities for VolleySmart.
 *
 * Two exports:
 *   assignLineup  — greedy single-team role assignment (used by TeamGenerator)
 *   assignTeams   — spec-compliant two-team split with score balancing (used by NewGame)
 */
import type { CanonicalRole } from "./positions";
import { normalizeRole, CANONICAL_ORDER } from "./positions";

// ─────────────────────────────────────────────────────────────────────────────
// Legacy: single-team greedy role assignment (kept for TeamGenerator compat)
// ─────────────────────────────────────────────────────────────────────────────

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
      let bestScore = Number.POSITIVE_INFINITY;
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
        break;
      }
    }
  };

  takeForRole("Setter", 1);
  takeForRole("Opposite", 1);
  takeForRole("Middle Blocker", 1);
  takeForRole("Outside Hitter", 2);
  takeForRole("Libero", 1);

  const ensureAtLeast = (role: CanonicalRole) => {
    if (!assignments.some((a) => a.assignedRole === role)) takeForRole(role, 1);
  };
  ensureAtLeast("Setter");
  ensureAtLeast("Middle Blocker");
  ensureAtLeast("Outside Hitter");

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

// ─────────────────────────────────────────────────────────────────────────────
// New: two-team split with spec-compliant position rules & score balancing
// ─────────────────────────────────────────────────────────────────────────────

export type PlayerForTeams = {
  id: string;
  /** Skill rating 1–100 */
  score: number;
  mainPosition: CanonicalRole;
  secondaryPositions?: CanonicalRole[];
  gender?: string | null;
  name?: string | null;
};

export type AssignedPlayer = {
  id: string;
  assignedPosition: CanonicalRole;
  /** How the slot was filled */
  assignedVia: "primary" | "secondary" | "fallback";
  team: "team_a" | "team_b";
};

export type TeamAssignmentResult = {
  teamA: AssignedPlayer[];
  teamB: AssignedPlayer[];
  analysis: {
    teamAScore: number;
    teamBScore: number;
    scoreDiff: number;
    /** null when one or both teams lack that position */
    setterScoreDiff: number | null;
    mbScoreDiff: number | null;
    ohScoreDiff: number | null;
    genderA: { male: number; female: number; other: number };
    genderB: { male: number; female: number; other: number };
  };
  /** Hard rule breaks — surface to user before saving */
  violations: string[];
  /** Soft misses — append to success toast */
  compromises: string[];
};

// Position requirements per team size (applied to EACH team)
const POSITION_REQUIREMENTS: Record<
  2 | 3 | 4 | 5 | 6,
  { required: CanonicalRole[]; optional: CanonicalRole[] }
> = {
  2: { required: ["Setter"], optional: ["Outside Hitter"] },
  3: { required: ["Setter", "Middle Blocker", "Outside Hitter"], optional: [] },
  4: {
    required: ["Setter", "Middle Blocker", "Outside Hitter"],
    optional: ["Middle Blocker"],
  },
  5: {
    required: ["Setter", "Middle Blocker", "Middle Blocker", "Outside Hitter"],
    optional: ["Opposite"],
  },
  6: {
    required: [
      "Setter",
      "Middle Blocker",
      "Middle Blocker",
      "Outside Hitter",
      "Outside Hitter",
      "Opposite",
    ],
    optional: ["Libero"],
  },
};

// Assignment priority: mandatory roles first, then optional
const FILL_PRIORITY: CanonicalRole[] = [
  "Setter",
  "Middle Blocker",
  "Outside Hitter",
  "Opposite",
  "Libero",
];

/**
 * Splits `players` into two balanced teams following the spec priority:
 *   1. Position rules per team size (Setter + MB mandatory)
 *   2. Score balance within position groups (stronger-to-weaker heuristic)
 *   3. Secondary position fallback when primary pool is exhausted
 *   4. Last-resort fallback (any player, any slot)
 *   5. Same-position swap optimisation for total score balance (±5 pt target)
 *
 * Never throws — always returns a best-effort result plus violations/compromises.
 */
export function assignTeams(players: PlayerForTeams[]): TeamAssignmentResult {
  const violations: string[] = [];
  const compromises: string[] = [];

  if (players.length < 2) {
    return {
      teamA: [],
      teamB: [],
      analysis: {
        teamAScore: 0,
        teamBScore: 0,
        scoreDiff: 0,
        setterScoreDiff: null,
        mbScoreDiff: null,
        ohScoreDiff: null,
        genderA: { male: 0, female: 0, other: 0 },
        genderB: { male: 0, female: 0, other: 0 },
      },
      violations: ["Need at least 2 players to form teams"],
      compromises: [],
    };
  }

  const n = players.length;
  const sizeA = Math.ceil(n / 2);
  const sizeB = n - sizeA;

  // Clamp to supported range 2–6 (≥7 falls back to 6-player rules + overflow)
  const reqKey = (Math.min(Math.max(sizeA, 2), 6)) as 2 | 3 | 4 | 5 | 6;
  const req = POSITION_REQUIREMENTS[reqKey];

  // Build ordered slot lists for each team from requirements
  const allSlots: CanonicalRole[] = [...req.required, ...req.optional];
  const slotsA: CanonicalRole[] = allSlots.slice(0, sizeA);
  const slotsB: CanonicalRole[] = allSlots.slice(0, sizeB);

  // Count demand per position per team
  const tally = (slots: CanonicalRole[]) => {
    const m = new Map<CanonicalRole, number>();
    for (const s of slots) m.set(s, (m.get(s) ?? 0) + 1);
    return m;
  };
  const demandA = tally(slotsA);
  const demandB = tally(slotsB);

  const teamA: AssignedPlayer[] = [];
  const teamB: AssignedPlayer[] = [];
  const pool = new Map(players.map((p) => [p.id, p]));
  let scoreA = 0;
  let scoreB = 0;

  const place = (
    player: PlayerForTeams,
    team: "team_a" | "team_b",
    position: CanonicalRole,
    via: AssignedPlayer["assignedVia"]
  ) => {
    (team === "team_a" ? teamA : teamB).push({
      id: player.id,
      assignedPosition: position,
      assignedVia: via,
      team,
    });
    if (team === "team_a") scoreA += player.score;
    else scoreB += player.score;
    pool.delete(player.id);
  };

  const filledA = (pos: CanonicalRole) =>
    teamA.filter((p) => p.assignedPosition === pos).length;
  const filledB = (pos: CanonicalRole) =>
    teamB.filter((p) => p.assignedPosition === pos).length;

  const remainA = (pos: CanonicalRole) =>
    Math.max(0, (demandA.get(pos) ?? 0) - filledA(pos));
  const remainB = (pos: CanonicalRole) =>
    Math.max(0, (demandB.get(pos) ?? 0) - filledB(pos));

  /**
   * Fill `position` slots for both teams from `candidates`.
   * Uses the stronger-to-weaker heuristic: next player goes to the team
   * with the lower running score total (respecting remaining slot counts).
   */
  const fillPosition = (
    position: CanonicalRole,
    via: AssignedPlayer["assignedVia"],
    candidates: PlayerForTeams[]
  ) => {
    const needA = remainA(position);
    const needB = remainB(position);
    if (needA === 0 && needB === 0) return;

    const available = candidates
      .filter((p) => pool.has(p.id))
      .sort((a, b) => b.score - a.score);

    let usedA = 0;
    let usedB = 0;

    for (const candidate of available) {
      if (usedA >= needA && usedB >= needB) break;
      const canA = usedA < needA;
      const canB = usedB < needB;
      let team: "team_a" | "team_b";
      if (canA && canB) {
        // Stronger-to-weaker: give next player to the team that needs more help
        team = scoreA <= scoreB ? "team_a" : "team_b";
      } else {
        team = canA ? "team_a" : "team_b";
      }
      place(candidate, team, position, via);
      if (team === "team_a") usedA++;
      else usedB++;
    }
  };

  // ── Second Setter Rule ────────────────────────────────────────────────────
  // ≥ 3 setters: assign top 2 to setter slots (1 per team), remaining setters
  // fill Opposite slots on whichever team has lower running score.
  const allSettersSorted = players
    .filter((p) => p.mainPosition === "Setter")
    .sort((a, b) => b.score - a.score);
  const secondSetterRule = allSettersSorted.length >= 3;

  if (secondSetterRule) {
    fillPosition("Setter", "primary", allSettersSorted.slice(0, 2));
    // Extra setters fill OP slots
    for (const setter of allSettersSorted.slice(2)) {
      if (!pool.has(setter.id)) continue;
      const opNeedA = remainA("Opposite");
      const opNeedB = remainB("Opposite");
      if (opNeedA === 0 && opNeedB === 0) break;
      const team: "team_a" | "team_b" =
        opNeedA > 0 && (opNeedB === 0 || scoreA <= scoreB) ? "team_a" : "team_b";
      place(setter, team, "Opposite", "primary");
    }
    compromises.push(
      "Second setter rule applied: extra setter(s) assigned to Opposite slot"
    );
  }

  // ── Phase 1–3: Per-position primary then secondary fill ──────────────────
  // Interleaving primary + secondary within each position ensures a player
  // whose secondary matches a higher-priority slot is used there before
  // being consumed as a primary in a lower-priority slot.
  for (const position of FILL_PRIORITY) {
    if (position === "Setter" && secondSetterRule) {
      // Setter slots already filled above; only run secondary in case any gap
      fillPosition(
        position,
        "secondary",
        players.filter((p) => p.secondaryPositions?.includes(position))
      );
      continue;
    }
    // Primary pass
    fillPosition(
      position,
      "primary",
      players.filter((p) => p.mainPosition === position)
    );
    // Secondary pass for remaining slots in this position group
    fillPosition(
      position,
      "secondary",
      players.filter((p) => p.secondaryPositions?.includes(position))
    );
  }

  // ── Phase 4: Last-resort fallback (any remaining player, any open slot) ──
  for (const position of FILL_PRIORITY) {
    const needA = remainA(position);
    const needB = remainB(position);
    if (needA === 0 && needB === 0) continue;

    const fallbacks = [...pool.values()].sort((a, b) => b.score - a.score);
    let usedA = 0;
    let usedB = 0;
    for (const candidate of fallbacks) {
      if (usedA >= needA && usedB >= needB) break;
      const canA = usedA < needA;
      const canB = usedB < needB;
      const team: "team_a" | "team_b" =
        canA && (!canB || scoreA <= scoreB) ? "team_a" : "team_b";
      place(candidate, team, candidate.mainPosition, "fallback");
      if (team === "team_a") usedA++;
      else usedB++;
    }
  }

  // Any overflow players left in the pool (shouldn't happen with correct slot math)
  for (const player of pool.values()) {
    const team: "team_a" | "team_b" = scoreA <= scoreB ? "team_a" : "team_b";
    place(player, team, player.mainPosition, "fallback");
  }

  // ── Phase 5: Same-position swap optimisation ──────────────────────────────
  // Iteratively swap players in the same position between teams if doing so
  // reduces the total score difference. Stops when diff ≤ 5 or no swap helps.
  const playerById = new Map(players.map((p) => [p.id, p]));
  let improved = true;
  while (improved && Math.abs(scoreA - scoreB) > 5) {
    improved = false;
    outer: for (let i = 0; i < teamA.length; i++) {
      for (let j = 0; j < teamB.length; j++) {
        const pa = teamA[i];
        const pb = teamB[j];
        if (pa.assignedPosition !== pb.assignedPosition) continue;
        const pdA = playerById.get(pa.id);
        const pdB = playerById.get(pb.id);
        if (!pdA || !pdB) continue;
        const newDiff = Math.abs(
          scoreA - pdA.score + pdB.score - (scoreB - pdB.score + pdA.score)
        );
        if (newDiff < Math.abs(scoreA - scoreB)) {
          scoreA = scoreA - pdA.score + pdB.score;
          scoreB = scoreB - pdB.score + pdA.score;
          teamA[i] = { ...pb, team: "team_a" };
          teamB[j] = { ...pa, team: "team_b" };
          improved = true;
          break outer;
        }
      }
    }
  }

  // ── Phase 6: Gender balance swap ───────────────────────────────────────────
  // Swap same-position players between teams to reduce gender imbalance,
  // but only if it doesn't worsen the score diff by more than 15 points.
  const countGender = (team: AssignedPlayer[], g: string) =>
    team.filter((p) => (playerById.get(p.id)?.gender ?? "other") === g).length;

  const genderImbalance = () => {
    const femA = countGender(teamA, "female");
    const femB = countGender(teamB, "female");
    return Math.abs(femA - femB);
  };

  let genderImproved = true;
  while (genderImproved && genderImbalance() > 1) {
    genderImproved = false;
    const currentScoreDiff = Math.abs(scoreA - scoreB);
    genderOuter: for (let i = 0; i < teamA.length; i++) {
      for (let j = 0; j < teamB.length; j++) {
        const pa = teamA[i];
        const pb = teamB[j];
        if (pa.assignedPosition !== pb.assignedPosition) continue;
        const pdA = playerById.get(pa.id);
        const pdB = playerById.get(pb.id);
        if (!pdA || !pdB) continue;
        if ((pdA.gender ?? "other") === (pdB.gender ?? "other")) continue;

        const newScoreA = scoreA - pdA.score + pdB.score;
        const newScoreB = scoreB - pdB.score + pdA.score;
        const newScoreDiff = Math.abs(newScoreA - newScoreB);
        if (newScoreDiff > currentScoreDiff + 15) continue;

        const femABefore = countGender(teamA, "female");
        const femBBefore = countGender(teamB, "female");
        const gA = pdA.gender ?? "other";
        const gB = pdB.gender ?? "other";
        const femAAfter = femABefore + (gB === "female" ? 1 : 0) - (gA === "female" ? 1 : 0);
        const femBAfter = femBBefore + (gA === "female" ? 1 : 0) - (gB === "female" ? 1 : 0);
        if (Math.abs(femAAfter - femBAfter) < Math.abs(femABefore - femBBefore)) {
          scoreA = newScoreA;
          scoreB = newScoreB;
          teamA[i] = { ...pb, team: "team_a" };
          teamB[j] = { ...pa, team: "team_b" };
          genderImproved = true;
          break genderOuter;
        }
      }
    }
  }

  // ── Position quality checks (all soft — never block team creation) ────────
  const uniqueRequiredPositions = new Map<CanonicalRole, number>();
  for (const pos of req.required) {
    uniqueRequiredPositions.set(pos, (uniqueRequiredPositions.get(pos) ?? 0) + 1);
  }
  for (const [pos, minCount] of uniqueRequiredPositions) {
    const actualMinA = Math.min(minCount, demandA.get(pos) ?? 0);
    const actualMinB = Math.min(minCount, demandB.get(pos) ?? 0);
    const qualifiedA = teamA.filter(
      (p) => p.assignedPosition === pos && p.assignedVia !== "fallback"
    ).length;
    const qualifiedB = teamB.filter(
      (p) => p.assignedPosition === pos && p.assignedVia !== "fallback"
    ).length;
    if (qualifiedA < actualMinA) {
      compromises.push(
        `Team A has no dedicated ${pos} — slot filled from another position`
      );
    }
    if (qualifiedB < actualMinB) {
      compromises.push(
        `Team B has no dedicated ${pos} — slot filled from another position`
      );
    }
  }

  if (Math.abs(scoreA - scoreB) > 10) {
    compromises.push(
      `Score gap of ${Math.abs(scoreA - scoreB)} pts exceeds 10-pt target` +
        ` (A: ${scoreA}, B: ${scoreB})`
    );
  }

  const genderDiff = genderImbalance();
  if (genderDiff > 1) {
    compromises.push(
      `Gender imbalance: ${countGender(teamA, "female")}F/${countGender(teamA, "male")}M vs ${countGender(teamB, "female")}F/${countGender(teamB, "male")}M`
    );
  }

  // ── Analysis ──────────────────────────────────────────────────────────────
  const posScore = (team: AssignedPlayer[], pos: CanonicalRole): number =>
    team
      .filter((p) => p.assignedPosition === pos)
      .reduce((sum, p) => sum + (playerById.get(p.id)?.score ?? 0), 0);

  const hasRole = (team: AssignedPlayer[], pos: CanonicalRole) =>
    team.some((p) => p.assignedPosition === pos);

  const tallyGender = (team: AssignedPlayer[]) => ({
    male: countGender(team, "male"),
    female: countGender(team, "female"),
    other: team.length - countGender(team, "male") - countGender(team, "female"),
  });

  // ── Debug log ────────────────────────────────────────────────────────────
  const LOG_ORDER: CanonicalRole[] = ["Setter", "Middle Blocker", "Outside Hitter", "Opposite", "Libero"];
  const logTeam = (label: string, team: AssignedPlayer[], total: number) => {
    const sorted = [...team].sort(
      (a, b) => LOG_ORDER.indexOf(a.assignedPosition) - LOG_ORDER.indexOf(b.assignedPosition)
    );
    const lines = sorted.map((ap) => {
      const p = playerById.get(ap.id);
      return `  ${p?.name ?? ap.id} - ${ap.assignedPosition} - ${p?.score ?? "?"}`;
    });
    console.log(`\n${label} - Total Score ${total}\n${lines.join("\n")}`);
  };
  logTeam("Team A", teamA, scoreA);
  logTeam("Team B", teamB, scoreB);

  return {
    teamA,
    teamB,
    analysis: {
      teamAScore: scoreA,
      teamBScore: scoreB,
      scoreDiff: Math.abs(scoreA - scoreB),
      setterScoreDiff:
        hasRole(teamA, "Setter") && hasRole(teamB, "Setter")
          ? Math.abs(posScore(teamA, "Setter") - posScore(teamB, "Setter"))
          : null,
      mbScoreDiff:
        hasRole(teamA, "Middle Blocker") && hasRole(teamB, "Middle Blocker")
          ? Math.abs(
              posScore(teamA, "Middle Blocker") -
                posScore(teamB, "Middle Blocker")
            )
          : null,
      ohScoreDiff:
        hasRole(teamA, "Outside Hitter") && hasRole(teamB, "Outside Hitter")
          ? Math.abs(
              posScore(teamA, "Outside Hitter") -
                posScore(teamB, "Outside Hitter")
            )
          : null,
      genderA: tallyGender(teamA),
      genderB: tallyGender(teamB),
    },
    violations,
    compromises,
  };
}

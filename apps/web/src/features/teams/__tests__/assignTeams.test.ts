import { describe, it, expect } from "vitest";
import { assignTeams } from "../assignLineup";
import type { PlayerForTeams, AssignedPlayer } from "../assignLineup";
import type { CanonicalRole } from "../positions";

// ── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
const mkPlayer = (
  mainPosition: CanonicalRole,
  score: number,
  secondaryPosition?: CanonicalRole
): PlayerForTeams => ({
  id: `p${++_id}`,
  score,
  mainPosition,
  secondaryPosition,
});

const positionsOf = (team: AssignedPlayer[]) =>
  team.map((p) => p.assignedPosition).sort();

const ids = (team: AssignedPlayer[]) => new Set(team.map((p) => p.id));

const totalScore = (players: PlayerForTeams[], team: AssignedPlayer[]) => {
  const byId = new Map(players.map((p) => [p.id, p.score]));
  return team.reduce((s, p) => s + (byId.get(p.id) ?? 0), 0);
};

beforeEach(() => {
  _id = 0;
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("returns violation for fewer than 2 players", () => {
    const result = assignTeams([mkPlayer("Setter", 80)]);
    expect(result.violations).toContain(
      "Need at least 2 players to form teams"
    );
    expect(result.teamA).toHaveLength(0);
    expect(result.teamB).toHaveLength(0);
  });

  it("splits 2 players into 1v1 with a setter", () => {
    const players = [mkPlayer("Setter", 90), mkPlayer("Outside Hitter", 70)];
    const result = assignTeams(players);
    expect(result.teamA).toHaveLength(1);
    expect(result.teamB).toHaveLength(1);
    expect(result.violations).toHaveLength(0);
  });

  it("assigns all players — no player is lost", () => {
    const players = [
      mkPlayer("Setter", 80),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Outside Hitter", 65),
      mkPlayer("Setter", 70),
      mkPlayer("Middle Blocker", 60),
      mkPlayer("Outside Hitter", 55),
    ];
    const result = assignTeams(players);
    const allAssigned = new Set([
      ...result.teamA.map((p) => p.id),
      ...result.teamB.map((p) => p.id),
    ]);
    expect(allAssigned.size).toBe(players.length);
  });

  it("no player appears in both teams", () => {
    const players = Array.from({ length: 12 }, (_, i) =>
      mkPlayer("Outside Hitter", 50 + i)
    );
    const result = assignTeams(players);
    const idSetA = ids(result.teamA);
    const idSetB = ids(result.teamB);
    for (const id of idSetA) expect(idSetB.has(id)).toBe(false);
  });
});

// ── 3v3 ──────────────────────────────────────────────────────────────────────

describe("3v3", () => {
  it("each team gets Setter, MB, OH", () => {
    const players = [
      mkPlayer("Setter", 85),
      mkPlayer("Setter", 75),
      mkPlayer("Middle Blocker", 80),
      mkPlayer("Middle Blocker", 70),
      mkPlayer("Outside Hitter", 65),
      mkPlayer("Outside Hitter", 60),
    ];
    const result = assignTeams(players);
    expect(result.violations).toHaveLength(0);
    expect(positionsOf(result.teamA)).toEqual(
      ["Middle Blocker", "Outside Hitter", "Setter"].sort()
    );
    expect(positionsOf(result.teamB)).toEqual(
      ["Middle Blocker", "Outside Hitter", "Setter"].sort()
    );
  });

  it("produces no violation when all positions present", () => {
    const players = [
      mkPlayer("Setter", 80),
      mkPlayer("Setter", 70),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Middle Blocker", 65),
      mkPlayer("Outside Hitter", 60),
      mkPlayer("Outside Hitter", 55),
    ];
    expect(assignTeams(players).violations).toHaveLength(0);
  });
});

// ── 6v6 ──────────────────────────────────────────────────────────────────────

describe("6v6", () => {
  const make6v6Players = () => [
    mkPlayer("Setter", 90),
    mkPlayer("Setter", 80),
    mkPlayer("Middle Blocker", 85),
    mkPlayer("Middle Blocker", 75),
    mkPlayer("Middle Blocker", 70),
    mkPlayer("Middle Blocker", 65),
    mkPlayer("Outside Hitter", 78),
    mkPlayer("Outside Hitter", 68),
    mkPlayer("Outside Hitter", 58),
    mkPlayer("Outside Hitter", 55),
    mkPlayer("Opposite", 72),
    mkPlayer("Opposite", 62),
  ];

  it("no violations with correct 6v6 pool", () => {
    expect(assignTeams(make6v6Players()).violations).toHaveLength(0);
  });

  it("teams are equal size (6 each)", () => {
    const result = assignTeams(make6v6Players());
    expect(result.teamA).toHaveLength(6);
    expect(result.teamB).toHaveLength(6);
  });

  it("each team gets required positions", () => {
    const result = assignTeams(make6v6Players());
    for (const team of [result.teamA, result.teamB]) {
      const pos = positionsOf(team);
      expect(pos.filter((p) => p === "Setter")).toHaveLength(1);
      expect(pos.filter((p) => p === "Middle Blocker")).toHaveLength(2);
      expect(pos.filter((p) => p === "Outside Hitter")).toHaveLength(2);
      expect(pos.filter((p) => p === "Opposite")).toHaveLength(1);
    }
  });

  it("score difference does not exceed 10 for balanced pool", () => {
    const result = assignTeams(make6v6Players());
    expect(result.analysis.scoreDiff).toBeLessThanOrEqual(10);
  });
});

// ── Score balance (stronger-to-weaker heuristic) ─────────────────────────────

describe("score balance", () => {
  it("stronger-to-weaker heuristic reduces score gap vs naive snake draft", () => {
    // Snake draft per position always gives best players to Team A:
    //   Setters: A gets 90, B gets 70
    //   MBs:     A gets 80, B gets 60
    //   OHs:     A gets 70, 50; B gets 65, 55
    // assignTeams should do better by routing each new player to the weaker team
    const players = [
      mkPlayer("Setter", 90),
      mkPlayer("Setter", 70),
      mkPlayer("Middle Blocker", 80),
      mkPlayer("Middle Blocker", 60),
      mkPlayer("Outside Hitter", 70),
      mkPlayer("Outside Hitter", 65),
      mkPlayer("Outside Hitter", 55),
      mkPlayer("Outside Hitter", 50),
    ];
    const result = assignTeams(players);
    // Compute sum for each team
    const sA = totalScore(players, result.teamA);
    const sB = totalScore(players, result.teamB);
    expect(Math.abs(sA - sB)).toBeLessThanOrEqual(15); // generous bound
  });

  it("analysis fields reflect actual totals", () => {
    const players = [
      mkPlayer("Setter", 80),
      mkPlayer("Setter", 70),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Middle Blocker", 65),
      mkPlayer("Outside Hitter", 60),
      mkPlayer("Outside Hitter", 55),
    ];
    const result = assignTeams(players);
    const sA = totalScore(players, result.teamA);
    const sB = totalScore(players, result.teamB);
    expect(result.analysis.teamAScore).toBe(sA);
    expect(result.analysis.teamBScore).toBe(sB);
    expect(result.analysis.scoreDiff).toBe(Math.abs(sA - sB));
  });
});

// ── Second setter rule ────────────────────────────────────────────────────────

describe("second setter rule", () => {
  it("fires when there are 3+ setters", () => {
    const players = [
      mkPlayer("Setter", 90),
      mkPlayer("Setter", 80),
      mkPlayer("Setter", 70), // 3rd setter triggers rule
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Middle Blocker", 65),
      mkPlayer("Outside Hitter", 60),
      mkPlayer("Outside Hitter", 55),
      mkPlayer("Outside Hitter", 50),
      mkPlayer("Outside Hitter", 45),
      mkPlayer("Opposite", 68),
      mkPlayer("Opposite", 58),
      mkPlayer("Middle Blocker", 62),
    ];
    const result = assignTeams(players);
    expect(
      result.compromises.some((c) => c.includes("Second setter rule"))
    ).toBe(true);
  });

  it("does NOT fire with exactly 2 setters", () => {
    const players = [
      mkPlayer("Setter", 85),
      mkPlayer("Setter", 75),
      mkPlayer("Middle Blocker", 80),
      mkPlayer("Middle Blocker", 70),
      mkPlayer("Outside Hitter", 65),
      mkPlayer("Outside Hitter", 60),
    ];
    const result = assignTeams(players);
    expect(
      result.compromises.some((c) => c.includes("Second setter rule"))
    ).toBe(false);
  });

  it("extra setter is assigned to Opposite slot, not a Setter slot", () => {
    const players = [
      mkPlayer("Setter", 90),
      mkPlayer("Setter", 80),
      mkPlayer("Setter", 70),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Middle Blocker", 65),
      mkPlayer("Outside Hitter", 60),
      mkPlayer("Outside Hitter", 55),
      mkPlayer("Outside Hitter", 50),
      mkPlayer("Outside Hitter", 45),
      mkPlayer("Opposite", 68),
      mkPlayer("Middle Blocker", 62),
      mkPlayer("Middle Blocker", 58),
    ];
    const result = assignTeams(players);
    // Each team should have exactly 1 Setter slot (the 3rd setter fills OP)
    expect(
      result.teamA.filter((p) => p.assignedPosition === "Setter").length
    ).toBe(1);
    expect(
      result.teamB.filter((p) => p.assignedPosition === "Setter").length
    ).toBe(1);
  });
});

// ── Missing positions become compromises (never block team creation) ─────────

describe("position shortage handling", () => {
  it("team creation succeeds even with no setters — reports compromise", () => {
    const players = [
      mkPlayer("Outside Hitter", 80),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Outside Hitter", 70),
      mkPlayer("Middle Blocker", 65),
      mkPlayer("Outside Hitter", 60),
      mkPlayer("Outside Hitter", 55),
    ];
    const result = assignTeams(players);
    // No hard violation — teams are still formed
    expect(result.violations).toHaveLength(0);
    expect(result.teamA.length + result.teamB.length).toBe(players.length);
    // Shortage is reported as a compromise
    expect(result.compromises.some((c) => c.includes("Setter"))).toBe(true);
  });

  it("team creation succeeds with no MBs for 3v3 — reports compromise", () => {
    const players = [
      mkPlayer("Setter", 80),
      mkPlayer("Setter", 70),
      mkPlayer("Outside Hitter", 65),
      mkPlayer("Outside Hitter", 60),
      mkPlayer("Outside Hitter", 55),
      mkPlayer("Outside Hitter", 50),
    ];
    const result = assignTeams(players);
    expect(result.violations).toHaveLength(0);
    expect(result.teamA.length + result.teamB.length).toBe(players.length);
    expect(result.compromises.some((c) => c.includes("Middle Blocker"))).toBe(true);
  });

  it("no compromise when secondary position covers the gap", () => {
    // Only 1 dedicated setter; one OH has Setter as secondary
    const players = [
      mkPlayer("Setter", 80),
      mkPlayer("Outside Hitter", 70, "Setter"),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Middle Blocker", 65),
      mkPlayer("Outside Hitter", 60),
      mkPlayer("Outside Hitter", 55),
    ];
    const result = assignTeams(players);
    expect(result.violations).toHaveLength(0);
    // Secondary fill is qualified — no compromise about missing Setter
    expect(result.compromises.some((c) => c.includes("Setter"))).toBe(false);
  });
});

// ── Secondary position fallback ───────────────────────────────────────────────

describe("secondary position fallback", () => {
  it("uses secondary position when primary pool is exhausted", () => {
    // Only 1 real Setter; 1 OH has secondary Setter
    const players = [
      mkPlayer("Setter", 85),
      mkPlayer("Outside Hitter", 75, "Setter"),
      mkPlayer("Middle Blocker", 80),
      mkPlayer("Middle Blocker", 70),
      mkPlayer("Outside Hitter", 65),
      mkPlayer("Outside Hitter", 60),
    ];
    const result = assignTeams(players);
    const secondarySetters = [...result.teamA, ...result.teamB].filter(
      (p) => p.assignedPosition === "Setter" && p.assignedVia === "secondary"
    );
    expect(secondarySetters.length).toBeGreaterThan(0);
  });

  it("marks players correctly as 'secondary' via", () => {
    const players = [
      mkPlayer("Setter", 80),
      mkPlayer("Outside Hitter", 70, "Setter"),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Middle Blocker", 65),
      mkPlayer("Outside Hitter", 60),
      mkPlayer("Outside Hitter", 55),
    ];
    const result = assignTeams(players);
    const all = [...result.teamA, ...result.teamB];
    const sec = all.filter((p) => p.assignedVia === "secondary");
    expect(sec.length).toBeGreaterThan(0);
  });
});

// ── Opposite shortage ─────────────────────────────────────────────────────────

describe("opposite shortage", () => {
  it("handles 0 Opposite players in 6v6 via fallback", () => {
    const players = [
      mkPlayer("Setter", 90),
      mkPlayer("Setter", 80),
      mkPlayer("Middle Blocker", 85),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Middle Blocker", 70),
      mkPlayer("Middle Blocker", 65),
      mkPlayer("Outside Hitter", 78),
      mkPlayer("Outside Hitter", 68),
      mkPlayer("Outside Hitter", 58),
      mkPlayer("Outside Hitter", 55),
      mkPlayer("Outside Hitter", 52),
      mkPlayer("Outside Hitter", 50),
    ];
    const result = assignTeams(players);
    // No violations expected — fallback should fill OP slots
    // (violations only fire if required positions unfilled after ALL phases)
    expect(result.teamA).toHaveLength(6);
    expect(result.teamB).toHaveLength(6);
    // Both teams have some player in Opposite slot
    expect(
      result.teamA.some((p) => p.assignedPosition === "Opposite")
    ).toBe(true);
    expect(
      result.teamB.some((p) => p.assignedPosition === "Opposite")
    ).toBe(true);
  });
});

// ── Score analysis fields ─────────────────────────────────────────────────────

describe("analysis fields", () => {
  it("setterScoreDiff is null when one team has no setter", () => {
    // Force a situation where one team can't get a setter
    const players = [
      mkPlayer("Setter", 80),
      mkPlayer("Outside Hitter", 70),
    ];
    const result = assignTeams(players);
    // One team has the setter, the other doesn't
    const hasSetterA = result.teamA.some((p) => p.assignedPosition === "Setter");
    const hasSetterB = result.teamB.some((p) => p.assignedPosition === "Setter");
    if (!hasSetterA || !hasSetterB) {
      expect(result.analysis.setterScoreDiff).toBeNull();
    }
  });

  it("scoreDiff equals |teamAScore - teamBScore|", () => {
    const players = [
      mkPlayer("Setter", 90),
      mkPlayer("Setter", 80),
      mkPlayer("Middle Blocker", 85),
      mkPlayer("Middle Blocker", 75),
      mkPlayer("Outside Hitter", 70),
      mkPlayer("Outside Hitter", 60),
    ];
    const result = assignTeams(players);
    expect(result.analysis.scoreDiff).toBe(
      Math.abs(result.analysis.teamAScore - result.analysis.teamBScore)
    );
  });
});

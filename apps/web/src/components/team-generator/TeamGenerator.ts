import {
  TeamGenerationConfig,
  TeamSuggestion,
  PlayerWithPositions,
  GeneratedTeam,
} from "./types";
import { normalizeRole, CANONICAL_ORDER } from "../../features/teams/positions";
import type { CanonicalRole } from "../../features/teams/positions";

type TeamPair = {
  teamA: PlayerWithPositions[];
  teamB: PlayerWithPositions[];
};

export class TeamGenerator {
  // Ideal distribution for 6 v 6 according to your spec
  private readonly IDEAL_POSITIONS: Partial<Record<CanonicalRole, number>> = {
    Setter: 1,
    "Middle Blocker": 2,
    "Outside Hitter": 2,
    Opposite: 1,
    // Libero is optional; intentionally omitted
  };

  async generateTeams(config: TeamGenerationConfig): Promise<TeamSuggestion[]> {
    const { availablePlayers, targetTeamSize } = config;

    if (availablePlayers.length < 4) {
      throw new Error("Need at least 4 players to generate teams");
    }

    // Generate multiple team combinations
    const combinations = this.generateTeamCombinations(config, "strict");

    const suggestions: TeamSuggestion[] = [];

    for (const combination of combinations.slice(0, 3)) {
      // Assign roles per team BEFORE creating team stats
      const assignedA = this.assignRolesForTeam(combination.teamA);
      const assignedB = this.assignRolesForTeam(combination.teamB);

      // Project to UI/data model by overriding preferredPosition with assigned role
      const teamAPlayers = assignedA.map((p) => ({
        ...p,
        preferredPosition: p.assignedRole,
      })) as PlayerWithPositions[];

      const teamBPlayers = assignedB.map((p) => ({
        ...p,
        preferredPosition: p.assignedRole,
      })) as PlayerWithPositions[];

      // Build teams (averages, coverage, warnings) from the assigned players
      const teamA = this.createTeam(teamAPlayers);
      const teamB = this.createTeam(teamBPlayers);

      const balanceScore = this.calculateOverallBalance(teamA, teamB, "strict");
      const reasoning = this.generateReasoning(teamA, teamB, balanceScore);

      suggestions.push({
        teamA,
        teamB,
        balanceScore,
        overallWarnings: [...teamA.warnings, ...teamB.warnings],
        reasoning,
      });
    }

    return suggestions.sort((a, b) => b.balanceScore - a.balanceScore);
  }

  /**
   * Build candidate team pairs from a seeded split.
   *
   * - strict: small perturbations around the seeded optimum
   * - loose: more candidates + more swaps → bigger changes, more variety
   */
  private generateTeamCombinations(
    config: TeamGenerationConfig,
    mode: "strict" | "loose" = "strict"
  ): TeamPair[] {
    const { availablePlayers, targetTeamSize } = config;

    const seeded = this.seedSplitByRoles(
      availablePlayers,
      targetTeamSize,
      mode
    );

    const basePair: TeamPair = {
      teamA: seeded.teamA,
      teamB: seeded.teamB,
    };

    const combinations: TeamPair[] = [basePair];

    const candidateCount = mode === "strict" ? 3 : 10;
    const minSwaps = mode === "strict" ? 1 : 2;
    const maxSwaps =
      mode === "strict" ? 2 : Math.max(3, Math.floor(targetTeamSize / 2)); // allow bigger changes

    for (let i = 0; i < candidateCount; i++) {
      const teamA = [...basePair.teamA];
      const teamB = [...basePair.teamB];

      const swaps =
        minSwaps + Math.floor(Math.random() * (maxSwaps - minSwaps + 1));

      for (let s = 0; s < swaps; s++) {
        const idxA = Math.floor(Math.random() * teamA.length);
        const idxB = Math.floor(Math.random() * teamB.length);

        const temp = teamA[idxA];
        teamA[idxA] = teamB[idxB];
        teamB[idxB] = temp;
      }

      combinations.push({ teamA, teamB });
    }

    return combinations;
  }

  /**
   * Seed teams by roles.
   *
   * - strict mode: use the primary / preferred position.
   * - loose mode: allow secondary positions to drive bucket selection by
   *   randomly choosing from [primary + secondaries].
   */
  private seedSplitByRoles(
    players: PlayerWithPositions[],
    teamSize: number,
    mode: "strict" | "loose" = "strict"
  ): TeamPair {
    const totalPlayers = players.length;
    const teamCount = 2;
    const totalNeeded = teamSize * teamCount;

    if (totalPlayers < totalNeeded) {
      throw new Error(
        `Not enough players to seed two teams of size ${teamSize}. Got ${totalPlayers}.`
      );
    }

    type PlayerWithSecondaries = PlayerWithPositions & {
      _normalizedSecondaries: CanonicalRole[];
    };

    // Normalize players: preferredPosition + optional secondaryPositions
    const normalizedPlayers: PlayerWithSecondaries[] = players.map((p) => {
      const rawSecondaries =
        (p as unknown as { secondaryPositions?: string[] })
          .secondaryPositions ?? [];

      const normalizedSecondaries = rawSecondaries
        .map(normalizeRole)
        .filter((role): role is CanonicalRole => !!role);

      return {
        ...p,
        _normalizedSecondaries: normalizedSecondaries,
      };
    });

    // Sort by skill desc so stronger players are distributed more evenly
    const sorted = [...normalizedPlayers].sort(
      (a, b) => (b.skillRating ?? 5) - (a.skillRating ?? 5)
    );

    const buckets: Record<CanonicalRole, PlayerWithSecondaries[]> = {
      Setter: [],
      Opposite: [],
      "Middle Blocker": [],
      "Outside Hitter": [],
      Libero: [],
    };

    for (const p of sorted) {
      const primaryRole =
        normalizeRole(p.preferredPosition) ??
        ("Outside Hitter" as CanonicalRole);

      if (mode === "strict" || p._normalizedSecondaries.length === 0) {
        // Strict: only primary drives bucket choice.
        buckets[primaryRole].push({
          ...p,
          preferredPosition: primaryRole,
        });
      } else {
        // Loose: allow secondary positions to influence bucket choice.
        // We randomly pick any of [primary + secondaries] and treat that as
        // the "working primary" for this seeding pass.
        const allRoles: CanonicalRole[] = [
          primaryRole,
          ...p._normalizedSecondaries.filter((r) => r !== primaryRole),
        ];

        const chosenRole =
          allRoles[Math.floor(Math.random() * allRoles.length)] ?? primaryRole;

        buckets[chosenRole].push({
          ...p,
          preferredPosition: chosenRole,
        });
      }
    }

    // Target counts per team: 6v6 indoor defaults, but we use teamSize.
    const baseDemand: CanonicalRole[] = [
      "Setter",
      "Middle Blocker",
      "Opposite",
      "Outside Hitter",
      "Outside Hitter",
      "Libero",
    ];

    const demandForTeam = baseDemand.slice(0, teamSize);

    const teamA: PlayerWithPositions[] = [];
    const teamB: PlayerWithPositions[] = [];

    const pickFromBucket = (
      role: CanonicalRole
    ): PlayerWithPositions | null => {
      const bucket = buckets[role];
      if (!bucket?.length) return null;
      return bucket.shift() ?? null;
    };

    // First, try to fill required roles for both teams
    for (const role of demandForTeam) {
      const playerA = pickFromBucket(role);
      const playerB = pickFromBucket(role);

      if (playerA) teamA.push(playerA);
      if (playerB) teamB.push(playerB);
    }

    // Collect remaining players from all buckets for generic filling
    const remaining: PlayerWithPositions[] = Object.values(buckets).flat();

    // Fill up remaining slots with a simple gender-aware heuristic
    const fillTeam = (team: PlayerWithPositions[]) => {
      while (team.length < teamSize && remaining.length > 0) {
        const teamFemales = team.filter((p) => p.gender === "female").length;
        const teamMales = team.filter((p) => p.gender === "male").length;

        const candidates = [...remaining].sort((a, b) => {
          const score = (p: PlayerWithPositions) => {
            if (p.gender === "female" && teamFemales <= teamMales) return 2;
            if (p.gender === "male" && teamMales <= teamFemales) return 2;
            return 1;
          };
          return score(b) - score(a);
        });

        const picked = candidates[0];
        const idx = remaining.findIndex((p) => p.id === picked.id);
        if (idx >= 0) {
          remaining.splice(idx, 1);
          team.push(picked);
        } else {
          team.push(remaining.pop() as PlayerWithPositions);
        }
      }
    };

    fillTeam(teamA);
    fillTeam(teamB);

    return { teamA, teamB };
  }

  /**
   * Gender heuristic: returns true if adding the candidate to A is better or equal
   * for keeping |#male - #female| differences small.
   */
  private prefersSideAByGender(
    s: { aMale: number; bMale: number; aFemale: number; bFemale: number },
    p: PlayerWithPositions,
    targetFemalePerTeam: number
  ): boolean {
    const addF = p.gender === "female" ? 1 : 0;
    const addM = p.gender === "male" ? 1 : 0;

    // Hypothetical counts after placing p on A
    const aFemA = s.aFemale + addF;
    const aMaleA = s.aMale + addM;
    const aGapA = Math.abs(aFemA - aMaleA);

    // Hypothetical counts after placing p on B
    const bFemB = s.bFemale + addF;
    const bMaleB = s.bMale + addM;
    const bGapB = Math.abs(bFemB - bMaleB);

    if (aGapA !== bGapB) {
      return aGapA < bGapB; // prefer side that reduces gap more
    }

    // Gentle nudge toward target female per team (soft bias only)
    if (p.gender === "female") {
      const aOver = Math.abs(aFemA - targetFemalePerTeam);
      const bOver = Math.abs(bFemB - targetFemalePerTeam);
      if (aOver !== bOver) return aOver < bOver;
    }

    // no clear gender preference
    return true;
  }

  /**
   * Fallback mapping for scarce roles.
   * - Setter → Opposite
   * - Middle Blocker → Opposite
   * - Outside Hitter → Libero, else allow extra OH later
   * - Opposite → take from OH or MB as last resort (rare)
   */
  private takeFallback(
    role: CanonicalRole,
    bucket: Record<CanonicalRole, PlayerWithPositions[]>
  ): PlayerWithPositions | null {
    const pull = (r: CanonicalRole): PlayerWithPositions | null => {
      const arr = bucket[r];
      return arr.length ? arr.shift()! : null;
    };

    if (role === "Setter") {
      return (
        pull("Opposite") ??
        pull("Outside Hitter") ??
        pull("Middle Blocker") ??
        pull("Libero")
      );
    }
    if (role === "Middle Blocker") {
      return pull("Opposite") ?? pull("Outside Hitter") ?? pull("Libero");
    }
    if (role === "Outside Hitter") {
      return pull("Libero") ?? pull("Opposite") ?? pull("Middle Blocker");
    }
    if (role === "Opposite") {
      return pull("Outside Hitter") ?? pull("Middle Blocker") ?? pull("Libero");
    }
    // Libero not explicitly targeted here
    return null;
  }

  private sortPlayersByPositionPriority(
    players: PlayerWithPositions[]
  ): PlayerWithPositions[] {
    // Lower number = higher priority during initial split
    const positionPriority: Partial<Record<CanonicalRole, number>> = {
      Setter: 1,
      "Middle Blocker": 2,
      Opposite: 3,
      "Outside Hitter": 4,
      // Libero intentionally omitted; defaults to low priority via ?? 99
    };

    return players.sort((a, b) => {
      const aRole = normalizeRole(a.preferredPosition);
      const bRole = normalizeRole(b.preferredPosition);
      const aPriority = positionPriority[aRole] ?? 99;
      const bPriority = positionPriority[bRole] ?? 99;
      return aPriority - bPriority;
    });
  }

  /**
   * Assign roles for a single team, honoring:
   * Ideal: 1 S, 2 MB, 2 OH, 1 OPP (Libero optional, not constrained here)
   * Fallback minimum (if team has < 6 or limited roles): ensure at least 1 S, 1 MB, 1 OH.
   *
   * We build preference lists from player.preferredPosition (primary) plus optional secondaryPositions (if present).
   */
  private assignRolesForTeam(
    team: PlayerWithPositions[]
  ): Array<PlayerWithPositions & { assignedRole: CanonicalRole }> {
    type PlayerWithPrefs = PlayerWithPositions & {
      _prefers: CanonicalRole[]; // normalized preferences, primary first
    };

    // Build normalized preference lists
    const withPrefs: PlayerWithPrefs[] = team.map((p) => {
      const primary = normalizeRole(p.preferredPosition);
      const secondaries = (
        (p as unknown as { secondaryPositions?: string[] })
          .secondaryPositions ?? []
      ).map(normalizeRole);

      // Remove duplicates while preserving order
      const seen = new Set<CanonicalRole>();
      const prefs = [primary, ...secondaries].filter((r) => {
        if (seen.has(r)) return false;
        seen.add(r);
        return true;
      });

      // If no prefs somehow, default to Opposite to keep it stable
      return { ...p, _prefers: prefs.length ? prefs : ["Opposite"] };
    });

    // Target counts for a 6-player lineup
    const targets: Partial<Record<CanonicalRole, number>> = {
      Setter: 1,
      Opposite: 1,
      "Middle Blocker": 2,
      "Outside Hitter": 2,
    };

    const result: Array<PlayerWithPositions & { assignedRole: CanonicalRole }> =
      [];
    const available = new Set(withPrefs.map((p) => p.id));

    const takeForRole = (role: CanonicalRole, count: number) => {
      for (let k = 0; k < count; k++) {
        let bestIdx = -1;
        let bestScore = Number.POSITIVE_INFINITY; // lower index in _prefers is better
        for (let i = 0; i < withPrefs.length; i++) {
          const p = withPrefs[i];
          if (!available.has(p.id)) continue;
          const idx = p._prefers.indexOf(role);
          if (idx === -1) continue;
          if (idx < bestScore) {
            bestScore = idx;
            bestIdx = i;
          }
        }
        if (bestIdx >= 0) {
          const p = withPrefs[bestIdx];
          result.push({ ...p, assignedRole: role });
          available.delete(p.id);
        } else {
          break; // can't fill more of this role
        }
      }
    };

    // Try to satisfy ideal
    takeForRole("Setter", targets.Setter ?? 0);
    takeForRole("Opposite", targets.Opposite ?? 0);
    takeForRole("Middle Blocker", targets["Middle Blocker"] ?? 0);
    takeForRole("Outside Hitter", targets["Outside Hitter"] ?? 0);

    // Fallback minimums
    const ensureAtLeast = (role: CanonicalRole) => {
      if (!result.some((r) => r.assignedRole === role)) {
        takeForRole(role, 1);
      }
    };
    ensureAtLeast("Setter");
    ensureAtLeast("Middle Blocker");
    ensureAtLeast("Outside Hitter");

    // Fill remaining spots up to 6 with best remaining preference
    for (const p of withPrefs) {
      if (result.length >= 6) break;
      if (!available.has(p.id)) continue;
      const best = p._prefers[0] ?? "Opposite";
      result.push({ ...p, assignedRole: best });
      available.delete(p.id);
    }

    // Stable output order for nicer UX in edit dialogs, etc.
    result.sort(
      (a, b) =>
        CANONICAL_ORDER.indexOf(a.assignedRole) -
        CANONICAL_ORDER.indexOf(b.assignedRole)
    );
    return result;
  }

  private createTeam(players: PlayerWithPositions[]): GeneratedTeam {
    const team: GeneratedTeam = {
      players,
      averageSkill:
        players.reduce((sum, p) => sum + (p.skillRating || 5), 0) /
        players.length,
      positionCoverage: {},
      genderBalance: { male: 0, female: 0, other: 0 },
      warnings: [],
    };

    // Calculate position coverage and gender balance
    players.forEach((player) => {
      const primaryPos = normalizeRole(player.preferredPosition);
      team.positionCoverage[primaryPos] =
        (team.positionCoverage[primaryPos] || 0) + 1;

      if (player.gender === "male") team.genderBalance.male++;
      else if (player.gender === "female") team.genderBalance.female++;
      else team.genderBalance.other++;
    });

    // Add warnings
    this.addPositionWarnings(team);
    this.addGenderWarnings(team);

    return team;
  }

  /**
   * Calculate an overall balance score between 0 and 100.
   *
   * - Strict mode: used for the very first generation.
   *   Focus on: positions (strong), gender (strong), skill (medium).
   *
   * - Loose mode: used for shuffles.
   *   Focus on: positions (strong), gender (still strong), skill (soft),
   *   so we get more variety and are less sensitive to noisy skill ratings.
   */
  private calculateOverallBalance(
    teamA: GeneratedTeam,
    teamB: GeneratedTeam,
    mode: "strict" | "loose" = "strict"
  ): number {
    // Start from the position coverage score (0..100).
    // This keeps positions as the main driver of balance.
    const positionScore = this.calculatePositionBalance(teamA, teamB);

    let score = positionScore;

    const skillDiff = Math.abs(teamA.averageSkill - teamB.averageSkill);
    const genderDiff = Math.abs(
      teamA.genderBalance.female - teamB.genderBalance.female
    );

    if (mode === "strict") {
      // STRICT: used for the initial generation = "best we can do".
      // Skill is relevant, but not allowed to dominate.
      const skillPenalty = Math.min(20, skillDiff * 4); // was 30, diff * 6

      // Gender is important: we weight it more heavily than skill
      // and hit harder when the difference grows.
      const genderPenalty = Math.min(30, genderDiff * 15);

      score -= skillPenalty + genderPenalty;
    } else {
      // LOOSE: used when shuffling.
      // We keep gender quite important, but make skill very soft so
      // that a single over-rated player does not freeze the teams.
      const skillPenalty = Math.min(10, skillDiff * 2);

      let genderPenalty = Math.min(25, genderDiff * 12);
      // Extra hit when the difference is more than 1 player.
      if (genderDiff > 1) {
        genderPenalty += 10;
      }

      score -= skillPenalty + genderPenalty;
    }

    return Math.max(0, Math.round(score));
  }

  private calculatePositionBalance(
    teamA: GeneratedTeam,
    teamB: GeneratedTeam
  ): number {
    let balance = 100;

    Object.entries(this.IDEAL_POSITIONS).forEach(([position, ideal]) => {
      const key = position as CanonicalRole;
      const countA = teamA.positionCoverage[key] || 0;
      const countB = teamB.positionCoverage[key] || 0;

      balance -= Math.abs(countA - ideal) * 8;
      balance -= Math.abs(countB - ideal) * 8;
      balance -= Math.abs(countA - countB) * 5;
    });

    return Math.max(0, balance);
  }

  private addPositionWarnings(team: GeneratedTeam): void {
    Object.entries(this.IDEAL_POSITIONS).forEach(([position, ideal]) => {
      const key = position as CanonicalRole;
      const count = team.positionCoverage[key] || 0;
      if (count === 0) {
        team.warnings.push(`No ${key}`);
      } else if (count > ideal + 1) {
        team.warnings.push(`Too many ${key}s (${count})`);
      }
    });
  }

  private addGenderWarnings(team: GeneratedTeam): void {
    const { male, female } = team.genderBalance;

    if (Math.abs(male - female) > 2) {
      team.warnings.push(`Gender imbalance: ${male}M/${female}F`);
    }
  }

  private generateReasoning(
    teamA: GeneratedTeam,
    teamB: GeneratedTeam,
    balanceScore: number
  ): string {
    const skillDiff = Math.abs(teamA.averageSkill - teamB.averageSkill);
    const genderDiff = Math.abs(
      teamA.genderBalance.male - teamB.genderBalance.male
    );

    let reasoning = `Balance Score: ${balanceScore.toFixed(0)}/100. `;

    if (skillDiff < 0.5) {
      reasoning += "Excellent skill balance. ";
    } else if (skillDiff < 1.0) {
      reasoning += "Good skill balance. ";
    } else {
      reasoning += `Skill difference: ${skillDiff.toFixed(1)} points. `;
    }

    if (genderDiff <= 1) {
      reasoning += "Good gender balance.";
    } else {
      reasoning += `Gender difference: ${genderDiff} players.`;
    }

    return reasoning;
  }

  /**
   * Regenerate teams with a looser balance logic:
   * - still cares about positions & gender
   * - downweights skill
   * - uses more random swaps and also secondary positions when seeding
   *
   * This should yield noticeably different combinations between shuffles,
   * especially for 10–14 players, while staying "fair enough".
   */
  async regenerateTeams(
    config: TeamGenerationConfig
  ): Promise<TeamSuggestion[]> {
    const { availablePlayers, targetTeamSize } = config;

    if (availablePlayers.length < 4) {
      throw new Error("Need at least 4 players to generate teams");
    }

    // Shuffle players a bit to introduce additional randomness
    const shuffledPlayers = [...availablePlayers].sort(
      () => Math.random() - 0.5
    );

    const looseConfig: TeamGenerationConfig = {
      ...config,
      availablePlayers: shuffledPlayers,
      targetTeamSize,
    };

    const combinations = this.generateTeamCombinations(looseConfig, "loose");

    const suggestions: TeamSuggestion[] = [];

    for (const combination of combinations.slice(0, 3)) {
      // Assign roles per team BEFORE creating team stats
      const assignedA = this.assignRolesForTeam(combination.teamA);
      const assignedB = this.assignRolesForTeam(combination.teamB);

      const teamAPlayers = assignedA.map((p) => ({
        ...p,
        preferredPosition: p.assignedRole,
      })) as PlayerWithPositions[];

      const teamBPlayers = assignedB.map((p) => ({
        ...p,
        preferredPosition: p.assignedRole,
      })) as PlayerWithPositions[];

      const teamA = this.createTeam(teamAPlayers);
      const teamB = this.createTeam(teamBPlayers);

      const balanceScore = this.calculateOverallBalance(teamA, teamB, "loose");
      const reasoning = this.generateReasoning(teamA, teamB, balanceScore);

      suggestions.push({
        teamA,
        teamB,
        balanceScore,
        overallWarnings: [...teamA.warnings, ...teamB.warnings],
        reasoning,
      });
    }

    return suggestions.sort((a, b) => b.balanceScore - a.balanceScore);
  }
}

import {
  TeamGenerationConfig,
  TeamSuggestion,
  PlayerWithPositions,
  GeneratedTeam,
} from "./types";
import { normalizeRole, CANONICAL_ORDER } from "../../features/teams/positions";
import type { CanonicalRole } from "../../features/teams/positions";

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
    const combinations = this.generateTeamCombinations(
      availablePlayers,
      targetTeamSize
    );
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

      const balanceScore = this.calculateOverallBalance(teamA, teamB);
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

  private generateTeamCombinations(
    players: PlayerWithPositions[],
    teamSize: number
  ) {
    // We’ll build ONE high-quality, role-seeded split and then optionally
    // produce a couple of small variations (shuffle remaining pool) if needed.
    const actualTeamSize = Math.min(teamSize, Math.floor(players.length / 2));
    const base = this.seedSplitByRoles(players, actualTeamSize);

    // If we couldn’t produce a sensible split, fall back to previous logic
    if (!base) {
      return [
        {
          teamA: [...players].slice(0, actualTeamSize),
          teamB: [...players].slice(actualTeamSize, actualTeamSize * 2),
        },
      ];
    }

    const combinations: Array<{
      teamA: PlayerWithPositions[];
      teamB: PlayerWithPositions[];
    }> = [base];

    // Optionally create up to two light variations by swapping last slots
    // if the pool allows; this gives the scorer a few options.
    const { teamA, teamB } = base;
    const poolA = [...teamA];
    const poolB = [...teamB];

    if (poolA.length === actualTeamSize && poolB.length === actualTeamSize) {
      const variations = 2;
      for (let v = 0; v < variations; v++) {
        const a = [...poolA];
        const b = [...poolB];
        if (a.length && b.length) {
          // swap last players as a tiny perturbation
          const ap = a.pop()!;
          const bp = b.pop()!;
          a.push(bp);
          b.push(ap);
          combinations.push({ teamA: a, teamB: b });
        }
      }
    }

    return combinations;
  }

  /**
   * Build two teams by filling role slots symmetrically BEFORE splitting,
   * using fallback mappings when buckets are scarce.
   */
  private seedSplitByRoles(
    players: PlayerWithPositions[],
    teamSize: number
  ): { teamA: PlayerWithPositions[]; teamB: PlayerWithPositions[] } | null {
    // Normalize once
    const normalized = players.map((p) => ({
      ...p,
      _primary: normalizeRole(p.preferredPosition),
    }));

    // Buckets by primary role
    const bucket: Record<CanonicalRole, PlayerWithPositions[]> = {
      Setter: [],
      "Middle Blocker": [],
      "Outside Hitter": [],
      Opposite: [],
      Libero: [],
    };
    for (const p of normalized) {
      bucket[p._primary].push(p);
    }

    // Sort each bucket by skill desc for better matching
    (Object.keys(bucket) as CanonicalRole[]).forEach((r) => {
      bucket[r].sort((a, b) => (b.skillRating ?? 0) - (a.skillRating ?? 0));
    });

    // Soft gender target: not a hard rule, just guidance for the heuristic
    const totalFemale = normalized.filter((p) => p.gender === "female").length;
    const targetFemalePerTeam = Math.ceil(totalFemale / 2);

    // Desired per-team role counts
    const targetPerTeam: Partial<Record<CanonicalRole, number>> = {
      Setter: 1,
      "Middle Blocker": 2,
      "Outside Hitter": 2,
      Opposite: 1,
      // Libero optional
    };

    const teamA: Array<
      PlayerWithPositions & { preferredPosition: CanonicalRole }
    > = [];
    const teamB: Array<
      PlayerWithPositions & { preferredPosition: CanonicalRole }
    > = [];

    // Track gender & skill for balancing while pairing
    const state = {
      aSkillSum: 0,
      bSkillSum: 0,
      aMale: 0,
      bMale: 0,
      aFemale: 0,
      bFemale: 0,
    };
    const trackAdd = (side: "A" | "B", p: PlayerWithPositions) => {
      const s = p.skillRating ?? 0;

      if (side === "A") {
        state.aSkillSum += s;
      } else {
        state.bSkillSum += s;
      }

      if (p.gender === "male") {
        if (side === "A") {
          state.aMale++;
        } else {
          state.bMale++;
        }
      } else if (p.gender === "female") {
        if (side === "A") {
          state.aFemale++;
        } else {
          state.bFemale++;
        }
      }
    };

    // Helper: choose two candidates for a role with fallbacks
    const takePairForRole = (
      role: CanonicalRole
    ): [PlayerWithPositions | null, PlayerWithPositions | null] => {
      const primary = bucket[role];

      // Enough primaries?
      if (primary.length >= 2) {
        return [primary.shift()!, primary.shift()!];
      }

      // If only one primary, we’ll use a fallback for the second
      if (primary.length === 1) {
        const one = primary.shift()!;
        const alt = this.takeFallback(role, bucket);
        return [one, alt];
      }

      // No primary: try both from fallbacks
      const f1 = this.takeFallback(role, bucket);
      const f2 = this.takeFallback(role, bucket);
      return [f1, f2];
    };

    // For each role, fill required slots symmetrically (pair A/B)
    const roleOrder: CanonicalRole[] = [
      "Setter",
      "Middle Blocker",
      "Outside Hitter",
      "Opposite",
    ];

    for (const role of roleOrder) {
      const needed = targetPerTeam[role] ?? 0;
      for (let k = 0; k < needed; k++) {
        const [p1, p2] = takePairForRole(role);

        // If both missing, we skip this pair (will fill later)
        if (!p1 && !p2) continue;

        // Skill-balance assignment: place the higher-skill to the currently weaker team,
        // but respect gender balance (try to keep |diff| <= 1 when possible).
        const pair = [p1, p2].filter(Boolean) as PlayerWithPositions[];
        pair.sort((a, b) => (b.skillRating ?? 0) - (a.skillRating ?? 0));

        for (const cand of pair) {
          const assignToA =
            state.aSkillSum <= state.bSkillSum
              ? // A is weaker; but check gender diff: prefer side that reduces |diff|
                this.prefersSideAByGender(state, cand, targetFemalePerTeam)
              : // B is weaker
                !this.prefersSideAByGender(state, cand, targetFemalePerTeam);

          if (assignToA && teamA.length < teamSize) {
            teamA.push({ ...cand, preferredPosition: role });
            trackAdd("A", cand);
          } else if (teamB.length < teamSize) {
            teamB.push({ ...cand, preferredPosition: role });
            trackAdd("B", cand);
          } else if (teamA.length < teamSize) {
            teamA.push({ ...cand, preferredPosition: role });
            trackAdd("A", cand);
          }
        }
      }
    }

    // Fill remaining slots (if any) up to teamSize with best remaining players,
    // prioritizing skill balance and small gender difference.
    const remaining: PlayerWithPositions[] = [];
    (Object.keys(bucket) as CanonicalRole[]).forEach((r) =>
      remaining.push(...bucket[r])
    );

    // Add also any unassigned primaries we pulled as fallbacks but didn’t use
    // (already covered: we mutate buckets when we shift() out)

    remaining.sort((a, b) => (b.skillRating ?? 0) - (a.skillRating ?? 0));

    for (const cand of remaining) {
      if (teamA.length >= teamSize && teamB.length >= teamSize) break;
      const role = normalizeRole(cand.preferredPosition);
      const assignToA =
        state.aSkillSum <= state.bSkillSum
          ? this.prefersSideAByGender(state, cand, targetFemalePerTeam)
          : !this.prefersSideAByGender(state, cand, targetFemalePerTeam);

      if (assignToA && teamA.length < teamSize) {
        teamA.push({ ...cand, preferredPosition: role });
        trackAdd("A", cand);
      } else if (teamB.length < teamSize) {
        teamB.push({ ...cand, preferredPosition: role });
        trackAdd("B", cand);
      }
    }

    if (!teamA.length || !teamB.length) return null;

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

  private calculateOverallBalance(
    teamA: GeneratedTeam,
    teamB: GeneratedTeam
  ): number {
    // We compute three components on a 0–100 scale, then weight them:
    // positions 50%, skill 30%, gender 20%.
    // - Position: use existing 0..100 from calculatePositionBalance
    // - Skill: shrink penalty to max 30
    // - Gender: shrink penalty to max 20

    let score = 100;

    // Skill balance (30% of score)
    const skillDiff = Math.abs(teamA.averageSkill - teamB.averageSkill);
    // Previously: Math.min(40, diff*8)
    // Now: cap at 30; tune multiplier to taste. 6 makes ~5 pts diff ≈ -30
    score -= Math.min(30, skillDiff * 6);

    // Gender balance (20% of score)
    const teamGenderDiff = Math.abs(
      teamA.genderBalance.male - teamB.genderBalance.male
    );
    // Previously max 30 (diff*10). Now cap at 20.
    score -= Math.min(20, teamGenderDiff * 10);

    // Position balance (50% of score)
    const positionScore = this.calculatePositionBalance(teamA, teamB); // 0..100
    score -= (100 - positionScore) * 0.5; // 50% weight

    return Math.max(0, Math.min(100, score));
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

  async regenerateTeams(
    config: TeamGenerationConfig
  ): Promise<TeamSuggestion[]> {
    const shuffledPlayers = [...config.availablePlayers].sort(
      () => Math.random() - 0.5
    );
    const newConfig = { ...config, availablePlayers: shuffledPlayers };
    return this.generateTeams(newConfig);
  }
}

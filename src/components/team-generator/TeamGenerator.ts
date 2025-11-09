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
    const combinations: Array<{
      teamA: PlayerWithPositions[];
      teamB: PlayerWithPositions[];
    }> = [];
    const maxCombinations = Math.min(20, Math.pow(2, players.length - 1));

    for (let i = 0; i < maxCombinations; i++) {
      let shuffled = [...players];

      // Apply position-based sorting for better balance (normalized)
      shuffled = this.sortPlayersByPositionPriority(shuffled);

      // Randomize
      shuffled = shuffled.sort(() => Math.random() - 0.5);

      const actualTeamSize = Math.min(teamSize, Math.floor(players.length / 2));
      const teamA = shuffled.slice(0, actualTeamSize);
      const teamB = shuffled.slice(actualTeamSize, actualTeamSize * 2);

      if (teamB.length > 0) {
        combinations.push({ teamA, teamB });
      }
    }

    return combinations;
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
    let score = 100;

    // Skill balance (40% of score)
    const skillDiff = Math.abs(teamA.averageSkill - teamB.averageSkill);
    score -= Math.min(40, skillDiff * 8);

    // Gender balance (30% of score)
    const teamGenderDiff = Math.abs(
      teamA.genderBalance.male - teamB.genderBalance.male
    );
    score -= Math.min(30, teamGenderDiff * 10);

    // Position balance (30% of score)
    const positionScore = this.calculatePositionBalance(teamA, teamB);
    score -= (100 - positionScore) * 0.3;

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

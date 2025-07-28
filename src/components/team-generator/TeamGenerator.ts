import {
  TeamGenerationConfig,
  TeamSuggestion,
  PlayerWithPositions,
  GeneratedTeam,
} from "./types";

export class TeamGenerator {
  private readonly IDEAL_POSITIONS = {
    Setter: 1,
    "Middle Blocker": 2,
    "Outside Hitter": 2,
    Opposite: 1,
  };

  async generateTeams(config: TeamGenerationConfig): Promise<TeamSuggestion[]> {
    const { availablePlayers, targetTeamSize } = config;

    if (availablePlayers.length < 4) {
      throw new Error("Need at least 4 players to generate teams");
    }

    console.log("Generating teams for", availablePlayers.length, "players");

    // Generate multiple team combinations
    const combinations = this.generateTeamCombinations(
      availablePlayers,
      targetTeamSize
    );
    const suggestions: TeamSuggestion[] = [];

    for (const combination of combinations.slice(0, 3)) {
      // Top 3 suggestions
      const teamA = this.createTeam(combination.teamA);
      const teamB = this.createTeam(combination.teamB);

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
    const combinations = [];
    const maxCombinations = Math.min(20, Math.pow(2, players.length - 1));

    for (let i = 0; i < maxCombinations; i++) {
      let shuffled = [...players];

      // Apply position-based sorting for better balance
      shuffled = this.sortPlayersByPositionPriority(shuffled);

      // Add randomization
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
    const positionPriority = {
      Setter: 1,
      "Middle Blocker": 2,
      Opposite: 3,
      "Outside Hitter": 4,
    };

    return players.sort((a, b) => {
      const aPriority = positionPriority[a.preferredPosition] || 99;
      const bPriority = positionPriority[b.preferredPosition] || 99;
      return aPriority - bPriority;
    });
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
      const primaryPos = player.preferredPosition || "Unknown";
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
      const countA = teamA.positionCoverage[position] || 0;
      const countB = teamB.positionCoverage[position] || 0;

      balance -= Math.abs(countA - ideal) * 8;
      balance -= Math.abs(countB - ideal) * 8;
      balance -= Math.abs(countA - countB) * 5;
    });

    return Math.max(0, balance);
  }

  private addPositionWarnings(team: GeneratedTeam): void {
    Object.entries(this.IDEAL_POSITIONS).forEach(([position, ideal]) => {
      const count = team.positionCoverage[position] || 0;
      if (count === 0) {
        team.warnings.push(`No ${position}`);
      } else if (count > ideal + 1) {
        team.warnings.push(`Too many ${position}s (${count})`);
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

// Extend your existing Player type to match the new database structure
export interface PlayerWithPositions {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  skill_rating: number;
  height_cm?: number;
  gender: "male" | "female" | "other";
  is_active: boolean;
  club_id?: string;

  // Position data (new structure)
  playerPositions: PlayerPosition[]; // Renamed from 'positions'
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];

  // Compatibility with existing components
  name: string;
  preferredPosition: string;
  skillRating: number;
  availability: boolean;
  email: string;
  positions: string[]; // Keep this for compatibility with existing components
  matchesPlayed: number;
  isPublic: boolean;
}

export interface PlayerPosition {
  player_id: string;
  position_id: string;
  is_primary: boolean;
  position: {
    id: string;
    name: string;
  };
}

export interface TeamGenerationConfig {
  clubId: string;
  availablePlayers: PlayerWithPositions[];
  targetTeamSize: number;
  prioritizeGenderBalance: boolean;
  allowSecondaryPositions: boolean;
}

export interface GeneratedTeam {
  players: PlayerWithPositions[];
  averageSkill: number;
  positionCoverage: Record<string, number>;
  genderBalance: { male: number; female: number; other: number };
  warnings: string[];
}

export interface TeamSuggestion {
  teamA: GeneratedTeam;
  teamB: GeneratedTeam;
  balanceScore: number;
  overallWarnings: string[];
  reasoning: string;
}

export interface TeamAdjustment {
  playerId: string;
  fromTeam: "team_a" | "team_b";
  toTeam: "team_a" | "team_b";
  reason?: string;
}

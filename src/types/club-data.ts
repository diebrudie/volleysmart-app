
// Define and export the types that are used by other components
export interface Player {
  id: string;
  name: string;
  position: string;
}

export interface MatchScore {
  gameNumber: number;
  teamA: number | null;
  teamB: number | null;
  setNumber: number;
  teamAScore: number | null;
  teamBScore: number | null;
}

export interface TeamData {
  name: string;
  players: Player[];
}

export interface MatchData {
  id: string;
  date: string;
  teamA: TeamData;
  teamB: TeamData;
  scores: MatchScore[];
}

export interface ClubData {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  created_by: string;
  slug: string | null;
}

export interface MatchStats {
  teamAWins: number;
  teamBWins: number;
  hasPlayedAnySet: boolean;
  winner: string;
}

export interface UseClubDataResult {
  clubData: ClubData | null;
  isLoading: boolean;
  error: Error | null;
  isLoadingClub: boolean;
  hasClub: boolean;
  hasCheckedClub: boolean;
  matchData: MatchData | null;
  hasError: boolean;
  handleSetScoreUpdate: (setNumber: number, teamAScore: number | null, teamBScore: number | null) => void;
  getMatchStats: () => MatchStats;
}

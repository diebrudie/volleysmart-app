
import { MatchData, MatchScore, MatchStats } from '@/types/club-data';

// Helper function to update scores for a match
export const updateMatchScores = (
  matchData: MatchData, 
  setNumber: number, 
  teamAScore: number | null, 
  teamBScore: number | null
): MatchData => {
  const updatedScores = matchData.scores.map(score => {
    if (score.setNumber === setNumber) {
      return { 
        ...score, 
        teamA: teamAScore, 
        teamB: teamBScore,
        teamAScore: teamAScore,
        teamBScore: teamBScore
      };
    }
    return score;
  });
  
  return {
    ...matchData,
    scores: updatedScores,
  };
};

// Helper function to calculate match statistics
export const calculateMatchStats = (matchData: MatchData | null): MatchStats => {
  if (!matchData) return { 
    teamAWins: 0, 
    teamBWins: 0, 
    hasPlayedAnySet: false, 
    winner: 'none' 
  };
  
  let teamAWins = 0;
  let teamBWins = 0;
  let hasPlayedAnySet = false;
  
  matchData.scores.forEach(score => {
    if (score.teamA !== null && score.teamB !== null) {
      hasPlayedAnySet = true;
      if (score.teamA > score.teamB) {
        teamAWins++;
      } else if (score.teamB > score.teamA) {
        teamBWins++;
      }
    }
  });
  
  let winner = 'none';
  if (teamAWins > teamBWins) {
    winner = 'Team A';
  } else if (teamBWins > teamAWins) {
    winner = 'Team B';
  } else if (hasPlayedAnySet) {
    winner = 'Tie';
  }
  
  return { teamAWins, teamBWins, hasPlayedAnySet, winner };
};

// Helper function to generate mock match data
export const generateMockMatchData = (): MatchData => {
  return {
    id: 'match-001',
    date: new Date().toISOString(),
    teamA: {
      name: 'Team A',
      players: [
        { id: 'p1', name: 'Alex Smith', position: 'Setter' },
        { id: 'p2', name: 'Jamie Jones', position: 'Outside Hitter' },
        { id: 'p3', name: 'Taylor Williams', position: 'Middle Blocker' },
        { id: 'p4', name: 'Jordan Brown', position: 'Libero' },
        { id: 'p5', name: 'Casey Garcia', position: 'Opposite' },
        { id: 'p6', name: 'Riley Martinez', position: 'Outside Hitter' },
      ]
    },
    teamB: {
      name: 'Team B',
      players: [
        { id: 'p7', name: 'Sam Wilson', position: 'Setter' },
        { id: 'p8', name: 'Morgan Lee', position: 'Outside Hitter' },
        { id: 'p9', name: 'Quinn Taylor', position: 'Middle Blocker' },
        { id: 'p10', name: 'Drew Johnson', position: 'Libero' },
        { id: 'p11', name: 'Avery Thompson', position: 'Opposite' },
        { id: 'p12', name: 'Peyton Robinson', position: 'Outside Hitter' },
      ]
    },
    scores: [
      { setNumber: 1, gameNumber: 1, teamA: 25, teamB: 21, teamAScore: 25, teamBScore: 21 },
      { setNumber: 2, gameNumber: 2, teamA: 22, teamB: 25, teamAScore: 22, teamBScore: 25 },
      { setNumber: 3, gameNumber: 3, teamA: 25, teamB: 18, teamAScore: 25, teamBScore: 18 },
      { setNumber: 4, gameNumber: 4, teamA: null, teamB: null, teamAScore: null, teamBScore: null },
      { setNumber: 5, gameNumber: 5, teamA: null, teamB: null, teamAScore: null, teamBScore: null },
    ],
  };
};

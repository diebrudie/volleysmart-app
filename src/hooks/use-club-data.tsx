
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

// Define and export the types that are used by other components
export interface Player {
  id: string;
  name: string;
  position: string;
}

export interface MatchScore {
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

interface ClubData {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  created_by: string;
  slug: string | null;
}

interface UseClubDataResult {
  clubData: ClubData | null;
  isLoading: boolean;
  error: Error | null;
  isLoadingClub: boolean;
  hasClub: boolean;
  hasCheckedClub: boolean;
  matchData: MatchData | null;
  hasError: boolean;
  handleSetScoreUpdate: (setNumber: number, teamAScore: number | null, teamBScore: number | null) => void;
  getMatchStats: () => { teamAWins: number; teamBWins: number; hasPlayedAnySet: boolean; winner: string };
}

// Convert to named export instead of default export
export const useClubData = (): UseClubDataResult => {
  const { user } = useAuth();
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Mock data for the dashboard
  const [matchData, setMatchData] = useState<MatchData | null>({
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
      { setNumber: 1, teamAScore: 25, teamBScore: 21 },
      { setNumber: 2, teamAScore: 22, teamBScore: 25 },
      { setNumber: 3, teamAScore: 25, teamBScore: 18 },
      { setNumber: 4, teamAScore: null, teamBScore: null },
      { setNumber: 5, teamAScore: null, teamBScore: null },
    ],
  });

  // Added the required functions for dashboard
  const handleSetScoreUpdate = (setNumber: number, teamAScore: number | null, teamBScore: number | null) => {
    if (!matchData) return;
    
    const updatedScores = matchData.scores.map(score => {
      if (score.gameNumber === setNumber) {
        return { ...score, teamA: teamAScore, teamB: teamBScore };
      }
      return score;
    });
    
    setMatchData({
      ...matchData,
      scores: updatedScores,
    });
  };

  const getMatchStats = () => {
    if (!matchData) return { teamAWins: 0, teamBWins: 0, hasPlayedAnySet: false, winner: 'none' };
    
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

  useEffect(() => {
    const fetchClubData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user?.id) {
          console.log("User ID not available. Skipping club data fetch.");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('clubs')
          .select('*')
          .eq('created_by', user.id)
          .single();

        if (error) {
          setError(error);
          console.error("Error fetching club data:", error);
        } else {
          setClubData(data);
        }
      } catch (err: any) {
        setError(err);
        console.error("Unexpected error fetching club data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Call the fetch function only if user is available
    if (user?.id) {
      fetchClubData();
    }
  }, [user?.id]);

  return { 
    clubData, 
    isLoading, 
    error,
    isLoadingClub: isLoading,
    hasClub: !!clubData,
    hasCheckedClub: !isLoading,
    matchData,
    hasError: !!error,
    handleSetScoreUpdate,
    getMatchStats
  };
};

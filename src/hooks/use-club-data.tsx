
import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useFetchClub } from './use-fetch-club';
import { 
  generateMockMatchData, 
  updateMatchScores, 
  calculateMatchStats 
} from '@/utils/match-utils';
import { 
  MatchData, 
  UseClubDataResult 
} from '@/types/club-data';

// Convert to named export instead of default export
export const useClubData = (): UseClubDataResult => {
  const { user } = useAuth();
  const { 
    clubData, 
    isLoading, 
    error, 
    hasClub, 
    hasCheckedClub 
  } = useFetchClub(user?.id);
  
  // Mock data for the dashboard
  const [matchData, setMatchData] = useState<MatchData | null>(generateMockMatchData());

  // Added the required functions for dashboard
  const handleSetScoreUpdate = (setNumber: number, teamAScore: number | null, teamBScore: number | null) => {
    if (!matchData) return;
    
    const updatedMatchData = updateMatchScores(matchData, setNumber, teamAScore, teamBScore);
    console.log('Updated match data:', updatedMatchData);
    setMatchData(updatedMatchData);
  };

  const getMatchStats = () => {
    return calculateMatchStats(matchData);
  };

  return { 
    clubData, 
    isLoading, 
    error,
    isLoadingClub: isLoading,
    hasClub,
    hasCheckedClub,
    matchData,
    hasError: !!error,
    handleSetScoreUpdate,
    getMatchStats
  };
};

// Re-export types from the types module for backward compatibility
export type { 
  Player, 
  MatchScore, 
  TeamData, 
  MatchData 
} from '@/types/club-data';

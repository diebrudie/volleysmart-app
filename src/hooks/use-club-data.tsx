
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types for our hook return values
export interface MatchScore {
  gameNumber: number;
  teamA: number | null;
  teamB: number | null;
}

export interface Player {
  id: number;
  name: string;
  position: string;
}

export interface MatchData {
  date: string;
  teamA: Player[];
  teamB: Player[];
  scores: MatchScore[];
}

export const useClubData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoadingClub, setIsLoadingClub] = useState(true);
  const [hasClub, setHasClub] = useState(false);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [hasError, setHasError] = useState(false);
  const [hasCheckedClub, setHasCheckedClub] = useState(false);

  // Check if user belongs to a club
  useEffect(() => {
    let isMounted = true;
    
    const checkClubMembership = async () => {
      if (!user?.id) return;
      
      try {
        if (isMounted) {
          setIsLoadingClub(true);
          setHasError(false);
        }
        
        // First try to get the user's club
        const { data: clubData, error: playerError } = await supabase
          .from('players')
          .select('club_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (playerError) {
          console.error("Error fetching player data:", playerError);
        } else if (clubData?.club_id && isMounted) {
          setHasClub(true);
          setHasCheckedClub(true);
          fetchLatestMatchData(clubData.club_id);
          return;
        }
        
        // Only proceed if component is still mounted
        if (!isMounted) return;
        
        // Fall back to checking club memberships if player data doesn't have club_id
        try {
          const { data: clubMemberships, error } = await supabase
            .from('club_members')
            .select('club_id')
            .eq('user_id', user.id)
            .limit(1);
          
          // Only update state if component is still mounted
          if (!isMounted) return;
          
          if (error) {
            if (error.code === '42P17') {
              // Handle infinite recursion error
              console.warn("RLS policy error, but continue showing the dashboard");
              setHasClub(false);
              setHasCheckedClub(true);
              return;
            }
            
            console.error("Error checking club membership:", error);
            setHasError(true);
            toast({
              title: "Error",
              description: "Failed to check club membership. Please try again later.",
              variant: "destructive"
            });
            return;
          }
          
          const hasClubMembership = clubMemberships && clubMemberships.length > 0;
          setHasClub(hasClubMembership);
          setHasCheckedClub(true);
          
          // If they have a club, fetch the latest match data
          if (hasClubMembership) {
            fetchLatestMatchData(clubMemberships[0].club_id);
          }
        } catch (error) {
          // Only update state if component is still mounted
          if (!isMounted) return;
          
          console.error("Error in club membership check:", error);
          setHasError(true);
          toast({
            title: "Error",
            description: "Failed to check club membership",
            variant: "destructive"
          });
        }
        
      } catch (error) {
        // Only update state if component is still mounted
        if (!isMounted) return;
        
        console.error("Error checking club membership:", error);
        setHasError(true);
        toast({
          title: "Error",
          description: "Failed to check club membership",
          variant: "destructive"
        });
      } finally {
        // Only update state if component is still mounted
        if (isMounted) {
          setIsLoadingClub(false);
        }
      }
    };
    
    if (user?.id) {
      checkClubMembership();
    } else {
      // Reset states when no user
      if (isMounted) {
        setIsLoadingClub(false);
        setHasClub(false);
        setHasCheckedClub(false);
        setMatchData(null);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, toast]);
  
  // Fetch the latest match data for the club
  const fetchLatestMatchData = async (clubId: string) => {
    try {
      // This is placeholder code - will need to be updated with actual data fetching
      // Mock data structure as a placeholder
      setMatchData({
        date: new Date().toISOString(),
        teamA: [
          { id: 1, name: "Isabel", position: "Outside Hitter" },
          { id: 2, name: "Eduardo", position: "Middle Blocker" },
          { id: 3, name: "Carlotta", position: "Outside Hitter" },
          { id: 4, name: "Juan", position: "Opposite Hitter" },
          { id: 5, name: "Nacho", position: "Libero" },
          { id: 6, name: "Paco", position: "Setter" },
        ],
        teamB: [
          { id: 7, name: "Ana", position: "Middle Blocker" },
          { id: 8, name: "Maria", position: "Outside Hitter" },
          { id: 9, name: "Pepito", position: "Opposite Hitter" },
          { id: 10, name: "Carlos", position: "Outside Hitter" },
          { id: 11, name: "Natalia", position: "Setter" },
          { id: 12, name: "Ana Isabel", position: "Libero" },
        ],
        scores: [
          { gameNumber: 1, teamA: null, teamB: null },
          { gameNumber: 2, teamA: null, teamB: null },
          { gameNumber: 3, teamA: null, teamB: null },
          { gameNumber: 4, teamA: null, teamB: null },
          { gameNumber: 5, teamA: null, teamB: null },
        ]
      });
    } catch (error) {
      console.error("Error fetching match data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch match data",
        variant: "destructive"
      });
    }
  };

  const handleSetScoreUpdate = useCallback((setNumber: number, teamAScore: number | null, teamBScore: number | null) => {
    setMatchData(prevMatchData => {
      if (!prevMatchData) return null;
      
      const updatedScores = [...prevMatchData.scores];
      const index = updatedScores.findIndex(score => score.gameNumber === setNumber);
      
      if (index !== -1) {
        updatedScores[index] = { gameNumber: setNumber, teamA: teamAScore, teamB: teamBScore };
      }
      
      return {
        ...prevMatchData,
        scores: updatedScores
      };
    });
  }, []);

  // Calculate match statistics
  const getMatchStats = useCallback(() => {
    if (!matchData) return { teamAWins: 0, teamBWins: 0, hasPlayedAnySet: false, winner: "TBD" };

    const teamAWins = matchData.scores.filter(game => 
      game.teamA !== null && game.teamB !== null && game.teamA > game.teamB
    ).length;
    
    const teamBWins = matchData.scores.filter(game => 
      game.teamA !== null && game.teamB !== null && game.teamB > game.teamA
    ).length;
    
    const hasPlayedAnySet = matchData.scores.some(game => 
      game.teamA !== null && game.teamB !== null && (game.teamA > 0 || game.teamB > 0)
    );
    
    const winner = hasPlayedAnySet 
      ? (teamAWins > teamBWins ? "Team A" : (teamBWins > teamAWins ? "Team B" : "Tie")) 
      : "TBD";

    return { teamAWins, teamBWins, hasPlayedAnySet, winner };
  }, [matchData]);

  return {
    isLoadingClub,
    hasClub,
    hasCheckedClub,
    matchData,
    hasError,
    handleSetScoreUpdate,
    getMatchStats
  };
};

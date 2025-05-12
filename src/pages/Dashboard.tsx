import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/layout/Navbar";
import SetBox from "@/components/match/SetBox";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Pencil, Users, CalendarDays } from "lucide-react";
import { format, isWednesday } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NoClubMessage from "@/components/club/NoClubMessage";
import { Spinner } from "@/components/ui/spinner";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isLoadingClub, setIsLoadingClub] = useState(true);
  const [hasClub, setHasClub] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [hasCheckedClub, setHasCheckedClub] = useState(false);
  
  // Check if user belongs to a club
  useEffect(() => {
    const checkClubMembership = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoadingClub(true);
        setHasError(false);
        
        // First try to get the user's club
        const { data: clubData, error: playerError } = await supabase
          .from('players')
          .select('club_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (playerError) {
          console.error("Error fetching player data:", playerError);
        } else if (clubData?.club_id) {
          setHasClub(true);
          setHasCheckedClub(true);
          fetchLatestMatchData(clubData.club_id);
          return;
        }
        
        // Fall back to checking club memberships if player data doesn't have club_id
        const { data: clubMemberships, error } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', user.id)
          .limit(1);
        
        if (error) {
          if (error.code === '42P17') {
            // Handle infinite recursion error
            console.warn("RLS policy error, but continue showing the dashboard");
            // Don't navigate away, just show the no club message
            setHasClub(false);
            setHasCheckedClub(true);
            setIsLoadingClub(false);
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
        console.error("Error checking club membership:", error);
        setHasError(true);
        toast({
          title: "Error",
          description: "Failed to check club membership",
          variant: "destructive"
        });
      } finally {
        setIsLoadingClub(false);
      }
    };
    
    if (user?.id) {
      checkClubMembership();
    }
  }, [user?.id, toast, navigate]);
  
  // Fetch the latest match data for the club
  const fetchLatestMatchData = async (clubId) => {
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

  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-6">
          <Card className="max-w-lg w-full">
            <CardContent className="text-center p-8">
              <h3 className="text-xl font-medium text-red-600 mb-4">Something went wrong</h3>
              <p className="text-gray-600 mb-6">
                We're having trouble connecting to our servers. Please try again later.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show NoClubMessage if the user doesn't have a club and we've finished checking
  if (!isLoadingClub && hasCheckedClub && !hasClub) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <NoClubMessage />
      </div>
    );
  }

  if (isLoadingClub || !matchData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Spinner className="h-8 w-8 text-volleyball-primary mr-2" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // Calculate the match result
  const teamAWins = matchData.scores.filter(game => 
    game.teamA !== null && game.teamB !== null && game.teamA > game.teamB
  ).length;
  
  const teamBWins = matchData.scores.filter(game => 
    game.teamA !== null && game.teamB !== null && game.teamB > game.teamA
  ).length;
  
  // Winner team
  const hasPlayedAnySet = matchData.scores.some(game => 
    game.teamA !== null && game.teamB !== null && (game.teamA > 0 || game.teamB > 0)
  );
  
  const winner = hasPlayedAnySet 
    ? (teamAWins > teamBWins ? "Team A" : (teamBWins > teamAWins ? "Team B" : "Tie")) 
    : "TBD";

  const formatDate = (dateString) => {
    const options = { 
      weekday: 'long' as const, 
      day: 'numeric' as const, 
      month: 'long' as const, 
      year: 'numeric' as const 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Determine if the match is from today and if today is Wednesday
  const matchDate = new Date(matchData.date);
  const today = new Date();
  const isMatchToday = matchDate.toDateString() === today.toDateString();
  const isTodayWednesday = isWednesday(today);
  
  // Determine which heading to display
  const headingText = (isMatchToday && isTodayWednesday) ? "Today's Game Overview" : "Last Game Overview";

  const handleSetScoreUpdate = (setNumber, teamAScore, teamBScore) => {
    setMatchData(prevMatchData => {
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
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Game Overview with dynamic heading */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-serif mb-2">{headingText}</h1>
              <p className="text-gray-600">{formatDate(matchData.date)}</p>
            </div>
            <button className="flex items-center gap-1 text-sm font-medium">
              <Pencil className="h-4 w-4" /> Edit Teams
            </button>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left Column - Winner Card */}
            <div className="h-full">
              <div className="rounded-lg overflow-hidden border border-gray-200 h-full flex flex-col">
                <div className="bg-volleyball-primary text-white p-4 text-center">
                  <h2 className="text-2xl font-bold">SCORE</h2>
                </div>
                <div className="bg-white p-6 text-center flex-grow flex flex-col justify-center">
                  <h3 className="text-3xl font-bold mb-4">
                    {hasPlayedAnySet ? winner : "TBD"}
                  </h3>
                  <div className="text-5xl font-bold">
                    <span className="text-red-500">{teamAWins}</span> - <span className="text-emerald-500">{teamBWins}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Team Cards */}
            <div className="h-full">
              <div className="flex h-full rounded-lg overflow-hidden border border-gray-200">
                {/* Team A Card */}
                <div className="w-1/2 bg-white p-0">
                  <h3 className="bg-red-500 text-white py-1 px-2 text-center">Team A</h3>
                  <ul className="space-y-0.5 p-4">
                    {matchData.teamA.map((player, index) => (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium">{index + 1}. {player.name}</span> - <span className="text-gray-600">{player.position}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Team B Card */}
                <div className="w-1/2 bg-white p-0">
                  <h3 className="bg-emerald-500 text-white py-1 px-2 text-center">Team B</h3>
                  <ul className="space-y-0.5 p-4">
                    {matchData.teamB.map((player, index) => (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium">{index + 1}. {player.name}</span> - <span className="text-gray-600">{player.position}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sets Layout - New grid arrangement */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Set 1 - Larger box on the left spanning two rows */}
            <div className="md:row-span-2">
              <SetBox
                key={1}
                setNumber={1}
                teamAScore={matchData.scores.find(score => score.gameNumber === 1)?.teamA}
                teamBScore={matchData.scores.find(score => score.gameNumber === 1)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
                isLarge={true}
              />
            </div>

            {/* Column 2 top row: Set 2 */}
            <div>
              <SetBox
                key={2}
                setNumber={2}
                teamAScore={matchData.scores.find(score => score.gameNumber === 2)?.teamA}
                teamBScore={matchData.scores.find(score => score.gameNumber === 2)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Column 3 top row: Set 4 */}
            <div>
              <SetBox
                key={4}
                setNumber={4}
                teamAScore={matchData.scores.find(score => score.gameNumber === 4)?.teamA}
                teamBScore={matchData.scores.find(score => score.gameNumber === 4)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Column 2 bottom row: Set 3 */}
            <div>
              <SetBox
                key={3}
                setNumber={3}
                teamAScore={matchData.scores.find(score => score.gameNumber === 3)?.teamA}
                teamBScore={matchData.scores.find(score => score.gameNumber === 3)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Column 3 bottom row: Set 5 */}
            <div>
              <SetBox
                key={5}
                setNumber={5}
                teamAScore={matchData.scores.find(score => score.gameNumber === 5)?.teamA}
                teamBScore={matchData.scores.find(score => score.gameNumber === 5)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

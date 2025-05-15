
import Navbar from "@/components/layout/Navbar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { useAuth } from "@/contexts/auth";
import { MatchData } from "@/hooks/use-club-data";

const Dashboard = () => {
  // Add auth context to check authentication status
  const { user } = useAuth();
  
  console.log('Dashboard - User:', user);

  // Create dummy match data for demonstration
  const dummyMatchData: MatchData = {
    id: '123',
    date: new Date().toISOString(),
    teamA: {
      name: 'Team A',
      players: [
        { id: '1', name: 'John Smith', position: 'Setter' },
        { id: '2', name: 'Mike Johnson', position: 'Outside Hitter' },
        { id: '3', name: 'Sarah Williams', position: 'Middle Blocker' },
      ]
    },
    teamB: {
      name: 'Team B',
      players: [
        { id: '4', name: 'Emma Davis', position: 'Setter' },
        { id: '5', name: 'Ryan Wilson', position: 'Outside Hitter' },
        { id: '6', name: 'Alex Brown', position: 'Middle Blocker' },
      ]
    },
    scores: [
      { setNumber: 1, gameNumber: 1, teamA: 25, teamB: 23, teamAScore: 25, teamBScore: 23 },
      { setNumber: 2, gameNumber: 2, teamA: 22, teamB: 25, teamAScore: 22, teamBScore: 25 },
      { setNumber: 3, gameNumber: 3, teamA: 25, teamB: 21, teamAScore: 25, teamBScore: 21 },
      { setNumber: 4, gameNumber: 4, teamA: 25, teamB: 18, teamAScore: 25, teamBScore: 18 },
      { setNumber: 5, gameNumber: 5, teamA: null, teamB: null, teamAScore: null, teamBScore: null }
    ]
  };

  // Calculate match statistics for the dummy data
  const getMatchStats = () => {
    const teamAWins = dummyMatchData.scores.filter(set => 
      set.teamAScore !== null && 
      set.teamBScore !== null && 
      set.teamAScore > set.teamBScore
    ).length;

    const teamBWins = dummyMatchData.scores.filter(set => 
      set.teamAScore !== null && 
      set.teamBScore !== null && 
      set.teamBScore > set.teamAScore
    ).length;

    const hasPlayedAnySet = dummyMatchData.scores.some(set => 
      set.teamAScore !== null && set.teamBScore !== null
    );

    let winner = "";
    if (teamAWins > teamBWins) {
      winner = "Team A";
    } else if (teamBWins > teamAWins) {
      winner = "Team B";
    } else if (hasPlayedAnySet) {
      winner = "Tie";
    }

    return { teamAWins, teamBWins, hasPlayedAnySet, winner };
  };

  // Mock score update function
  const handleSetScoreUpdate = (setNumber: number, teamAScore: number | null, teamBScore: number | null) => {
    console.log('Score updated:', { setNumber, teamAScore, teamBScore });
    // In a real app, this would update the data
  };

  // Get match statistics
  const { teamAWins, teamBWins, hasPlayedAnySet, winner } = getMatchStats();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <DashboardContent 
          matchData={dummyMatchData}
          teamAWins={teamAWins}
          teamBWins={teamBWins}
          hasPlayedAnySet={hasPlayedAnySet}
          winner={winner}
          onScoreUpdate={handleSetScoreUpdate}
        />
      </main>
    </div>
  );
};

export default Dashboard;

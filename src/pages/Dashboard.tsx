
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
      name: 'Team Eagles',
      players: [
        { id: '1', name: 'John Smith', position: 'Setter' },
        { id: '2', name: 'Mike Johnson', position: 'Outside Hitter' },
        { id: '3', name: 'Sarah Williams', position: 'Middle Blocker' },
      ]
    },
    teamB: {
      name: 'Team Hawks',
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
      winner = dummyMatchData.teamA.name;
    } else if (teamBWins > teamAWins) {
      winner = dummyMatchData.teamB.name;
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome, {user?.name || 'Player'}!
            </h1>
            <p className="text-gray-600">
              This is a demo dashboard showing sample volleyball match data. In a real app, 
              this data would come from your club's matches.
            </p>
          </div>
        </div>
        
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

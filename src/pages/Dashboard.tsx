
import Navbar from "@/components/layout/Navbar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { useAuth } from "@/contexts/auth";
import { useClubData } from "@/hooks/use-club-data";

const Dashboard = () => {
  // Add auth context to check authentication status
  const { user } = useAuth();
  
  // Use our refactored hook
  const { 
    matchData, 
    handleSetScoreUpdate, 
    getMatchStats 
  } = useClubData();
  
  console.log('Dashboard - User:', user);
  console.log('Dashboard - Match Data:', matchData);

  // Get match statistics
  const { teamAWins, teamBWins, hasPlayedAnySet, winner } = getMatchStats();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {matchData && (
          <DashboardContent 
            matchData={matchData}
            teamAWins={teamAWins}
            teamBWins={teamBWins}
            hasPlayedAnySet={hasPlayedAnySet}
            winner={winner}
            onScoreUpdate={handleSetScoreUpdate}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;

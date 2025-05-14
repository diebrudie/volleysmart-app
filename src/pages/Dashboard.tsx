
import Navbar from "@/components/layout/Navbar";
import NoClubMessage from "@/components/club/NoClubMessage";
import ErrorState from "@/components/dashboard/ErrorState";
import LoadingState from "@/components/dashboard/LoadingState";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { useClubData } from "@/hooks/use-club-data";
import { useAuth } from "@/contexts/auth";

const Dashboard = () => {
  // Add auth context to check authentication status
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  
  console.log('Dashboard - Auth state:', { 
    isAuthenticated, 
    isLoadingAuth, 
    userId: user?.id,
    userEmail: user?.email
  });
  
  const { 
    isLoadingClub, 
    hasClub, 
    hasCheckedClub, 
    matchData, 
    hasError,
    handleSetScoreUpdate,
    getMatchStats
  } = useClubData();
  
  console.log('Dashboard - Club data state:', {
    isLoadingClub,
    hasClub,
    hasCheckedClub,
    hasMatchData: !!matchData,
    hasError
  });

  // Show error state
  if (hasError) {
    console.log('Dashboard - Showing error state');
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <ErrorState />
      </div>
    );
  }

  // Show NoClubMessage if the user doesn't have a club and we've finished checking
  if (!isLoadingClub && hasCheckedClub && !hasClub) {
    console.log('Dashboard - User has no club, showing NoClubMessage');
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <NoClubMessage />
      </div>
    );
  }

  // Show loading state
  if (isLoadingClub || !matchData) {
    console.log('Dashboard - Still loading club or match data, showing LoadingState');
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingState />
      </div>
    );
  }

  // Get match statistics
  const { teamAWins, teamBWins, hasPlayedAnySet, winner } = getMatchStats();
  console.log('Dashboard - Match statistics:', { teamAWins, teamBWins, hasPlayedAnySet, winner });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <DashboardContent 
          matchData={matchData}
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

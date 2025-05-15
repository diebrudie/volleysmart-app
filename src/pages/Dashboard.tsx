
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

  // If still loading club data, show loading state
  if (isLoadingClub) {
    console.log('Dashboard - Still loading club data, showing LoadingState');
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingState />
      </div>
    );
  }

  // Show NoClubMessage if the user doesn't have a club and we've finished checking
  if (hasCheckedClub && !hasClub) {
    console.log('Dashboard - User has no club, showing NoClubMessage');
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <NoClubMessage />
      </div>
    );
  }

  // If no match data yet, show a welcome message instead
  if (!matchData) {
    console.log('Dashboard - No match data yet, showing welcome message');
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">Welcome to VolleyTrack!</h2>
            <p className="text-gray-600">
              You're all set up. Start by creating or joining a club to track your matches and team performance.
            </p>
          </div>
        </div>
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

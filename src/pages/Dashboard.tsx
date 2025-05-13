
import Navbar from "@/components/layout/Navbar";
import NoClubMessage from "@/components/club/NoClubMessage";
import ErrorState from "@/components/dashboard/ErrorState";
import LoadingState from "@/components/dashboard/LoadingState";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { useClubData } from "@/hooks/use-club-data";

const Dashboard = () => {
  const { 
    isLoadingClub, 
    hasClub, 
    hasCheckedClub, 
    matchData, 
    hasError,
    handleSetScoreUpdate,
    getMatchStats
  } = useClubData();

  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <ErrorState />
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

  // Show loading state
  if (isLoadingClub || !matchData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingState />
      </div>
    );
  }

  // Get match statistics
  const { teamAWins, teamBWins, hasPlayedAnySet, winner } = getMatchStats();

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

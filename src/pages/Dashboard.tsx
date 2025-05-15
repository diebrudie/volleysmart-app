
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import LoadingState from "@/components/dashboard/LoadingState";
import ErrorState from "@/components/dashboard/ErrorState";
import { useAuth } from "@/contexts/auth";
import { useClubData } from "@/hooks/use-club-data";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  // Add auth context to check authentication status
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use our refactored hook
  const { 
    matchData, 
    isLoading,
    hasError,
    error,
    handleSetScoreUpdate, 
    getMatchStats 
  } = useClubData();
  
  console.log('Dashboard - User:', user);
  console.log('Dashboard - Match Data:', matchData);

  useEffect(() => {
    if (error) {
      console.error("Dashboard error:", error);
      toast({
        title: "Error loading data",
        description: "There was a problem loading the match data. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Get match statistics if we have match data
  const stats = matchData ? getMatchStats() : { teamAWins: 0, teamBWins: 0, hasPlayedAnySet: false, winner: "none" };

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingState />
      </div>
    );
  }

  // Show error state if there was a problem loading the data
  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <ErrorState />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {matchData && (
          <DashboardContent 
            matchData={matchData}
            teamAWins={stats.teamAWins}
            teamBWins={stats.teamBWins}
            hasPlayedAnySet={stats.hasPlayedAnySet}
            winner={stats.winner}
            onScoreUpdate={handleSetScoreUpdate}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;


import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import LoadingState from "@/components/dashboard/LoadingState";
import ErrorState from "@/components/dashboard/ErrorState";
import { useAuth } from "@/contexts/auth";
import { useClubData } from "@/hooks/use-club-data";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
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
  console.log('Dashboard - Auth status:', { isAuthenticated, authLoading });

  useEffect(() => {
    // Only show the initial toast error once
    if (!isLoading && error && isInitialLoad) {
      console.error("Dashboard error:", error);
      toast({
        title: "Error loading data",
        description: "There was a problem loading the match data. Using demo data instead.",
        variant: "destructive",
      });
      setIsInitialLoad(false);
    }
  }, [error, isLoading, toast, isInitialLoad]);

  // Get match statistics if we have match data
  const stats = matchData ? getMatchStats() : { teamAWins: 0, teamBWins: 0, hasPlayedAnySet: false, winner: "none" };

  // Show loading state while data is being fetched
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingState />
      </div>
    );
  }

  // If there was an error but we still have mock data, continue showing the dashboard
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
        
        {!matchData && !isLoading && (
          <ErrorState />
        )}
      </main>
    </div>
  );
};

export default Dashboard;

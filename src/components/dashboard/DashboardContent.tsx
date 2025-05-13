
import { isWednesday } from "date-fns";
import MatchHeader from "./MatchHeader";
import ScoreOverview from "./ScoreOverview";
import TeamsOverview from "./TeamsOverview";
import SetsGrid from "./SetsGrid";
import { MatchData } from "@/hooks/use-club-data";

interface DashboardContentProps {
  matchData: MatchData;
  teamAWins: number;
  teamBWins: number;
  hasPlayedAnySet: boolean;
  winner: string;
  onScoreUpdate: (setNumber: number, teamAScore: number | null, teamBScore: number | null) => void;
}

const DashboardContent = ({ 
  matchData, 
  teamAWins, 
  teamBWins, 
  hasPlayedAnySet, 
  winner,
  onScoreUpdate 
}: DashboardContentProps) => {
  // Determine if the match is from today and if today is Wednesday
  const matchDate = new Date(matchData.date);
  const today = new Date();
  const isMatchToday = matchDate.toDateString() === today.toDateString();
  const isTodayWednesday = isWednesday(today);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Game Overview with dynamic heading */}
      <MatchHeader 
        date={matchData.date} 
        isToday={isMatchToday} 
        isWednesday={isTodayWednesday} 
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Left Column - Winner Card */}
        <div className="h-full">
          <ScoreOverview 
            winner={winner}
            teamAWins={teamAWins}
            teamBWins={teamBWins}
            hasPlayedAnySet={hasPlayedAnySet}
          />
        </div>

        {/* Right Column - Team Cards */}
        <div className="h-full">
          <TeamsOverview 
            teamA={matchData.teamA} 
            teamB={matchData.teamB} 
          />
        </div>
      </div>

      {/* Sets Layout */}
      <SetsGrid 
        scores={matchData.scores} 
        onScoreUpdate={onScoreUpdate} 
      />
    </div>
  );
};

export default DashboardContent;

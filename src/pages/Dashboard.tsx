
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/layout/Navbar";
import SetBox from "@/components/match/SetBox";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

// Mock data for today's match
const initialMatch = {
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
};

const Dashboard = () => {
  const { user } = useAuth();
  const [matchData, setMatchData] = useState(initialMatch);
  const isMobile = useIsMobile();

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

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

  const handleSetScoreUpdate = (setNumber: number, teamAScore: number, teamBScore: number) => {
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
          {/* Today's Game Overview */}
          <div className="mb-8">
            <h1 className="text-4xl font-serif mb-2">Today's Game Overview</h1>
            <p className="text-gray-600">{formatDate(matchData.date)}</p>
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
                    <span className="text-green-500">{teamAWins}</span> - <span className="text-purple-500">{teamBWins}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Team Cards */}
            <div className="h-full">
              <div className="flex h-full rounded-lg overflow-hidden border border-gray-200">
                {/* Team A Card */}
                <div className="w-1/2 bg-green-100 p-0">
                  <h3 className="bg-green-500 text-white py-1 px-2 text-center">Team A</h3>
                  <ul className="space-y-1 p-4">
                    {matchData.teamA.map((player) => (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium">{player.name.split(' ')[0]}</span> - <span className="text-gray-600">{player.position}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Team B Card */}
                <div className="w-1/2 bg-purple-100 p-0">
                  <h3 className="bg-purple-500 text-white py-1 px-2 text-center">Team B</h3>
                  <ul className="space-y-1 p-4">
                    {matchData.teamB.map((player) => (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium">{player.name.split(' ')[0]}</span> - <span className="text-gray-600">{player.position}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sets Layout - Grid with first box (Set 5) spanning 1 column and 2 rows */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Set 5 taking full height of 2 rows */}
            <div className="md:row-span-2">
              <SetBox
                key={5}
                setNumber={5}
                teamAScore={matchData.scores.find(score => score.gameNumber === 5)?.teamA}
                teamBScore={matchData.scores.find(score => score.gameNumber === 5)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>
            
            {/* Sets 1-4 */}
            {[1, 2, 3, 4].map((setNumber) => {
              const setData = matchData.scores.find(score => score.gameNumber === setNumber);
              return (
                <div key={setNumber}>
                  <SetBox
                    setNumber={setNumber}
                    teamAScore={setData?.teamA}
                    teamBScore={setData?.teamB}
                    onScoreUpdate={handleSetScoreUpdate}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

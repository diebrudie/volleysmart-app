
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import SetBox from "@/components/match/SetBox";

// Mock data for today's match
const todaysMatch = {
  date: new Date().toISOString(),
  teamA: [
    { id: 1, name: "Alex Johnson", position: "Setter" },
    { id: 2, name: "Maya Rivera", position: "Outside Hitter" },
    { id: 3, name: "Jordan Smith", position: "Middle Blocker" },
    { id: 4, name: "Taylor Lee", position: "Opposite Hitter" },
    { id: 5, name: "Casey Jones", position: "Libero" },
    { id: 6, name: "Sam Washington", position: "Outside Hitter" },
  ],
  teamB: [
    { id: 7, name: "Jamie Chen", position: "Setter" },
    { id: 8, name: "Riley Kim", position: "Outside Hitter" },
    { id: 9, name: "Morgan Patel", position: "Middle Blocker" },
    { id: 10, name: "Drew Garcia", position: "Opposite Hitter" },
    { id: 11, name: "Quinn Brown", position: "Libero" },
    { id: 12, name: "Avery Williams", position: "Outside Hitter" },
  ],
  scores: [
    { gameNumber: 1, teamA: 25, teamB: 19 },
    { gameNumber: 2, teamA: 27, teamB: 25 },
    { gameNumber: 3, teamA: 22, teamB: 25 },
    { gameNumber: 4, teamA: 25, teamB: 20 },
    { gameNumber: 5, teamA: 0, teamB: 0 }, // Not played yet
  ]
};

const Dashboard = () => {
  const { user } = useAuth();

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Calculate the match result
  const teamAWins = todaysMatch.scores.filter(game => game.teamA > game.teamB).length;
  const teamBWins = todaysMatch.scores.filter(game => game.teamB > game.teamA).length;
  
  // Determine the winner or if it's still TBD
  const getWinnerText = () => {
    if (teamAWins > teamBWins) return "Team A";
    if (teamBWins > teamAWins) return "Team B";
    return "TBD";
  };

  const handleSetScoreUpdate = (setNumber: number, teamAScore: number, teamBScore: number) => {
    console.log(`Set ${setNumber} updated: Team A ${teamAScore} - Team B ${teamBScore}`);
    // In a real app, this would update the backend
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Today's Game Overview */}
          <div className="mb-8">
            <h1 className="text-4xl font-serif mb-2">Today's Game Overview</h1>
            <p className="text-gray-600">{formatDate(todaysMatch.date)}</p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-8">
            {/* Winner Card */}
            <div className="mb-8">
              <div className="rounded-lg overflow-hidden border border-gray-200 max-w-2xl">
                <div className="bg-volleyball-primary text-white p-4 text-center">
                  <h2 className="text-2xl font-bold">WINNER</h2>
                </div>
                <div className="bg-white p-6 text-center">
                  <h3 className="text-3xl font-bold mb-4">{getWinnerText()}</h3>
                  <div className="text-5xl font-bold">
                    <span className="text-green-500">{teamAWins}</span> - <span className="text-purple-500">{teamBWins}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Set Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[1, 2, 3, 4, 5].map((setNum) => {
                const setData = todaysMatch.scores.find(s => s.gameNumber === setNum);
                return (
                  <SetBox 
                    key={setNum}
                    setNumber={setNum}
                    teamAScore={setData?.teamA}
                    teamBScore={setData?.teamB}
                    onScoreUpdate={handleSetScoreUpdate}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

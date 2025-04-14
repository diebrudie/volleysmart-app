
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import SetBox from "@/components/match/SetBox";
import { Pencil } from "lucide-react";

// Mock data for today's match
const todaysMatch = {
  date: new Date().toISOString(),
  teamA: [
    { id: 1, name: "Isabel", position: "Setter" },
    { id: 2, name: "Eduardo", position: "Outside Hitter" },
    { id: 3, name: "Carlotta", position: "Middle Blocker" },
    { id: 4, name: "Juan", position: "Opposite Hitter" },
    { id: 5, name: "Nacho", position: "Libero" },
    { id: 6, name: "Paco", position: "Outside Hitter" },
  ],
  teamB: [
    { id: 7, name: "Isabel", position: "Setter" },
    { id: 8, name: "Eduardo", position: "Outside Hitter" },
    { id: 9, name: "Carlotta", position: "Middle Blocker" },
    { id: 10, name: "Juan", position: "Opposite Hitter" },
    { id: 11, name: "Nacho", position: "Libero" },
    { id: 12, name: "Paco", position: "Outside Hitter" },
  ],
  scores: [
    { gameNumber: 1, teamA: 25, teamB: 19 },
    { gameNumber: 2, teamA: 27, teamB: 25 },
    { gameNumber: 3, teamA: 22, teamB: 25 },
    { gameNumber: 4, teamA: 25, teamB: 20 },
    { gameNumber: 5, teamA: 25, teamB: 18 }, // Updated to match screenshot
  ]
};

const Dashboard = () => {
  const { user } = useAuth();

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
  const teamAWins = todaysMatch.scores.filter(game => game.teamA > game.teamB).length;
  const teamBWins = todaysMatch.scores.filter(game => game.teamB > game.teamA).length;

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
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column - Winner Card */}
            <div className="md:w-1/3">
              <div className="rounded-lg overflow-hidden border border-gray-200 mb-8">
                <div className="bg-volleyball-primary text-white p-4 text-center">
                  <h2 className="text-2xl font-bold">WINNER</h2>
                </div>
                <div className="bg-white p-6 text-center">
                  <h3 className="text-3xl font-bold mb-4">Team A</h3>
                  <div className="text-5xl font-bold">
                    <span className="text-green-500">4</span> - <span className="text-purple-500">1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Team Lists */}
            <div className="md:w-2/3">
              <div className="flex justify-between mb-8">
                <div className="w-1/2 pr-4">
                  <h3 className="text-xl font-bold mb-4 text-green-500">TEAM A</h3>
                  <ul className="space-y-2">
                    {todaysMatch.teamA.map((player, index) => (
                      <li key={player.id} className="flex">
                        <span className="mr-2">{index + 1}.</span>
                        <span>{player.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-1/2 pl-4">
                  <h3 className="text-xl font-bold mb-4 text-purple-500">TEAM B</h3>
                  <ul className="space-y-2">
                    {todaysMatch.teamB.map((player, index) => (
                      <li key={player.id} className="flex">
                        <span className="mr-2">{index + 1}.</span>
                        <span>{player.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Set Boxes - Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Set 5 */}
            <div className="bg-volleyball-setYellow p-6 rounded-lg relative">
              <h3 className="text-xl font-serif mb-4 text-center">SET 5</h3>
              <div className="text-5xl font-bold mb-3 text-center">25 - 18</div>
              <p className="text-sm text-center">Team A vs. Team B</p>
              <button className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-md transition-colors">
                <Pencil className="h-5 w-5" />
              </button>
            </div>

            {/* Set 4 */}
            <div className="bg-volleyball-setYellow p-6 rounded-lg relative">
              <h3 className="text-xl font-serif mb-4 text-center">SET 4</h3>
              <div className="text-5xl font-bold mb-3 text-center">25 - 20</div>
              <p className="text-sm text-center">Team A vs. Team B</p>
              <button className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-md transition-colors">
                <Pencil className="h-5 w-5" />
              </button>
            </div>

            {/* Set 2 */}
            <div className="bg-volleyball-setYellow p-6 rounded-lg relative">
              <h3 className="text-xl font-serif mb-4 text-center">SET 2</h3>
              <div className="text-5xl font-bold mb-3 text-center">27 - 25</div>
              <p className="text-sm text-center">Team A vs. Team B</p>
              <button className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-md transition-colors">
                <Pencil className="h-5 w-5" />
              </button>
            </div>

            {/* Set 3 */}
            <div className="bg-volleyball-setYellow p-6 rounded-lg relative">
              <h3 className="text-xl font-serif mb-4 text-center">SET 3</h3>
              <div className="text-5xl font-bold mb-3 text-center">22 - 25</div>
              <p className="text-sm text-center">Team A vs. Team B</p>
              <button className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-md transition-colors">
                <Pencil className="h-5 w-5" />
              </button>
            </div>

            {/* Set 1 */}
            <div className="bg-volleyball-setYellow p-6 rounded-lg relative">
              <h3 className="text-xl font-serif mb-4 text-center">SET 1</h3>
              <div className="text-5xl font-bold mb-3 text-center">25 - 19</div>
              <p className="text-sm text-center">Team A vs. Team B</p>
              <button className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-md transition-colors">
                <Pencil className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

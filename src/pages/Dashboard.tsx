
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Users, 
  CircleUser, 
  BarChart2, 
  FileText, 
  Shuffle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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

// Mock data for recent matches
const recentMatches = [
  { id: 1, date: "2025-04-03", teamAScore: 3, teamBScore: 1 },
  { id: 2, date: "2025-03-27", teamAScore: 2, teamBScore: 3 },
  { id: 3, date: "2025-03-20", teamAScore: 3, teamBScore: 0 },
];

const Dashboard = () => {
  const { user } = useAuth();
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';

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

            {/* Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8">
              {/* Team A */}
              <div>
                <h3 className="text-2xl font-bold text-green-500 mb-4">TEAM A</h3>
                <ul className="space-y-2">
                  {todaysMatch.teamA.map((player, index) => (
                    <li key={player.id} className="flex items-center">
                      <span className="font-medium mr-2">{index + 1}.</span>
                      <span>{player.name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Team B */}
              <div>
                <h3 className="text-2xl font-bold text-purple-500 mb-4">TEAM B</h3>
                <ul className="space-y-2">
                  {todaysMatch.teamB.map((player, index) => (
                    <li key={player.id} className="flex items-center">
                      <span className="font-medium mr-2">{index + 1}.</span>
                      <span>{player.name}</span>
                    </li>
                  ))}
                </ul>
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

            {/* Quick Links Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Matches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {recentMatches.map(match => (
                        <li key={match.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <Link to={`/matches/${match.id}`} className="flex justify-between items-center hover:bg-gray-50 p-2 rounded-md transition-colors">
                            <div>
                              <p className="font-medium">{new Date(match.date).toLocaleDateString()}</p>
                              <p className="text-sm text-gray-500">Team A vs Team B</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{match.teamAScore} - {match.teamBScore}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      <Link to="/matches">
                        <Button variant="outline" className="w-full">View All Matches</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Link to="/matches" className="flex items-center p-3 hover:bg-gray-50 rounded-md transition-colors">
                      <div className="h-10 w-10 bg-volleyball-primary/10 rounded-md flex items-center justify-center mr-4">
                        <Calendar className="h-5 w-5 text-volleyball-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Match History</p>
                        <p className="text-sm text-gray-500">View all past matches</p>
                      </div>
                    </Link>
                    
                    <Link to="/players" className="flex items-center p-3 hover:bg-gray-50 rounded-md transition-colors">
                      <div className="h-10 w-10 bg-volleyball-primary/10 rounded-md flex items-center justify-center mr-4">
                        <Users className="h-5 w-5 text-volleyball-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Player Directory</p>
                        <p className="text-sm text-gray-500">Manage all players</p>
                      </div>
                    </Link>
                    
                    <Link to={`/players/${user?.id}`} className="flex items-center p-3 hover:bg-gray-50 rounded-md transition-colors">
                      <div className="h-10 w-10 bg-volleyball-primary/10 rounded-md flex items-center justify-center mr-4">
                        <CircleUser className="h-5 w-5 text-volleyball-primary" />
                      </div>
                      <div>
                        <p className="font-medium">My Profile</p>
                        <p className="text-sm text-gray-500">Edit your details</p>
                      </div>
                    </Link>

                    {isAdminOrEditor && (
                      <Link to="/generate-teams" className="flex items-center p-3 hover:bg-gray-50 rounded-md transition-colors">
                        <div className="h-10 w-10 bg-volleyball-primary/10 rounded-md flex items-center justify-center mr-4">
                          <Shuffle className="h-5 w-5 text-volleyball-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Team Generator</p>
                          <p className="text-sm text-gray-500">Create balanced teams</p>
                        </div>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;

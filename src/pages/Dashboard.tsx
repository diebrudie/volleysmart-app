
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Users, 
  Clipboard, 
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
    { gameNumber: 1, teamA: 25, teamB: 22 },
    { gameNumber: 2, teamA: 18, teamB: 25 },
    { gameNumber: 3, teamA: 25, teamB: 19 },
    { gameNumber: 4, teamA: 25, teamB: 21 },
  ]
};

// Mock data for recent matches
const recentMatches = [
  { id: 1, date: "2025-04-03", teamAScore: 3, teamBScore: 1 },
  { id: 2, date: "2025-03-27", teamAScore: 2, teamBScore: 3 },
  { id: 3, date: "2025-03-20", teamAScore: 3, teamBScore: 0 },
];

const Dashboard = () => {
  const { user, logout } = useAuth();
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={true} userRole={user?.role} onLogout={logout} />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
            <p className="text-gray-600">Here's what's happening with your volleyball matches.</p>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Today's Match Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="bg-volleyball-primary text-white">
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Today's Match Day
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    {formatDate(todaysMatch.date)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team A */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-volleyball-primary">Team A</h3>
                      <ul className="space-y-2">
                        {todaysMatch.teamA.map(player => (
                          <li key={player.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                            <div className="w-8 h-8 bg-volleyball-secondary rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {player.name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium">{player.name}</p>
                              <p className="text-xs text-gray-500">{player.position}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Team B */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-volleyball-accent">Team B</h3>
                      <ul className="space-y-2">
                        {todaysMatch.teamB.map(player => (
                          <li key={player.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                            <div className="w-8 h-8 bg-volleyball-accent rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {player.name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium">{player.name}</p>
                              <p className="text-xs text-gray-500">{player.position}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Game Results */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Game Results</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {todaysMatch.scores.map(score => (
                        <div key={score.gameNumber} className="bg-gray-50 p-3 rounded-md text-center">
                          <p className="text-xs font-medium text-gray-500">Game {score.gameNumber}</p>
                          <p className="text-lg font-bold">
                            <span className={score.teamA > score.teamB ? "text-volleyball-primary" : "text-gray-600"}>
                              {score.teamA}
                            </span>
                            {" - "}
                            <span className={score.teamB > score.teamA ? "text-volleyball-accent" : "text-gray-600"}>
                              {score.teamB}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={`/matches/${1}`}>
                      <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                    {isAdminOrEditor && (
                      <Link to="/generate-teams">
                        <Button>
                          <Shuffle className="mr-2 h-4 w-4" />
                          Generate New Teams
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links Section */}
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

              {/* Recent Matches Summary */}
              <Card className="mt-6">
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
                            <p className="text-sm text-gray-500">
                              Team A vs Team B
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {match.teamAScore} - {match.teamBScore}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <Link to="/matches">
                      <Button variant="outline" className="w-full">
                        View All Matches
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;

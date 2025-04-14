
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import SetBox from "@/components/match/SetBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

          {/* Main Content - Two Columns Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column - Winner Card + Sets */}
            <div className="lg:col-span-2">
              {/* Winner Card */}
              <div className="mb-8">
                <div className="rounded-lg overflow-hidden border border-gray-200">
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

            {/* Right Column - Team Lists */}
            <div className="lg:col-span-3">
              <Card className="mb-8">
                <CardHeader className="pb-2 border-b">
                  <CardTitle>Team Lineup</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Team A */}
                    <div className="p-4 border-b md:border-b-0 md:border-r">
                      <h3 className="text-lg font-bold mb-4 flex items-center">
                        <div className="h-6 w-6 rounded-full bg-volleyball-primary flex items-center justify-center text-white text-xs mr-2">
                          A
                        </div>
                        Team A
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {todaysMatch.teamA.map(player => (
                            <TableRow key={player.id}>
                              <TableCell className="py-2">{player.name}</TableCell>
                              <TableCell className="py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-volleyball-primary/10 text-volleyball-primary">
                                  {player.position}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Team B */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold mb-4 flex items-center">
                        <div className="h-6 w-6 rounded-full bg-volleyball-accent flex items-center justify-center text-volleyball-primary text-xs mr-2">
                          B
                        </div>
                        Team B
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {todaysMatch.teamB.map(player => (
                            <TableRow key={player.id}>
                              <TableCell className="py-2">{player.name}</TableCell>
                              <TableCell className="py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-volleyball-accent/10 text-volleyball-accent">
                                  {player.position}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;



import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Trophy, 
  Edit, 
  Save, 
  X, 
  Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mock match data with more details
const matchDetails = {
  id: 1,
  date: "2025-04-10T18:00:00.000Z",
  location: "Main Gym",
  duration: "2 hours",
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
  games: [
    { gameNumber: 1, teamA: 25, teamB: 22 },
    { gameNumber: 2, teamA: 18, teamB: 25 },
    { gameNumber: 3, teamA: 25, teamB: 19 },
    { gameNumber: 4, teamA: 25, teamB: 21 },
  ],
  notes: "Great match with excellent rallies. Team A's blocking was exceptional."
};

const MatchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [editing, setEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState(matchDetails);
  const [editedGames, setEditedGames] = useState(matchDetails.games);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
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
  
  const formatTime = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: 'numeric'
    };
    return new Date(dateString).toLocaleTimeString('en-US', options);
  };

  const handleSaveChanges = () => {
    // In a real app, this would send updates to the server
    toast({
      title: "Changes saved",
      description: "The match details have been updated.",
    });
    setEditing(false);
  };

  const handleDeleteMatch = () => {
    // In a real app, this would delete the match from the server
    toast({
      title: "Match deleted",
      description: "The match has been deleted.",
    });
    navigate("/matches");
  };

  const handleScoreChange = (gameIndex: number, team: 'teamA' | 'teamB', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      const newGames = [...editedGames];
      newGames[gameIndex] = {
        ...newGames[gameIndex],
        [team]: numValue,
      };
      setEditedGames(newGames);
    }
  };

  // Calculate total score
  const totalScore = {
    teamA: matchDetails.games.reduce((sum, game) => sum + game.teamA, 0),
    teamB: matchDetails.games.reduce((sum, game) => sum + game.teamB, 0),
  };

  // Determine match winner
  const matchWinner = matchDetails.games.filter(g => g.teamA > g.teamB).length > 
                     matchDetails.games.filter(g => g.teamB > g.teamA).length 
                     ? "Team A" : "Team B";
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={true} userRole={user?.role} onLogout={logout} />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="icon" 
                className="mr-4" 
                onClick={() => navigate('/matches')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Match Day Details</h1>
            </div>
            {isAdminOrEditor && (
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditing(false)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button onClick={handleSaveChanges}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditing(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Match
                    </Button>
                    <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Are you sure you want to delete?</DialogTitle>
                          <DialogDescription>
                            This action cannot be undone. This will permanently delete the match and all associated data.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleDeleteMatch}>
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Match Details Card */}
          <Card className="mb-8">
            <CardHeader className="bg-volleyball-primary text-white">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Match on {formatDate(matchDetails.date)}
                </div>
                <div className="text-2xl font-bold">
                  <span className={matchWinner === "Team A" ? "text-white" : "text-white/70"}>
                    {matchDetails.games.filter(g => g.teamA > g.teamB).length}
                  </span>
                  {" - "}
                  <span className={matchWinner === "Team B" ? "text-white" : "text-white/70"}>
                    {matchDetails.games.filter(g => g.teamB > g.teamA).length}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-volleyball-primary mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{matchDetails.location}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-volleyball-primary mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium">{formatTime(matchDetails.date)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Trophy className="h-5 w-5 text-volleyball-primary mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Winner</p>
                    <p className="font-medium">{matchWinner}</p>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <h3 className="font-medium mb-2">Match Notes</h3>
                {editing ? (
                  <textarea
                    className="w-full p-2 border rounded-md"
                    rows={3}
                    value={editedMatch.notes}
                    onChange={(e) => setEditedMatch({...editedMatch, notes: e.target.value})}
                  />
                ) : (
                  <p className="text-gray-700">{matchDetails.notes}</p>
                )}
              </div>

              {/* Tab Navigation for Team/Game details */}
              <Tabs defaultValue="teams">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="teams">Teams</TabsTrigger>
                  <TabsTrigger value="games">Game Scores</TabsTrigger>
                </TabsList>
                
                {/* Teams Tab */}
                <TabsContent value="teams">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Team A */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <div className="h-6 w-6 rounded-full bg-volleyball-primary flex items-center justify-center text-white text-xs mr-2">
                          A
                        </div>
                        Team A
                      </h3>
                      <ul className="space-y-2">
                        {matchDetails.teamA.map(player => (
                          <li key={player.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                            <div className="w-8 h-8 bg-volleyball-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
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
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <div className="h-6 w-6 rounded-full bg-volleyball-accent flex items-center justify-center text-white text-xs mr-2">
                          B
                        </div>
                        Team B
                      </h3>
                      <ul className="space-y-2">
                        {matchDetails.teamB.map(player => (
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
                </TabsContent>
                
                {/* Games Tab */}
                <TabsContent value="games">
                  <div className="mt-6">
                    <div className="rounded-md border overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Game
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team A
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team B
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Winner
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(editing ? editedGames : matchDetails.games).map((game, index) => (
                            <tr key={game.gameNumber}>
                              <td className="px-6 py-4 whitespace-nowrap font-medium">
                                Game {game.gameNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                {editing ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    value={game.teamA}
                                    onChange={(e) => handleScoreChange(index, 'teamA', e.target.value)}
                                    className="w-16 inline-block text-right"
                                  />
                                ) : (
                                  <span className={game.teamA > game.teamB ? "font-bold text-volleyball-primary" : ""}>
                                    {game.teamA}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                {editing ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    value={game.teamB}
                                    onChange={(e) => handleScoreChange(index, 'teamB', e.target.value)}
                                    className="w-16 inline-block text-right"
                                  />
                                ) : (
                                  <span className={game.teamB > game.teamA ? "font-bold text-volleyball-accent" : ""}>
                                    {game.teamB}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  game.teamA > game.teamB 
                                    ? 'bg-volleyball-primary/10 text-volleyball-primary' 
                                    : 'bg-volleyball-accent/10 text-volleyball-accent'
                                }`}>
                                  {game.teamA > game.teamB ? "Team A" : "Team B"}
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-6 py-4 whitespace-nowrap">
                              Total Points
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {totalScore.teamA}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {totalScore.teamB}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                matchWinner === 'Team A' 
                                  ? 'bg-volleyball-primary/10 text-volleyball-primary' 
                                  : 'bg-volleyball-accent/10 text-volleyball-accent'
                              }`}>
                                {totalScore.teamA > totalScore.teamB ? "Team A" : "Team B"} (by points)
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MatchDetail;

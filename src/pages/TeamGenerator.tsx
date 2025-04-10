
import { useState } from "react";
import { 
  Users, 
  Shuffle, 
  CheckSquare, 
  Copy, 
  Save, 
  AlertCircle, 
  ArrowRight, 
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mock players data
const allPlayers = Array.from({ length: 24 }, (_, i) => {
  const positions = ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero"];
  const randomPositions = [];
  const numPositions = Math.floor(Math.random() * 2) + 1; // 1-2 positions per player
  
  for (let j = 0; j < numPositions; j++) {
    const pos = positions[Math.floor(Math.random() * positions.length)];
    if (!randomPositions.includes(pos)) {
      randomPositions.push(pos);
    }
  }
  
  return {
    id: i + 1,
    name: [
      "Alex Johnson", "Maya Rivera", "Jordan Smith", "Taylor Lee", "Casey Jones", 
      "Sam Washington", "Jamie Chen", "Riley Kim", "Morgan Patel", "Drew Garcia", 
      "Quinn Brown", "Avery Williams", "Cameron Nguyen", "Dakota Wilson", "Emerson Davis",
      "Finley Moore", "Gray Thompson", "Harper Martin", "Indigo Clark", "Jordan Allen",
      "Kendall Baker", "Logan Hall", "Mason Wright", "Noah Turner"
    ][i],
    positions: randomPositions,
    preferredPosition: randomPositions[0],
    skillRating: Math.floor(Math.random() * 3) + 3, // Rating 3-5
    availability: Math.random() > 0.2, // 80% available
  };
});

const TeamGenerator = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [generatedTeams, setGeneratedTeams] = useState<{ teamA: any[]; teamB: any[] } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [matchDetails, setMatchDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    location: "Main Gym",
    notes: ""
  });
  
  const canGenerateTeams = selectedPlayers.length >= 6;
  
  const handlePlayerSelection = (playerId: number) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const generateTeams = () => {
    if (selectedPlayers.length < 6) {
      toast({
        title: "Not enough players",
        description: "Please select at least 6 players to generate teams.",
        variant: "destructive"
      });
      return;
    }
    
    // Get the selected player objects
    const players = selectedPlayers.map(id => allPlayers.find(p => p.id === id));
    
    // For this demo, we'll just split the players randomly, but in a real app 
    // this would use a more sophisticated algorithm for fair team generation
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    
    const halfIndex = Math.ceil(shuffled.length / 2);
    
    setGeneratedTeams({
      teamA: shuffled.slice(0, halfIndex),
      teamB: shuffled.slice(halfIndex)
    });
    
    toast({
      title: "Teams generated",
      description: `Created 2 teams with ${halfIndex} players each.`,
    });
  };

  const regenerateTeams = () => {
    generateTeams();
    toast({
      title: "Teams regenerated",
      description: "New teams have been created with the same players.",
    });
  };

  const handleSaveMatch = () => {
    // In a real app, this would save the teams and match details to the database
    toast({
      title: "Match day saved",
      description: "New match day has been created with these teams.",
    });
    setSaveDialogOpen(false);
    // Navigate to the match day detail page would happen here
  };

  const copyTeams = () => {
    if (!generatedTeams) return;
    
    let text = "Volleyball Teams\n\n";
    
    text += "Team A:\n";
    generatedTeams.teamA.forEach(player => {
      text += `${player.name} (${player.preferredPosition})\n`;
    });
    
    text += "\nTeam B:\n";
    generatedTeams.teamB.forEach(player => {
      text += `${player.name} (${player.preferredPosition})\n`;
    });
    
    navigator.clipboard.writeText(text);
    
    toast({
      title: "Teams copied",
      description: "Team details copied to clipboard.",
    });
  };

  // Available player positions for filtering
  const positions = ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero"];
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={true} userRole={user?.role} onLogout={logout} />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Team Generator</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Player Selection Section */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="bg-volleyball-primary text-white">
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Select Players
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Choose who's playing today
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4 bg-amber-50 border-b">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                      <p className="text-sm text-amber-800">
                        Select at least 6 players to generate teams
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm font-medium">
                        {selectedPlayers.length} players selected
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedPlayers([])}
                        disabled={selectedPlayers.length === 0}
                      >
                        Clear selection
                      </Button>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      disabled={!canGenerateTeams}
                      onClick={generateTeams}
                    >
                      <Shuffle className="mr-2 h-4 w-4" />
                      Generate Teams
                    </Button>
                  </div>
                  
                  <div className="border-t">
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                      {allPlayers.map(player => (
                        <div 
                          key={player.id} 
                          className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${
                            !player.availability ? 'opacity-50' : ''
                          }`}
                        >
                          <Checkbox 
                            id={`player-${player.id}`}
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={() => handlePlayerSelection(player.id)}
                            disabled={!player.availability}
                          />
                          <div className="ml-3 flex-grow">
                            <label 
                              htmlFor={`player-${player.id}`}
                              className="font-medium text-gray-900 cursor-pointer"
                            >
                              {player.name}
                            </label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {player.positions.map(position => (
                                <span 
                                  key={position} 
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    position === player.preferredPosition
                                      ? 'bg-volleyball-primary/10 text-volleyball-primary'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {position}
                                  {position === player.preferredPosition && '*'}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star 
                                key={star} 
                                filled={star <= player.skillRating} 
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Generated Teams Section */}
            <div className="lg:col-span-2">
              {generatedTeams ? (
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Generated Teams</CardTitle>
                        <CardDescription>
                          {generatedTeams.teamA.length} players in Team A, {generatedTeams.teamB.length} players in Team B
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={regenerateTeams}>
                          <Shuffle className="mr-2 h-4 w-4" />
                          Regenerate
                        </Button>
                        <Button variant="outline" onClick={copyTeams}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                          <DialogTrigger asChild>
                            <Button>
                              <Save className="mr-2 h-4 w-4" />
                              Save Match
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Save Match Day</DialogTitle>
                              <DialogDescription>
                                Enter details for this match day to save it.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="match-date" className="text-right">
                                  Date
                                </Label>
                                <Input
                                  id="match-date"
                                  type="date"
                                  className="col-span-3"
                                  value={matchDetails.date}
                                  onChange={(e) => setMatchDetails({...matchDetails, date: e.target.value})}
                                />
                              </div>
                              
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="match-location" className="text-right">
                                  Location
                                </Label>
                                <Input
                                  id="match-location"
                                  className="col-span-3"
                                  value={matchDetails.location}
                                  onChange={(e) => setMatchDetails({...matchDetails, location: e.target.value})}
                                />
                              </div>
                              
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="match-notes" className="text-right">
                                  Notes
                                </Label>
                                <Textarea
                                  id="match-notes"
                                  className="col-span-3"
                                  rows={3}
                                  value={matchDetails.notes}
                                  onChange={(e) => setMatchDetails({...matchDetails, notes: e.target.value})}
                                />
                              </div>
                            </div>
                            
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveMatch}>
                                Save Match Day
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      {/* Team A */}
                      <div className="p-6 border-b md:border-b-0 md:border-r">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
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
                              <TableHead>Rating</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generatedTeams.teamA.map(player => (
                              <TableRow key={player.id}>
                                <TableCell className="font-medium">{player.name}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-volleyball-primary/10 text-volleyball-primary">
                                    {player.preferredPosition}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star 
                                        key={star} 
                                        filled={star <= player.skillRating} 
                                        small
                                      />
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Team B */}
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <div className="h-6 w-6 rounded-full bg-volleyball-accent flex items-center justify-center text-white text-xs mr-2">
                            B
                          </div>
                          Team B
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Position</TableHead>
                              <TableHead>Rating</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generatedTeams.teamB.map(player => (
                              <TableRow key={player.id}>
                                <TableCell className="font-medium">{player.name}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-volleyball-accent/10 text-volleyball-accent">
                                    {player.preferredPosition}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star 
                                        key={star} 
                                        filled={star <= player.skillRating}
                                        small
                                      />
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 p-12">
                  <div className="text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No teams generated yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select at least 6 players from the list and click "Generate Teams"
                    </p>
                    <div className="mt-6">
                      <Button
                        disabled={!canGenerateTeams}
                        onClick={generateTeams}
                      >
                        <Shuffle className="mr-2 h-4 w-4" />
                        Generate Teams
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Star component
const Star = ({ filled, small = false }: { filled: boolean, small?: boolean }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${
        small ? 'h-3 w-3' : 'h-4 w-4'
      } ${
        filled ? 'text-yellow-400' : 'text-gray-300'
      }`}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
};

export default TeamGenerator;

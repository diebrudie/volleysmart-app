
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, PlusCircle, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mock players data
const playersData = Array.from({ length: 24 }, (_, i) => {
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
    email: `player${i + 1}@example.com`,
    positions: randomPositions,
    availability: Math.random() > 0.2, // 80% available
    matchesPlayed: Math.floor(Math.random() * 20),
    rating: Math.floor(Math.random() * 3) + 3, // Rating 3-5
    isPublic: Math.random() > 0.3, // 70% public profiles
  };
});

const Players = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  
  const isAdmin = user?.role === 'admin';

  // Filter players
  const filteredPlayers = playersData.filter(player => {
    // Filter by search term (in name or email)
    const matchesSearch = 
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by position
    const matchesPosition = 
      positionFilter === "all" || 
      player.positions.includes(positionFilter);
    
    // Filter by availability
    const matchesAvailability = 
      availabilityFilter === "all" || 
      (availabilityFilter === "available" && player.availability) ||
      (availabilityFilter === "unavailable" && !player.availability);
    
    return matchesSearch && matchesPosition && matchesAvailability;
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would generate an invite and send it
    setInviteLink(`https://volleyteam.app/invite/${Math.random().toString(36).substr(2, 9)}`);
    toast({
      title: "Invitation ready",
      description: "You can now share the invitation link.",
    });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    toast({
      title: "Link copied",
      description: "Invitation link copied to clipboard.",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const positions = ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero"];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={true} userRole={user?.role} onLogout={logout} />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Players</h1>
            
            {isAdmin && (
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Invite Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite a new player</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your volleyball team.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleInviteSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="player@example.com"
                          className="col-span-3"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                        />
                      </div>
                      
                      {inviteLink && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">
                            Invite Link
                          </Label>
                          <div className="col-span-3 flex">
                            <Input
                              value={inviteLink}
                              readOnly
                              className="rounded-r-none"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="rounded-l-none border-l-0"
                              onClick={copyInviteLink}
                            >
                              {linkCopied ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <DialogFooter>
                      {!inviteLink ? (
                        <Button type="submit">Generate Invite</Button>
                      ) : (
                        <Button type="button" onClick={() => setShowInviteDialog(false)}>
                          Done
                        </Button>
                      )}
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Player Directory</CardTitle>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search players..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={positionFilter} 
                      onValueChange={setPositionFilter}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        {positions.map(position => (
                          <SelectItem key={position} value={position}>{position}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={availabilityFilter} 
                      onValueChange={setAvailabilityFilter}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Players</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No players match your search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPlayers.map(player => (
                    <Link to={`/players/${player.id}`} key={player.id}>
                      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-volleyball-primary/10 h-24 flex items-center justify-center">
                          <div className="h-16 w-16 rounded-full bg-volleyball-primary flex items-center justify-center text-white text-xl font-bold">
                            {player.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900">{player.name}</h3>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {player.positions.map(position => (
                              <span key={position} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {position}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              player.availability
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {player.availability ? 'Available' : 'Unavailable'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {player.matchesPlayed} matches
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Players;


import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Calendar, 
  Trophy, 
  Star, 
  Edit, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mock player data
const playerData = {
  id: 1,
  name: "Alex Johnson",
  email: "alex.johnson@example.com",
  bio: "Volleyball enthusiast with 5 years of experience playing in community leagues. Strongest as a setter but can also play as an outside hitter when needed.",
  positions: ["Setter", "Outside Hitter"],
  preferredPosition: "Setter",
  joinedDate: "2024-10-15",
  matchesPlayed: 17,
  availability: true,
  skillRating: 4,
  isPublic: true,
  recentMatches: [
    { id: 1, date: "2025-04-03", result: "Win", position: "Setter" },
    { id: 2, date: "2025-03-27", result: "Loss", position: "Setter" },
    { id: 3, date: "2025-03-20", result: "Win", position: "Outside Hitter" },
  ],
  stats: {
    wins: 12,
    losses: 5,
    winPercentage: 70.6,
    positionBreakdown: [
      { position: "Setter", count: 14 },
      { position: "Outside Hitter", count: 3 },
    ]
  }
};

const PlayerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedPlayer, setEditedPlayer] = useState(playerData);
  
  // Determine if the current user can edit this profile
  const isCurrentUserProfile = user?.id === id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isCurrentUserProfile || isAdmin;
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleSaveChanges = () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      // In a real app, this would send updates to the server
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setSaving(false);
      setEditing(false);
    }, 1000);
  };

  // Available positions for selection
  const availablePositions = [
    "Setter", 
    "Outside Hitter", 
    "Middle Blocker", 
    "Opposite Hitter", 
    "Libero"
  ];

  const handlePositionChange = (position: string, checked: boolean) => {
    const newPositions = checked
      ? [...editedPlayer.positions, position]
      : editedPlayer.positions.filter(pos => pos !== position);
    
    setEditedPlayer({...editedPlayer, positions: newPositions});
  };

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
                onClick={() => navigate('/players')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Player Profile</h1>
            </div>
            
            {canEdit && (
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditing(false)}
                      disabled={saving}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveChanges}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Profile Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <Card>
                <CardHeader className="text-center">
                  <div className="mx-auto h-24 w-24 rounded-full bg-volleyball-primary flex items-center justify-center text-white text-3xl font-bold mb-2">
                    {editedPlayer.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  {editing ? (
                    <Input
                      value={editedPlayer.name}
                      onChange={(e) => setEditedPlayer({...editedPlayer, name: e.target.value})}
                      className="text-xl font-bold text-center"
                    />
                  ) : (
                    <CardTitle>{editedPlayer.name}</CardTitle>
                  )}
                  <CardDescription className="flex items-center justify-center">
                    {editedPlayer.preferredPosition} {/* This doesn't change during edit for simplicity */}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-volleyball-primary mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Member since</p>
                        <p>{formatDate(editedPlayer.joinedDate)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-volleyball-primary mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        {editing ? (
                          <Input
                            value={editedPlayer.email}
                            onChange={(e) => setEditedPlayer({...editedPlayer, email: e.target.value})}
                            type="email"
                          />
                        ) : (
                          <p>{editedPlayer.email}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Trophy className="h-5 w-5 text-volleyball-primary mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Matches played</p>
                        <p>{editedPlayer.matchesPlayed}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-volleyball-primary mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Skill rating</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${
                                star <= editedPlayer.skillRating 
                                  ? 'text-yellow-400 fill-yellow-400' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Public Profile Toggle */}
                    {(isCurrentUserProfile || isAdmin) && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {editedPlayer.isPublic ? (
                              <Eye className="h-5 w-5 text-volleyball-primary mr-2" />
                            ) : (
                              <EyeOff className="h-5 w-5 text-gray-400 mr-2" />
                            )}
                            <span>Public profile</span>
                          </div>
                          <Switch 
                            checked={editedPlayer.isPublic} 
                            onCheckedChange={(checked) => setEditedPlayer({...editedPlayer, isPublic: checked})}
                            disabled={!editing}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {editedPlayer.isPublic 
                            ? "Your profile is visible to all team members" 
                            : "Your profile is only visible to team admins"}
                        </p>
                      </div>
                    )}
                    
                    {/* Availability Toggle */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span>Available for matches</span>
                        <Switch 
                          checked={editedPlayer.availability} 
                          onCheckedChange={(checked) => setEditedPlayer({...editedPlayer, availability: checked})}
                          disabled={!editing}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Textarea
                      value={editedPlayer.bio}
                      onChange={(e) => setEditedPlayer({...editedPlayer, bio: e.target.value})}
                      rows={5}
                      placeholder="Tell us a bit about yourself as a player..."
                    />
                  ) : (
                    <p className="text-gray-700">{editedPlayer.bio}</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Positions</CardTitle>
                  <CardDescription>
                    {editing 
                      ? "Select the positions you can play" 
                      : "Positions this player can play"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-4">
                      {availablePositions.map(position => (
                        <div key={position} className="flex items-center space-x-2">
                          <Switch 
                            id={`position-${position}`}
                            checked={editedPlayer.positions.includes(position)}
                            onCheckedChange={(checked) => handlePositionChange(position, checked)}
                          />
                          <Label htmlFor={`position-${position}`}>{position}</Label>
                        </div>
                      ))}
                      
                      <div className="mt-6">
                        <Label htmlFor="preferred-position">Preferred Position</Label>
                        <Select 
                          value={editedPlayer.preferredPosition}
                          onValueChange={(value) => setEditedPlayer({...editedPlayer, preferredPosition: value})}
                        >
                          <SelectTrigger id="preferred-position" className="mt-1">
                            <SelectValue placeholder="Select preferred position" />
                          </SelectTrigger>
                          <SelectContent>
                            {editedPlayer.positions.map(position => (
                              <SelectItem key={position} value={position}>
                                {position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-2">
                        {editedPlayer.positions.map(position => (
                          <div 
                            key={position} 
                            className={`px-4 py-2 rounded-md ${
                              position === editedPlayer.preferredPosition
                                ? 'bg-volleyball-primary text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {position}
                            {position === editedPlayer.preferredPosition && (
                              <span className="ml-2 text-xs">(Preferred)</span>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Position Breakdown</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {editedPlayer.stats.positionBreakdown.map(item => (
                            <div key={item.position} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                              <span>{item.position}</span>
                              <span className="text-sm font-medium">{item.count} matches</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Recent Matches - Only shown in view mode, not in edit mode */}
              {!editing && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Recent Matches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left">Date</th>
                            <th className="px-6 py-3 text-left">Position</th>
                            <th className="px-6 py-3 text-left">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {editedPlayer.recentMatches.map(match => (
                            <tr key={match.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">{formatDate(match.date)}</td>
                              <td className="px-6 py-4">{match.position}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  match.result === 'Win' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {match.result}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-md text-center">
                        <div className="text-2xl font-bold text-volleyball-primary">
                          {editedPlayer.stats.wins}
                        </div>
                        <div className="text-sm text-gray-500">Wins</div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md text-center">
                        <div className="text-2xl font-bold text-red-500">
                          {editedPlayer.stats.losses}
                        </div>
                        <div className="text-sm text-gray-500">Losses</div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md text-center">
                        <div className="text-2xl font-bold text-blue-500">
                          {editedPlayer.stats.winPercentage}%
                        </div>
                        <div className="text-sm text-gray-500">Win Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlayerDetail;

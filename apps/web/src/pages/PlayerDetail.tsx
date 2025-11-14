import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Edit,
  Save,
  X,
  Mail,
  Phone,
  Calendar,
  Award,
  Shield,
  Activity,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mock player data
const playerData = {
  id: 1,
  name: "Alex Johnson",
  email: "alex.johnson@example.com",
  phone: "123-456-7890",
  positions: ["Setter", "Outside Hitter"],
  availability: true,
  skillRating: 8,
  matchesPlayed: 25,
  dateJoined: "2024-01-15",
  location: "Main Gym",
  bio: "A dedicated player with a passion for volleyball. Alex excels in both setting and hitting, bringing versatility to the team.",
  achievements: ["Team MVP - 2023 Season", "All-Star Selection - 2022"],
  stats: {
    kills: 250,
    assists: 450,
    blocks: 50,
    aces: 30,
  },
};

const PlayerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editedPlayer, setEditedPlayer] = useState(playerData);

  const handleSaveChanges = () => {
    // In a real app, this would send updates to the server
    toast({
      title: "Changes saved",
      description: "The player details have been updated.",
      duration: 1500,
    });
    setEditing(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="mr-4"
              onClick={() => navigate("/players")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Player Details</h1>
          </div>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b">
              <div className="flex items-center">
                <Avatar className="mr-4 h-12 w-12">
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt={playerData.name}
                  />
                  <AvatarFallback>{playerData.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{playerData.name}</CardTitle>
                  <p className="text-sm text-gray-500">
                    {playerData.positions.join(", ")}
                  </p>
                </div>
              </div>
              {editing ? (
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveChanges}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-500">
                        <Mail className="mr-2 inline-block h-4 w-4" />
                        {playerData.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-gray-500">
                        <Phone className="mr-2 inline-block h-4 w-4" />
                        {playerData.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Location
                      </p>
                      <p className="text-gray-500">
                        <MapPin className="mr-2 inline-block h-4 w-4" />
                        {playerData.location}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Joined Date
                      </p>
                      <p className="text-gray-500">
                        <Calendar className="mr-2 inline-block h-4 w-4" />
                        {new Date(playerData.dateJoined).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bio</p>
                    <p className="text-gray-500">{playerData.bio}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Positions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {playerData.positions.map((position, index) => (
                        <Badge key={index}>{position}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Achievements
                    </p>
                    <ul className="list-disc pl-5 text-gray-500">
                      {playerData.achievements.map((achievement, index) => (
                        <li key={index}>{achievement}</li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>
                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-3xl font-bold">
                        {playerData.stats.kills}
                      </p>
                      <p className="text-sm text-gray-500">Kills</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {playerData.stats.assists}
                      </p>
                      <p className="text-sm text-gray-500">Assists</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {playerData.stats.blocks}
                      </p>
                      <p className="text-sm text-gray-500">Blocks</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {playerData.stats.aces}
                      </p>
                      <p className="text-sm text-gray-500">Aces</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Skill Rating
                      </p>
                      <div className="flex items-center">
                        <Award className="mr-2 h-4 w-4 text-yellow-500" />
                        <p className="text-xl font-semibold">
                          {playerData.skillRating}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Matches Played
                      </p>
                      <div className="flex items-center">
                        <Shield className="mr-2 h-4 w-4 text-blue-500" />
                        <p className="text-xl font-semibold">
                          {playerData.matchesPlayed}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Recent Activity
                    </p>
                    <ul className="list-disc pl-5 text-gray-500">
                      <li>Played in Match vs Team B on April 5, 2024</li>
                      <li>Achieved 15 kills in the above match</li>
                      <li>Practiced setting drills on April 4, 2024</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Training Sessions
                    </p>
                    <p className="text-gray-500">
                      Next session scheduled for April 12, 2024
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Activity className="mr-2 h-4 w-4 text-purple-500" />
                    <p className="text-sm font-medium text-gray-700">
                      Overall Performance: Good
                    </p>
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

export default PlayerDetail;

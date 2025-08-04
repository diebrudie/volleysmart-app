import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Shuffle, Save, Edit2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useClub } from "@/contexts/ClubContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortablePlayer } from "@/components/team-generator/SortablePlayer";

// Mock positions data
const mockPositions = [
  { id: "1", name: "Setter" },
  { id: "2", name: "Outside Hitter" },
  { id: "3", name: "Middle Blocker" },
  { id: "4", name: "Opposite Hitter" },
  { id: "5", name: "Libero" },
];

interface EditPlayer {
  id: string;
  name: string;
  preferredPosition: string;
  skillRating: number;
}

interface GamePlayerData {
  player_id: string;
  team_name: string;
  position_played: string | null;
  players: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface MatchDayData {
  id: string;
  date: string;
  notes: string | null;
  game_players: GamePlayerData[];
}

const EditGame = () => {
  const { clubId, gameId } = useParams(); // gameId is actually match_day_id
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setClubId } = useClub();
  const { user } = useAuth();

  const [date, setDate] = useState<Date>(new Date());
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [teamAPlayers, setTeamAPlayers] = useState<EditPlayer[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<EditPlayer[]>([]);

  // Fetch real game data
  const { data: gameData, isLoading } = useQuery({
    queryKey: ["gameData", gameId],
    queryFn: async (): Promise<MatchDayData | null> => {
      if (!gameId) return null;

      console.log("=== FETCHING GAME DATA FOR EDIT ===");
      console.log("Game ID (match_day_id):", gameId);

      // Get the match day
      const { data: matchDay, error: matchDayError } = await supabase
        .from("match_days")
        .select("id, date, notes")
        .eq("id", gameId)
        .single();

      if (matchDayError) {
        console.error("Match day error:", matchDayError);
        throw matchDayError;
      }

      // Get game players with player details
      const { data: gamePlayersRaw, error: gamePlayersError } = await supabase
        .from("game_players")
        .select("player_id, team_name, position_played")
        .eq("match_day_id", gameId);

      if (gamePlayersError) {
        console.error("Game players error:", gamePlayersError);
        throw gamePlayersError;
      }

      let gamePlayers = [];

      if (gamePlayersRaw && gamePlayersRaw.length > 0) {
        const playerIds = gamePlayersRaw.map((gp) => gp.player_id);

        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, first_name, last_name")
          .in("id", playerIds);

        if (playersError) {
          console.error("Players error:", playersError);
          throw playersError;
        }

        if (playersData) {
          gamePlayers = gamePlayersRaw.map((gp) => {
            const player = playersData.find((p) => p.id === gp.player_id);
            return {
              player_id: gp.player_id,
              team_name: gp.team_name,
              position_played: gp.position_played,
              players: player || {
                id: gp.player_id,
                first_name: "Unknown",
                last_name: "Player",
              },
            };
          });
        }
      }

      return {
        ...matchDay,
        game_players: gamePlayers || [],
      };
    },
    enabled: !!gameId,
  });

  // Update teams when game data loads
  useEffect(() => {
    if (gameData?.game_players) {
      console.log("=== CONVERTING GAME DATA TO TEAMS ===");
      console.log("Game players:", gameData.game_players);

      const teamA = gameData.game_players
        .filter((gp) => gp.team_name === "team_a")
        .map((gp) => ({
          id: gp.player_id,
          name: `${gp.players.first_name} ${gp.players.last_name}`,
          preferredPosition: gp.position_played || "No Position",
          skillRating: 7, // Default skill rating
        }));

      const teamB = gameData.game_players
        .filter((gp) => gp.team_name === "team_b")
        .map((gp) => ({
          id: gp.player_id,
          name: `${gp.players.first_name} ${gp.players.last_name}`,
          preferredPosition: gp.position_played || "No Position",
          skillRating: 7, // Default skill rating
        }));

      setTeamAPlayers(teamA);
      setTeamBPlayers(teamB);

      // Set the date from game data
      if (gameData.date) {
        setDate(new Date(gameData.date));
      }

      console.log("Team A players:", teamA);
      console.log("Team B players:", teamB);
    }
  }, [gameData]);

  useEffect(() => {
    if (clubId) {
      setClubId(clubId);
    }
  }, [clubId, setClubId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading game data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no game data
  if (!gameData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600">Game not found</p>
            <Button
              onClick={() => navigate(`/dashboard/${clubId}`)}
              className="mt-4"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const [sourceTeam, sourceId] = activeId.split("-");
    const [targetTeam, targetId] = overId.split("-");

    if (sourceTeam === targetTeam) {
      // Moving within same team
      if (sourceTeam === "A") {
        setTeamAPlayers((currentPlayers) => {
          const oldIndex = currentPlayers.findIndex(
            (p) => String(p.id) === sourceId
          );
          const newIndex = currentPlayers.findIndex(
            (p) => String(p.id) === targetId
          );
          return arrayMove(currentPlayers, oldIndex, newIndex);
        });
      } else {
        setTeamBPlayers((currentPlayers) => {
          const oldIndex = currentPlayers.findIndex(
            (p) => String(p.id) === sourceId
          );
          const newIndex = currentPlayers.findIndex(
            (p) => String(p.id) === targetId
          );
          return arrayMove(currentPlayers, oldIndex, newIndex);
        });
      }
    } else {
      // Moving between teams
      let playerToMove;

      if (sourceTeam === "A") {
        playerToMove = teamAPlayers.find((p) => String(p.id) === sourceId);
        if (playerToMove) {
          setTeamAPlayers((currentPlayers) =>
            currentPlayers.filter((p) => String(p.id) !== sourceId)
          );
          setTeamBPlayers((currentPlayers) => {
            const targetIndex = currentPlayers.findIndex(
              (p) => String(p.id) === targetId
            );
            const newPlayers = [...currentPlayers];
            newPlayers.splice(targetIndex, 0, playerToMove!);
            return newPlayers;
          });
        }
      } else {
        playerToMove = teamBPlayers.find((p) => String(p.id) === sourceId);
        if (playerToMove) {
          setTeamBPlayers((currentPlayers) =>
            currentPlayers.filter((p) => String(p.id) !== sourceId)
          );
          setTeamAPlayers((currentPlayers) => {
            const targetIndex = currentPlayers.findIndex(
              (p) => String(p.id) === targetId
            );
            const newPlayers = [...currentPlayers];
            newPlayers.splice(targetIndex, 0, playerToMove!);
            return newPlayers;
          });
        }
      }
    }
  };

  const handleShuffleTeams = () => {
    // Combine all players and shuffle them randomly into teams
    const allPlayers = [...teamAPlayers, ...teamBPlayers];
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);

    const midPoint = Math.ceil(shuffled.length / 2);
    setTeamAPlayers(shuffled.slice(0, midPoint));
    setTeamBPlayers(shuffled.slice(midPoint));

    toast({
      title: "Teams shuffled",
      description: "Teams have been randomly reorganized.",
    });
  };

  const handlePositionChange = (playerId: string, newPosition: string) => {
    const updatePlayerPosition = (players: typeof teamAPlayers) =>
      players.map((player) =>
        player.id === playerId
          ? { ...player, preferredPosition: newPosition }
          : player
      );

    // Check which team the player is in
    if (teamAPlayers.some((p) => p.id === playerId)) {
      setTeamAPlayers(updatePlayerPosition);
    } else {
      setTeamBPlayers(updatePlayerPosition);
    }

    setEditingPlayer(null);
    toast({
      title: "Position updated",
      description: "Player position has been changed.",
    });
  };

  const handleSave = async () => {
    if (!gameId) return;

    try {
      console.log("=== SAVING TEAM CHANGES ===");
      console.log("Team A players:", teamAPlayers);
      console.log("Team B players:", teamBPlayers);

      // Delete existing game players for this match day
      const { error: deleteError } = await supabase
        .from("game_players")
        .delete()
        .eq("match_day_id", gameId);

      if (deleteError) {
        console.error("Error deleting existing players:", deleteError);
        throw deleteError;
      }

      // Insert updated team assignments
      const allPlayers = [
        ...teamAPlayers.map((player) => ({
          match_day_id: gameId,
          player_id: player.id,
          team_name: "team_a",
          position_played:
            player.preferredPosition === "No Position"
              ? null
              : player.preferredPosition,
          manually_adjusted: true,
          adjusted_by: user?.id,
          adjusted_at: new Date().toISOString(),
          adjustment_reason: "Manual team edit",
        })),
        ...teamBPlayers.map((player) => ({
          match_day_id: gameId,
          player_id: player.id,
          team_name: "team_b",
          position_played:
            player.preferredPosition === "No Position"
              ? null
              : player.preferredPosition,
          manually_adjusted: true,
          adjusted_by: user?.id,
          adjusted_at: new Date().toISOString(),
          adjustment_reason: "Manual team edit",
        })),
      ];

      const { error: insertError } = await supabase
        .from("game_players")
        .insert(allPlayers);

      if (insertError) {
        console.error("Error inserting updated players:", insertError);
        throw insertError;
      }

      // Update match day date if changed
      const { error: dateError } = await supabase
        .from("match_days")
        .update({ date: date.toISOString() })
        .eq("id", gameId);

      if (dateError) {
        console.error("Error updating date:", dateError);
        throw dateError;
      }

      toast({
        title: "Teams saved",
        description: "All changes have been saved successfully.",
      });

      navigate(`/dashboard/${clubId}`);
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Edit Teams
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "EEEE, do MMMM yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Shuffle Teams Button */}
              <Button variant="outline" onClick={handleShuffleTeams}>
                <Shuffle className="mr-2 h-4 w-4" />
                Shuffle Teams
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Team A */}
              <Card>
                <CardHeader className="bg-red-500 text-white">
                  <CardTitle className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-white mr-3 flex items-center justify-center text-red-600 text-sm font-bold">
                      A
                    </div>
                    Team A
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <SortableContext
                    items={teamAPlayers.map((p) => `A-${p.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y">
                      {teamAPlayers.map((player) => (
                        <SortablePlayer
                          key={`A-${player.id}`}
                          id={`A-${player.id}`}
                          player={{
                            id: Number(player.id),
                            name: player.name,
                            preferredPosition: player.preferredPosition,
                            skillRating: player.skillRating,
                          }}
                          teamColor="red-600"
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>

              {/* Team B */}
              <Card>
                <CardHeader className="bg-emerald-500 text-white">
                  <CardTitle className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-white mr-3 flex items-center justify-center text-green-600 text-sm font-bold">
                      B
                    </div>
                    Team B
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <SortableContext
                    items={teamBPlayers.map((p) => `B-${p.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y">
                      {teamBPlayers.map((player) => (
                        <SortablePlayer
                          key={`B-${player.id}`}
                          id={`B-${player.id}`}
                          player={{
                            id: Number(player.id),
                            name: player.name,
                            preferredPosition: player.preferredPosition,
                            skillRating: player.skillRating,
                          }}
                          teamColor="green-600"
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </div>
          </DndContext>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Save
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditGame;

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Shuffle, Save, Edit2 } from "lucide-react";
import { LocationSelector } from "@/components/forms/LocationSelector";
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
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortablePlayer } from "@/components/team-generator/SortablePlayer";
import { useQueryClient, useQuery as useRQQuery } from "@tanstack/react-query";
import { markModifiedBy } from "@/integrations/supabase/matchDays";
import { formatFirstLastInitial } from "@/lib/formatName";

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
  location_id: string | null;
  game_players: GamePlayerData[];
  locations?: {
    id: string;
    name: string;
  } | null;
}

interface PlayerWithPosition {
  id: string;
  skill_rating: number;
  gender: string;
  position: string;
  isExtraPlayer: boolean;
  name?: string;
}

// Droppable Team Container Component
const DroppableTeam = ({
  teamId,
  children,
  title,
  headerColor,
}: {
  teamId: string;
  children: React.ReactNode;
  title: string;
  headerColor: string;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: teamId,
  });

  return (
    <Card>
      <CardHeader className={cn("text-white", headerColor)}>
        <CardTitle className="flex items-center">
          <div
            className={cn(
              "h-6 w-6 rounded-full bg-white mr-3 flex items-center justify-center text-sm font-bold",
              teamId === "team-a" ? "text-red-600" : "text-green-600"
            )}
          >
            {teamId === "team-a" ? "A" : "B"}
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "p-0 min-h-[200px] transition-colors",
          isOver && "bg-blue-50"
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
};

const EditGame = () => {
  const { clubId, gameId } = useParams(); // gameId is actually match_day_id
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setClubId } = useClub();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [date, setDate] = useState<Date>(new Date());
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [teamAPlayers, setTeamAPlayers] = useState<EditPlayer[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<EditPlayer[]>([]);
  const [activePlayer, setActivePlayer] = useState<EditPlayer | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >();

  // Fetch real game data
  const { data: gameData, isLoading } = useQuery({
    queryKey: ["gameData", gameId],
    queryFn: async (): Promise<MatchDayData | null> => {
      if (!gameId) return null;

      // console.log("=== FETCHING GAME DATA FOR EDIT ===");
      // console.log("Game ID (match_day_id):", gameId);

      // Get the match day
      const { data: matchDay, error: matchDayError } = await supabase
        .from("match_days")
        .select(
          `
    id, 
    date, 
    notes,
    location_id,
    locations (
      id,
      name
    )
  `
        )
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

  // Load who last modified the game (any change on Edit Game page)
  const { data: auditInfo } = useRQQuery({
    queryKey: ["matchDayAudit", gameId],
    enabled: !!gameId,
    queryFn: async () => {
      if (!gameId) {
        return { label: null as string | null, at: null as string | null };
      }

      // 1) Read audit fields with explicit return typing (avoids stale global types)
      const { data: mdArr, error: mdErr } = await supabase
        .from("match_days")
        .select("id, last_modified_by, last_modified_at")
        .eq("id", gameId)
        .limit(1)
        .returns<
          {
            id: string;
            last_modified_by: string | null;
            last_modified_at: string | null;
          }[]
        >();

      // console.log("[auditInfo] read mdErr:", mdErr);
      // console.log("[auditInfo] read mdArr:", mdArr);

      if (mdErr) throw mdErr;

      const md = mdArr?.[0];
      if (!md || !md.last_modified_by) {
        return { label: null, at: null };
      }

      // 2) Resolve name via players.user_id (explicit typing to avoid “deep instantiation”)
      const { data: player } = await supabase
        .from("players")
        .select("first_name, last_name")
        .eq("user_id", md.last_modified_by)
        .limit(1)
        .returns<{ first_name: string | null; last_name: string | null }[]>();

      const name =
        player && player[0]
          ? formatFirstLastInitial(player[0].first_name, player[0].last_name)
          : "Someone";

      return {
        label: name,
        at: md.last_modified_at,
      };
    },
  });

  // Update teams when game data loads
  useEffect(() => {
    if (gameData?.game_players) {
      // console.log("=== CONVERTING GAME DATA TO TEAMS ===");
      // console.log("Game players:", gameData.game_players);

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

      // Set the location from game data
      if (gameData.location_id) {
        setSelectedLocationId(gameData.location_id);
      }

      // console.log("Team A players:", teamA);
      // console.log("Team B players:", teamB);
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

  const findPlayerAndTeam = (playerId: string) => {
    const teamAIndex = teamAPlayers.findIndex((p) => p.id === playerId);
    if (teamAIndex !== -1) {
      return { player: teamAPlayers[teamAIndex], team: "A", index: teamAIndex };
    }

    const teamBIndex = teamBPlayers.findIndex((p) => p.id === playerId);
    if (teamBIndex !== -1) {
      return { player: teamBPlayers[teamBIndex], team: "B", index: teamBIndex };
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const playerId = String(active.id).replace(/^(A|B)-/, "");
    const playerInfo = findPlayerAndTeam(playerId);

    if (playerInfo) {
      setActivePlayer(playerInfo.player);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Extract player ID from the draggable item
    const playerId = activeId.replace(/^(A|B)-/, "");
    const playerInfo = findPlayerAndTeam(playerId);

    if (!playerInfo) return;

    // Handle dropping on team containers
    if (overId === "team-a" || overId === "team-b") {
      const targetTeam = overId === "team-a" ? "A" : "B";

      if (playerInfo.team !== targetTeam) {
        // Move player between teams
        if (playerInfo.team === "A") {
          setTeamAPlayers((prev) => prev.filter((p) => p.id !== playerId));
          setTeamBPlayers((prev) => [...prev, playerInfo.player]);
        } else {
          setTeamBPlayers((prev) => prev.filter((p) => p.id !== playerId));
          setTeamAPlayers((prev) => [...prev, playerInfo.player]);
        }

        // Mark as modified
        if (user?.id && gameId) {
          markModifiedBy(gameId, user.id)
            .then(() =>
              queryClient.invalidateQueries({
                queryKey: ["matchDayAudit", gameId],
              })
            )
            .catch((e) =>
              console.error("Failed to mark modified (drag to team):", e)
            );
        }
      }
      return;
    }

    // Handle dropping on other players (for reordering)
    if (activeId === overId) return;

    const overPlayerId = overId.replace(/^(A|B)-/, "");
    const overPlayerInfo = findPlayerAndTeam(overPlayerId);

    if (!overPlayerInfo) return;

    // If dropping on a player from different team, move to that team
    if (playerInfo.team !== overPlayerInfo.team) {
      if (playerInfo.team === "A") {
        setTeamAPlayers((prev) => prev.filter((p) => p.id !== playerId));
        setTeamBPlayers((prev) => {
          const newTeam = [...prev];
          newTeam.splice(overPlayerInfo.index, 0, playerInfo.player);
          return newTeam;
        });
      } else {
        setTeamBPlayers((prev) => prev.filter((p) => p.id !== playerId));
        setTeamAPlayers((prev) => {
          const newTeam = [...prev];
          newTeam.splice(overPlayerInfo.index, 0, playerInfo.player);
          return newTeam;
        });
      }

      // Mark as modified (cross-team drop onto a player)
      if (user?.id && gameId) {
        markModifiedBy(gameId, user.id)
          .then(() =>
            queryClient.invalidateQueries({
              queryKey: ["matchDayAudit", gameId],
            })
          )
          .catch((e) =>
            console.error(
              "Failed to mark modified (drag over player different team):",
              e
            )
          );
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActivePlayer(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    // Extract player IDs
    const activePlayerId = activeId.replace(/^(A|B)-/, "");
    const overPlayerId = overId.replace(/^(A|B)-/, "");

    const activePlayerInfo = findPlayerAndTeam(activePlayerId);
    const overPlayerInfo = findPlayerAndTeam(overPlayerId);

    if (!activePlayerInfo || !overPlayerInfo) return;

    // If both players are in the same team, reorder within team
    if (activePlayerInfo.team === overPlayerInfo.team) {
      if (activePlayerInfo.team === "A") {
        setTeamAPlayers((prev) =>
          arrayMove(prev, activePlayerInfo.index, overPlayerInfo.index)
        );
      } else {
        setTeamBPlayers((prev) =>
          arrayMove(prev, activePlayerInfo.index, overPlayerInfo.index)
        );
      }

      // Mark as modified (within-team reorder)
      if (user?.id && gameId) {
        markModifiedBy(gameId, user.id)
          .then(() =>
            queryClient.invalidateQueries({
              queryKey: ["matchDayAudit", gameId],
            })
          )
          .catch((e) =>
            console.error("Failed to mark modified (reorder within team):", e)
          );
      }
    }
  };

  const handleShuffleTeams = () => {
    // Combine all players from both teams
    const allPlayers = [...teamAPlayers, ...teamBPlayers];

    // Generate balanced teams using the same smart algorithm as NewGame
    const generateBalancedTeams = () => {
      // Prepare all players with their positions and skills
      const allPlayersWithPositions = allPlayers.map((player) => ({
        id: player.id,
        skill_rating: player.skillRating,
        gender: "unknown", // We don't have gender data in EditGame, so treat as neutral
        position:
          player.preferredPosition === "No Position"
            ? "Outside Hitter"
            : player.preferredPosition,
        isExtraPlayer: false,
        name: player.name,
      }));

      // Group players by position
      const playersByPosition: Record<string, typeof allPlayersWithPositions> =
        {};
      allPlayersWithPositions.forEach((player) => {
        if (!playersByPosition[player.position]) {
          playersByPosition[player.position] = [];
        }
        playersByPosition[player.position].push(player);
      });

      // Sort players within each position by skill (highest first)
      Object.keys(playersByPosition).forEach((position) => {
        playersByPosition[position].sort(
          (a, b) => b.skill_rating - a.skill_rating
        );
      });

      // Distribute positions using snake draft method
      const teamA: typeof allPlayersWithPositions = [];
      const teamB: typeof allPlayersWithPositions = [];

      Object.entries(playersByPosition).forEach(
        ([position, positionPlayers]) => {
          positionPlayers.forEach((player, index) => {
            // Snake draft: alternate high-skill players between teams
            const teamACount = teamA.filter(
              (p) => p.position === position
            ).length;
            const teamBCount = teamB.filter(
              (p) => p.position === position
            ).length;

            if (index % 2 === 0) {
              if (teamACount <= teamBCount) {
                teamA.push(player);
              } else {
                teamB.push(player);
              }
            } else {
              if (teamBCount <= teamACount) {
                teamB.push(player);
              } else {
                teamA.push(player);
              }
            }
          });
        }
      );

      // Balance teams by size if needed
      while (Math.abs(teamA.length - teamB.length) > 1) {
        if (teamA.length > teamB.length) {
          const playerToMove = teamA.pop();
          if (playerToMove) teamB.push(playerToMove);
        } else {
          const playerToMove = teamB.pop();
          if (playerToMove) teamA.push(playerToMove);
        }
      }

      // Convert back to EditPlayer format
      const newTeamA = teamA.map((player) => {
        const originalPlayer = allPlayers.find((p) => p.id === player.id);
        return (
          originalPlayer || {
            id: player.id,
            name: player.name || "Unknown Player",
            preferredPosition: player.position,
            skillRating: player.skill_rating,
          }
        );
      });

      const newTeamB = teamB.map((player) => {
        const originalPlayer = allPlayers.find((p) => p.id === player.id);
        return (
          originalPlayer || {
            id: player.id,
            name: player.name || "Unknown Player",
            preferredPosition: player.position,
            skillRating: player.skill_rating,
          }
        );
      });

      return { newTeamA, newTeamB };
    };

    const { newTeamA, newTeamB } = generateBalancedTeams();

    setTeamAPlayers(newTeamA);
    setTeamBPlayers(newTeamB);

    (async () => {
      if (user?.id && gameId) {
        try {
          await markModifiedBy(gameId, user.id);
          queryClient.invalidateQueries({
            queryKey: ["matchDayAudit", gameId],
          });
        } catch (e) {
          console.error("Failed to mark modified (shuffle):", e);
        }
      }
    })();

    toast({
      title: "Teams balanced",
      description:
        "Teams have been reorganized for optimal balance. Click Save to apply changes.",
      duration: 1000,
    });
  };

  const handlePositionChange = (playerId: string, newPosition: string) => {
    // console.log("=== HANDLE POSITION CHANGE ===");
    // console.log("Player ID:", playerId);
    // console.log("New Position:", newPosition);
    /*
    console.log(
      "Team A Players:",
      teamAPlayers.map((p) => ({ id: p.id, name: p.name }))
    );
    */
    /*
    console.log(
      "Team B Players:",
      teamBPlayers.map((p) => ({ id: p.id, name: p.name }))
    );
    */

    const updatePlayerPosition = (players: typeof teamAPlayers) =>
      players.map((player) => {
        /*
        console.log(
          `Comparing ${player.id} === ${playerId}:`,
          player.id === playerId
        );
        */
        return player.id === playerId
          ? { ...player, preferredPosition: newPosition }
          : player;
      });

    // Check which team the player is in
    const isInTeamA = teamAPlayers.some((p) => p.id === playerId);
    const isInTeamB = teamBPlayers.some((p) => p.id === playerId);

    // console.log("Is in Team A:", isInTeamA);
    // console.log("Is in Team B:", isInTeamB);

    if (isInTeamA) {
      // console.log("Updating Team A");
      setTeamAPlayers(updatePlayerPosition);
    } else if (isInTeamB) {
      // console.log("Updating Team B");
      setTeamBPlayers(updatePlayerPosition);
    } else {
      console.error("Player not found in either team!");
    }

    console.log(`Position updated for player ${playerId}: ${newPosition}`);
  };

  const handleSave = async () => {
    if (!gameId) return;

    try {
      // console.log("=== SAVING TEAM CHANGES ===");
      // console.log("Team A players:", teamAPlayers);
      // console.log("Team B players:", teamBPlayers);

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

      // Update match day date and location if changed
      const { error: updateError } = await supabase
        .from("match_days")
        .update({
          date: date.toISOString(),
          location_id: selectedLocationId || null,
        })
        .eq("id", gameId);

      if (updateError) {
        console.error("Error updating match day:", updateError);
        throw updateError;
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Edit Teams
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal w-full sm:w-auto",
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
                    onSelect={async (newDate) => {
                      if (!newDate) return;
                      setDate(newDate);
                      if (user?.id && gameId) {
                        try {
                          await markModifiedBy(gameId, user.id);
                          queryClient.invalidateQueries({
                            queryKey: ["matchDayAudit", gameId],
                          });
                        } catch (e) {
                          console.error("Failed to mark modified (date):", e);
                        }
                      }
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Location Selector */}
              {clubId && (
                <LocationSelector
                  clubId={clubId}
                  value={selectedLocationId}
                  onValueChange={async (val) => {
                    setSelectedLocationId(val);
                    if (user?.id && gameId) {
                      try {
                        await markModifiedBy(gameId, user.id);
                        queryClient.invalidateQueries({
                          queryKey: ["matchDayAudit", gameId],
                        });
                      } catch (e) {
                        console.error("Failed to mark modified (location):", e);
                      }
                    }
                  }}
                  placeholder="Select or create location"
                  className="w-full sm:w-[250px]"
                />
              )}

              {/* Shuffle Teams Button */}
              <Button
                variant="action"
                icon={<Shuffle className="h-4 w-4" />}
                onClick={handleShuffleTeams}
                className="w-full sm:w-auto"
              >
                Shuffle Teams
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Team A */}
              <DroppableTeam
                teamId="team-a"
                title="Team A"
                headerColor="bg-red-500"
              >
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
                        onPositionChange={handlePositionChange}
                        availablePositions={mockPositions}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableTeam>

              {/* Team B */}
              <DroppableTeam
                teamId="team-b"
                title="Team B"
                headerColor="bg-emerald-500"
              >
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
                        onPositionChange={handlePositionChange}
                        availablePositions={mockPositions}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableTeam>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activePlayer ? (
                <div className="bg-card border-2 border-primary rounded-md p-2 shadow-lg opacity-95 text-card-foreground">
                  <span className="font-medium">{activePlayer.name}</span>
                  {" - "}
                  <span className="text-xs rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                    {activePlayer.preferredPosition}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          {/* Last modified banner */}
          {auditInfo?.label && (
            <div className="flex justify-end mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Last modified by:{" "}
                <span className="font-medium">{auditInfo.label}</span>
              </div>
            </div>
          )}

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

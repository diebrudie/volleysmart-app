import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Shuffle, Save, Edit2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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

// Mock data - replace with actual data from the match
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

const mockTeamData = {
  teamA: [
    {
      id: "1",
      name: "Isabel",
      preferredPosition: "Outside Hitter",
      skillRating: 8,
    },
    { id: "2", name: "Eduardo", preferredPosition: "Setter", skillRating: 7 },
    {
      id: "3",
      name: "Carlotta",
      preferredPosition: "Opposite Hitter",
      skillRating: 6,
    },
    { id: "4", name: "Juan", preferredPosition: "Libero", skillRating: 7 },
    { id: "5", name: "Nacho", preferredPosition: "Libero", skillRating: 8 },
    { id: "6", name: "Paco", preferredPosition: "Setter", skillRating: 9 },
  ] as EditPlayer[],
  teamB: [
    {
      id: "7",
      name: "Ana",
      preferredPosition: "Middle Blocker",
      skillRating: 8,
    },
    {
      id: "8",
      name: "Maria",
      preferredPosition: "Outside Hitter",
      skillRating: 7,
    },
    {
      id: "9",
      name: "Pepito",
      preferredPosition: "Opposite Hitter",
      skillRating: 6,
    },
    {
      id: "10",
      name: "Carlos",
      preferredPosition: "Outside Hitter",
      skillRating: 7,
    },
    { id: "11", name: "Maria", preferredPosition: "Setter", skillRating: 8 },
    {
      id: "12",
      name: "Ana Isabel",
      preferredPosition: "Libero",
      skillRating: 9,
    },
  ] as EditPlayer[],
};

const EditGame = () => {
  const { clubId, gameId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setClubId } = useClub();

  const [date, setDate] = useState<Date>(new Date());
  const [teamAPlayers, setTeamAPlayers] = useState<EditPlayer[]>(
    mockTeamData.teamA
  );
  const [teamBPlayers, setTeamBPlayers] = useState<EditPlayer[]>(
    mockTeamData.teamB
  );
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);

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

  const handleSave = () => {
    // Here you would save the changes to the database
    toast({
      title: "Teams saved",
      description: "All changes have been saved successfully.",
    });
    navigate(`/dashboard/${clubId}`); // Navigate back to club-specific dashboard
  };

  const PlayerRow = ({
    player,
    teamColor,
    teamId,
  }: {
    player: EditPlayer;
    teamColor: string;
    teamId: string;
  }) => {
    const isEditing = editingPlayer === player.id;

    return (
      <div className="flex items-center p-2 rounded-md border">
        <div className="flex items-center justify-between w-full">
          <div className="flex-grow">
            <span className="font-medium">{player.name}</span>
            {" - "}
            {isEditing ? (
              <Select
                value={player.preferredPosition}
                onValueChange={(value) =>
                  handlePositionChange(player.id, value)
                }
              >
                <SelectTrigger className="inline-flex w-auto border-0 p-0 h-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockPositions.map((position) => (
                    <SelectItem key={position.id} value={position.name}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span
                className={cn(
                  "text-xs rounded px-1.5 py-0.5",
                  teamColor === "volleyball-primary"
                    ? "bg-volleyball-primary/10 text-volleyball-primary"
                    : "bg-volleyball-accent/10 text-volleyball-accent"
                )}
              >
                {player.preferredPosition}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingPlayer(isEditing ? null : player.id)}
            className="ml-2"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
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
                <CardHeader className="bg-volleyball-primary text-white">
                  <CardTitle className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-white mr-3 flex items-center justify-center text-volleyball-primary text-sm font-bold">
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
                          teamColor="volleyball-primary"
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>

              {/* Team B */}
              <Card>
                <CardHeader className="bg-volleyball-accent text-white">
                  <CardTitle className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-white mr-3 flex items-center justify-center text-volleyball-accent text-sm font-bold">
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
                          teamColor="volleyball-accent"
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
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EditGame;

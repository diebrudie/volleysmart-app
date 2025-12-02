import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shuffle, Save } from "lucide-react";
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
import { SortablePlayer } from "./SortablePlayer";
import { Player } from "@/types/supabase";

interface TeamEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: {
    teamA: Player[];
    teamB: Player[];
  };
  onUpdateTeams: (teams: { teamA: Player[]; teamB: Player[] }) => void;
  onRandomizeTeams: () => void;
}

export const TeamEditDialog = ({
  open,
  onOpenChange,
  teams,
  onUpdateTeams,
  onRandomizeTeams,
}: TeamEditDialogProps) => {
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>([...teams.teamA]);
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>([...teams.teamB]);

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTeamAPlayers([...teams.teamA]);
      setTeamBPlayers([...teams.teamB]);
    }
    onOpenChange(newOpen);
  };

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
      let playerToMove: Player | undefined;

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

  const handleSaveTeams = () => {
    onUpdateTeams({
      teamA: teamAPlayers,
      teamB: teamBPlayers,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Edit Teams</DialogTitle>
        </DialogHeader>

        <div className="my-4">
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop players to rearrange the teams or move players between
            teams.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team A */}
              <div className="border rounded-md p-4">
                <h3 className="font-medium text-lg mb-2 flex items-center">
                  <div className="h-5 w-5 rounded-full bg-volleyball-primary mr-2 flex items-center justify-center text-white text-xs">
                    A
                  </div>
                  Team A
                </h3>
                <SortableContext
                  items={teamAPlayers.map((p) => `A-${p.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1">
                    {teamAPlayers.map((player) => (
                      <SortablePlayer
                        key={`A-${player.id}`}
                        id={`A-${player.id}`}
                        player={player}
                        teamColor="volleyball-primary"
                      />
                    ))}
                  </ul>
                </SortableContext>
              </div>

              {/* Team B */}
              <div className="border rounded-md p-4">
                <h3 className="font-medium text-lg mb-2 flex items-center">
                  <div className="h-5 w-5 rounded-full bg-volleyball-accent mr-2 flex items-center justify-center text-white text-xs">
                    B
                  </div>
                  Team B
                </h3>
                <SortableContext
                  items={teamBPlayers.map((p) => `B-${p.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1">
                    {teamBPlayers.map((player) => (
                      <SortablePlayer
                        key={`B-${player.id}`}
                        id={`B-${player.id}`}
                        player={player}
                        teamColor="volleyball-accent"
                      />
                    ))}
                  </ul>
                </SortableContext>
              </div>
            </div>
          </DndContext>
        </div>

        <DialogFooter className="flex gap-2 justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onRandomizeTeams();
              onOpenChange(false);
            }}
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Randomize
          </Button>
          <Button type="button" onClick={handleSaveTeams}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

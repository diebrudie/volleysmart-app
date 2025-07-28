import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertCircle, Shuffle, Users } from "lucide-react";
import { PlayerItem } from "./PlayerItem";
import { useClub } from "@/contexts/ClubContext";
import { getPlayersWithPositions } from "./queries";
import { PlayerWithPositions } from "./types";

interface PlayersSelectionProps {
  selectedPlayers: string[];
  onPlayerSelection: (playerId: string) => void;
  onGenerateTeams: () => void;
  canGenerateTeams: boolean;
  onClearSelection: () => void;
  onPlayersLoaded?: (players: PlayerWithPositions[]) => void;
}

export const PlayersSelection = ({
  selectedPlayers,
  onPlayerSelection,
  onGenerateTeams,
  canGenerateTeams,
  onClearSelection,
  onPlayersLoaded,
}: PlayersSelectionProps) => {
  const { clubId } = useClub(); // Use clubId instead of club
  const [allPlayers, setAllPlayers] = useState<PlayerWithPositions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clubId) {
      // Use clubId instead of club?.id
      loadPlayers();
    }
  }, [clubId]);

  const loadPlayers = async () => {
    if (!clubId) return; // Guard clause

    try {
      setLoading(true);
      setError(null);
      const players = await getPlayersWithPositions(clubId); // Use clubId directly
      setAllPlayers(players);
      onPlayersLoaded?.(players);
    } catch (error) {
      console.error("Error loading players:", error);
      setError("Failed to load players. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!clubId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div>No club selected. Please select a club first.</div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div>Loading players...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-500">{error}</div>
          <Button onClick={loadPlayers} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
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
              onClick={onClearSelection}
              disabled={selectedPlayers.length === 0}
            >
              Clear selection
            </Button>
          </div>

          <Button
            className="w-full"
            disabled={!canGenerateTeams}
            onClick={onGenerateTeams}
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Generate Teams
          </Button>
        </div>

        <div className="border-t">
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {allPlayers.map((player) => (
              <PlayerItem
                key={player.id}
                player={player}
                isSelected={selectedPlayers.includes(player.id)}
                onSelect={onPlayerSelection}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useClub } from "@/contexts/ClubContext";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useParams } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ClubMember {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  primary_position_id?: string | null;
  primary_position_name?: string;
}

const NewGame = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const clubId = urlClubId;
  const { setClubId } = useClub();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Set the club context from URL
  useEffect(() => {
    if (urlClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, setClubId]);

  useEffect(() => {
    console.log("=== DEBUG INFO ===");
    console.log("Current user:", user);
    console.log("Current clubId:", clubId);
    console.log("URL clubId:", urlClubId);
    console.log("================");
  }, [user, clubId, urlClubId]);

  // Fetch club members/players with their primary positions
  const { data: players, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ["clubPlayers", clubId],
    queryFn: async () => {
      if (!clubId) return [];

      // Get club members first
      const { data: clubMembers, error: membersError } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", clubId)
        .eq("is_active", true);

      if (membersError) throw membersError;

      if (!clubMembers || clubMembers.length === 0) return [];

      const userIds = clubMembers.map((member) => member.user_id);

      // Get players for these users with their primary position
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select(
          `
          id, 
          first_name, 
          last_name, 
          user_id,
          player_positions!inner (
            position_id,
            is_primary,
            positions (
              id,
              name
            )
          )
        `
        )
        .in("user_id", userIds);

      if (playersError) throw playersError;

      // Process players to get their primary position
      const processedPlayers = (playersData || []).map((player) => {
        const primaryPosition = player.player_positions?.find(
          (pp) => pp.is_primary
        );
        return {
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          user_id: player.user_id,
          primary_position_id: primaryPosition?.position_id || null,
          primary_position_name:
            primaryPosition?.positions?.name || "No Position",
        };
      });

      return processedPlayers as ClubMember[];
    },
    enabled: !!clubId,
  });

  const { data: membershipCheck } = useQuery({
    queryKey: ["membershipCheck", clubId, user?.id],
    queryFn: async () => {
      if (!clubId || !user?.id) return null;

      console.log("Checking membership for:", { clubId, userId: user.id });

      const { data, error } = await supabase
        .from("club_members")
        .select("*")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      console.log("Membership check result:", { data, error });
      return data;
    },
    enabled: !!clubId && !!user?.id,
  });

  // Filter and sort players
  const filteredAndSortedPlayers = players
    ? players
        .filter((player) =>
          `${player.first_name} ${player.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.first_name.localeCompare(b.first_name))
    : [];

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  const handleSelectAll = () => {
    const allPlayerIds = filteredAndSortedPlayers.map((player) => player.id);
    const allSelected = allPlayerIds.every((id) =>
      selectedPlayers.includes(id)
    );

    if (allSelected) {
      // Deselect all filtered players
      setSelectedPlayers((current) =>
        current.filter((id) => !allPlayerIds.includes(id))
      );
    } else {
      // Select all filtered players (merge with existing selection)
      setSelectedPlayers((current) => {
        const newSelection = [...current];
        allPlayerIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleSearchClick = () => {
    setIsSearchExpanded(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a date for the game",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlayers.length < 4) {
      toast({
        title: "Not enough players",
        description: "Please select at least 4 players to create teams",
        variant: "destructive",
      });
      return;
    }

    if (!clubId || !user?.id) {
      toast({
        title: "Missing information",
        description: "Club or user information is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("=== CREATING GAME ===");
      console.log("Selected players:", selectedPlayers);
      console.log("Players data:", players);

      // 1. Create a new match day
      const { data: matchDay, error: matchDayError } = await supabase
        .from("match_days")
        .insert({
          date: format(date, "yyyy-MM-dd"),
          created_by: user.id,
          club_id: clubId,
          team_generated: true,
        })
        .select()
        .single();

      if (matchDayError) {
        console.error("Match day error:", matchDayError);
        throw matchDayError;
      }

      console.log("Created match day:", matchDay);

      // 2. Create 5 matches for the 5 sets
      const matches = Array.from({ length: 5 }, (_, index) => ({
        match_day_id: matchDay.id,
        game_number: index + 1,
        team_a_score: 0,
        team_b_score: 0,
        added_by_user_id: user.id,
      }));

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .insert(matches)
        .select();

      if (matchesError) {
        console.error("Matches error:", matchesError);
        throw matchesError;
      }

      console.log("Created matches:", matchesData);

      // 3. Shuffle players and split into two teams
      const shuffledPlayers = [...selectedPlayers].sort(
        () => Math.random() - 0.5
      );
      const midpoint = Math.ceil(shuffledPlayers.length / 2);
      const teamAPlayerIds = shuffledPlayers.slice(0, midpoint);
      const teamBPlayerIds = shuffledPlayers.slice(midpoint);

      console.log("Team A player IDs:", teamAPlayerIds);
      console.log("Team B player IDs:", teamBPlayerIds);

      // 4. Create game_players records (simplified - one set per match day, not per match)
      console.log("Step 4: Creating game players...");

      // Type that matches what we're actually inserting
      type GamePlayerInsert = {
        match_day_id: string;
        player_id: string;
        team_name: "team_a" | "team_b";
        original_team_name: "team_a" | "team_b";
        manually_adjusted: boolean;
        position_played: string | null;
      };

      const allGamePlayers: GamePlayerInsert[] = [];

      // Helper function to get player's primary position name
      const getPlayerPrimaryPositionName = (playerId: string) => {
        const player = players?.find((p) => p.id === playerId);
        return player?.primary_position_name || "No Position";
      };

      // Add Team A players with their positions
      teamAPlayerIds.forEach((playerId) => {
        allGamePlayers.push({
          match_day_id: matchDay.id,
          player_id: playerId,
          team_name: "team_a",
          original_team_name: "team_a",
          manually_adjusted: false,
          position_played: getPlayerPrimaryPositionName(playerId),
        });
      });

      // Add Team B players with their positions
      teamBPlayerIds.forEach((playerId) => {
        allGamePlayers.push({
          match_day_id: matchDay.id,
          player_id: playerId,
          team_name: "team_b",
          original_team_name: "team_b",
          manually_adjusted: false,
          position_played: getPlayerPrimaryPositionName(playerId),
        });
      });

      console.log(
        "About to insert game players with positions:",
        allGamePlayers
      );

      const { error: gamePlayersError } = await supabase
        .from("game_players")
        .insert(allGamePlayers);

      if (gamePlayersError) {
        console.error("Game players error:", gamePlayersError);
        throw new Error(
          `Failed to create game players: ${gamePlayersError.message}`
        );
      }
      console.log("=== GAME CREATED SUCCESSFULLY ===");

      // Invalidate the latest game query so Dashboard refetches
      queryClient.invalidateQueries({ queryKey: ["latestGame", clubId] });

      toast({
        title: "Game created!",
        description: "Your game has been created and teams have been generated",
      });

      // Navigate to the dashboard to see the game
      navigate(`/dashboard/${clubId}`);

      // Navigate to the dashboard to see the game
      navigate(`/dashboard/${clubId}`);
    } catch (error: unknown) {
      console.error("Error creating game:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPlayerName = (player: ClubMember) => {
    return `${player.first_name} ${player.last_name.charAt(0)}.`;
  };

  // Check if all filtered players are selected
  const allFilteredSelected =
    filteredAndSortedPlayers.length > 0 &&
    filteredAndSortedPlayers.every((player) =>
      selectedPlayers.includes(player.id)
    );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-serif mb-8">Create New Game</h1>

          {isLoadingPlayers ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl pb-24">
              {/* Date Picker */}
              <div className="bg-white p-4 rounded-lg">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-gray-300",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? (
                        format(date, "EEEE, do MMMM yyyy")
                      ) : (
                        <span>Select Game's Date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Players Selection */}
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="bg-amber-400 p-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black">
                    Select Players
                  </h2>
                  <div className="flex items-center gap-3">
                    {/* Search */}
                    {isSearchExpanded ? (
                      <Input
                        type="text"
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48 bg-white border-none"
                        autoFocus
                        onBlur={() => {
                          if (!searchTerm) setIsSearchExpanded(false);
                        }}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleSearchClick}
                        className="text-black hover:bg-amber-500"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Select All checkbox */}
                    {filteredAndSortedPlayers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={handleSelectAll}
                          className="bg-white border-gray-400"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Players list - removed max-height and overflow */}
                <div>
                  {filteredAndSortedPlayers.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {filteredAndSortedPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-4 hover:bg-gray-50"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatPlayerName(player)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {player.primary_position_name || "No Position"}
                            </span>
                          </div>
                          <Checkbox
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={() =>
                              handlePlayerToggle(player.id)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      {searchTerm
                        ? "No players found matching your search."
                        : "No players found in your club."}
                    </div>
                  )}
                </div>
              </div>

              {/* Button - right aligned with proper spacing */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  className="py-3 px-8"
                  disabled={isSubmitting || selectedPlayers.length < 4 || !date}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating Game...
                    </>
                  ) : (
                    "Create Teams"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NewGame;

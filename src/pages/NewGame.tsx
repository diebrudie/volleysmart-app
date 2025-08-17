import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, Minus, X, Edit2 } from "lucide-react";
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
import { LocationSelector } from "@/components/forms/LocationSelector";

interface ClubMember {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  primary_position_id?: string | null;
  primary_position_name?: string;
  skill_rating?: number;
  gender?: string;
  height_cm?: number;
  isExtraPlayer: false;
}

interface ExtraPlayer {
  id: string;
  name: string;
  skill_rating: number;
  position: string;
  isExtraPlayer: true;
}

interface PlayerWithPosition {
  id: string;
  skill_rating: number;
  gender: string;
  position: string;
  isExtraPlayer: boolean;
  name?: string;
  first_name?: string;
  last_name?: string;
}

const VOLLEYBALL_POSITIONS = [
  "Setter",
  "Outside Hitter",
  "Middle Blocker",
  "Opposite",
  "Libero",
];

const NewGame = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const clubId = urlClubId;
  const { setClubId } = useClub();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [extraPlayersCount, setExtraPlayersCount] = useState(0);
  const [extraPlayers, setExtraPlayers] = useState<ExtraPlayer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [editingExtraPlayer, setEditingExtraPlayer] = useState<string | null>(
    null
  );
  const { toast } = useToast();
  const navigate = useNavigate();

  // Set the club context from URL
  useEffect(() => {
    if (urlClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, setClubId]);

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

      // Get players for these users with their primary position and attributes
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select(
          `id, 
          first_name, 
          last_name, 
          user_id,
          skill_rating,
          gender,
          height_cm,
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

      // Process players to get their primary position and attributes
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
          skill_rating: player.skill_rating || 50,
          gender: player.gender || "other",
          height_cm: player.height_cm,
          isExtraPlayer: false,
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

      const { data, error } = await supabase
        .from("club_members")
        .select("*")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      return data;
    },
    enabled: !!clubId && !!user?.id,
  });

  // Handle extra players count change
  const handleExtraPlayersChange = (increment: boolean) => {
    const newCount = increment
      ? extraPlayersCount + 1
      : Math.max(0, extraPlayersCount - 1);

    if (increment) {
      // Add new extra player
      const newExtraPlayer: ExtraPlayer = {
        id: `extra-${Date.now()}-${Math.random()}`,
        name: "Extra Player", // Default display name
        skill_rating: 5,
        position: "Any", // Will be auto-assigned during team generation
        isExtraPlayer: true,
      };
      setExtraPlayers([...extraPlayers, newExtraPlayer]);
      setSelectedPlayers([...selectedPlayers, newExtraPlayer.id]);
    } else {
      // Remove last extra player
      if (extraPlayers.length > 0) {
        const lastExtraPlayer = extraPlayers[extraPlayers.length - 1];
        setExtraPlayers(extraPlayers.slice(0, -1));
        setSelectedPlayers(
          selectedPlayers.filter((id) => id !== lastExtraPlayer.id)
        );
      }
    }

    setExtraPlayersCount(newCount);
  };

  // Auto-assign positions to extra players based on team needs
  const autoAssignPositionsToExtraPlayers = () => {
    if (!players) return extraPlayers;

    // Count existing positions from selected regular players
    const selectedRegularPlayers = players.filter((p) =>
      selectedPlayers.includes(p.id)
    );
    const positionCounts: Record<string, number> = {};

    selectedRegularPlayers.forEach((player) => {
      const pos = player.primary_position_name || "Unknown";
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });

    // Ideal distribution for volleyball (can be adjusted)
    const idealPositions = {
      Setter: 2,
      "Outside Hitter": 4,
      "Middle Blocker": 4,
      Opposite: 2,
      Libero: 2,
    };

    // Find positions that need more players
    const neededPositions: string[] = [];
    Object.entries(idealPositions).forEach(([position, ideal]) => {
      const current = positionCounts[position] || 0;
      const needed = Math.max(0, ideal - current);
      for (let i = 0; i < needed; i++) {
        neededPositions.push(position);
      }
    });

    // Assign positions to extra players
    return extraPlayers.map((extraPlayer, index) => ({
      ...extraPlayer,
      position: neededPositions[index] || "Outside Hitter", // Default fallback
    }));
  };

  // Update extra player name
  const updateExtraPlayerName = (id: string, newName: string) => {
    setExtraPlayers(
      extraPlayers.map((player) =>
        player.id === id ? { ...player, name: newName } : player
      )
    );
  };

  // Combine regular players and extra players for display
  const allDisplayPlayers = [...(players || []), ...extraPlayers];

  // Filter and sort players
  const filteredAndSortedPlayers = allDisplayPlayers
    .filter((player) => {
      if (player.isExtraPlayer) {
        // ExtraPlayer only has 'name' property
        return (player as ExtraPlayer).name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      } else {
        // ClubMember has first_name and last_name
        const clubMember = player as ClubMember;
        return `${clubMember.first_name} ${clubMember.last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      }
    })
    .sort((a, b) => {
      // Extra players come after regular players
      if (a.isExtraPlayer && !b.isExtraPlayer) return 1;
      if (!a.isExtraPlayer && b.isExtraPlayer) return -1;

      // Both are extra players - compare by name
      if (a.isExtraPlayer && b.isExtraPlayer) {
        return (a as ExtraPlayer).name.localeCompare((b as ExtraPlayer).name);
      }

      // Both are regular players - compare by first_name
      const clubA = a as ClubMember;
      const clubB = b as ClubMember;
      return clubA.first_name.localeCompare(clubB.first_name);
    });

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
      // Auto-assign positions to extra players
      const updatedExtraPlayers = autoAssignPositionsToExtraPlayers();
      setExtraPlayers(updatedExtraPlayers);

      // 1. Create a new match day
      const { data: matchDay, error: matchDayError } = await supabase
        .from("match_days")
        .insert({
          date: format(date, "yyyy-MM-dd"),
          created_by: user.id,
          club_id: clubId,
          team_generated: true,
          location_id: selectedLocationId,
        })
        .select()
        .single();

      if (matchDayError) {
        console.error("Match day error:", matchDayError);
        throw matchDayError;
      }

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

      // 3. Handle regular players and extra players separately
      const regularPlayerIds = selectedPlayers.filter(
        (id) => !id.startsWith("extra-")
      );
      const extraPlayerIds = selectedPlayers.filter((id) =>
        id.startsWith("extra-")
      );

      // 4. Create temporary player records for extra players
      const extraPlayerRecords = [];
      for (const extraId of extraPlayerIds) {
        const extraPlayer = updatedExtraPlayers.find((ep) => ep.id === extraId);
        if (extraPlayer) {
          // Split the custom name intelligently
          const nameParts = extraPlayer.name.trim().split(" ");
          const firstName = nameParts[0] || "Extra";
          const lastName =
            nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Player";

          // Create a temporary player record in the players table
          const { data: tempPlayer, error: tempPlayerError } = await supabase
            .from("players")
            .insert({
              first_name: firstName,
              last_name: lastName,
              user_id: null, // Now nullable
              skill_rating: extraPlayer.skill_rating,
              is_temporary: true,
              is_active: true,
              member_association: false,
              gender: "other",
            })
            .select()
            .single();

          if (tempPlayerError) {
            console.error("Error creating temp player:", tempPlayerError);
            throw tempPlayerError;
          }

          extraPlayerRecords.push({
            tempPlayerId: tempPlayer.id,
            originalExtraId: extraId,
            position: extraPlayer.position,
          });
        }
      }

      // 5. Generate balanced teams using smart algorithm
      const generateBalancedTeams = () => {
        // Prepare all players with their positions and skills
        const allPlayersWithPositions = [];

        // Add regular players
        regularPlayerIds.forEach((playerId) => {
          const player = players?.find((p) => p.id === playerId);
          if (player) {
            allPlayersWithPositions.push({
              id: player.id,
              skill_rating: player.skill_rating || 50,
              gender: player.gender || "other",
              position: player.primary_position_name || "Outside Hitter",
              isExtraPlayer: false,
            });
          }
        });

        // Add extra players (using temp player IDs)
        extraPlayerRecords.forEach((record) => {
          const extraPlayer = updatedExtraPlayers.find(
            (ep) => ep.id === record.originalExtraId
          );
          if (extraPlayer) {
            allPlayersWithPositions.push({
              id: record.tempPlayerId,
              skill_rating: extraPlayer.skill_rating,
              gender: "other", // Extra players default
              position: record.position,
              isExtraPlayer: true,
            });
          }
        });

        // Group players by position
        const playersByPosition: Record<string, PlayerWithPosition[]> = {};
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
        const teamA: PlayerWithPosition[] = [];
        const teamB: PlayerWithPosition[] = [];

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

        // Balance teams by size
        while (Math.abs(teamA.length - teamB.length) > 1) {
          if (teamA.length > teamB.length) {
            const playerToMove = teamA.pop();
            if (playerToMove) teamB.push(playerToMove);
          } else {
            const playerToMove = teamB.pop();
            if (playerToMove) teamA.push(playerToMove);
          }
        }

        // Try to balance gender
        const teamAFemales = teamA.filter((p) => p.gender === "female").length;
        const teamBFemales = teamB.filter((p) => p.gender === "female").length;
        const genderDiff = Math.abs(teamAFemales - teamBFemales);

        if (genderDiff > 2) {
          // Find potential swaps that improve gender balance
          for (let i = 0; i < teamA.length; i++) {
            for (let j = 0; j < teamB.length; j++) {
              const playerA = teamA[i];
              const playerB = teamB[j];

              if (
                playerA.gender !== playerB.gender &&
                Math.abs(playerA.skill_rating - playerB.skill_rating) < 15
              ) {
                // Perform the swap
                teamA[i] = playerB;
                teamB[j] = playerA;
                break;
              }
            }
            if (
              Math.abs(
                teamA.filter((p) => p.gender === "female").length -
                  teamB.filter((p) => p.gender === "female").length
              ) <= 1
            ) {
              break;
            }
          }
        }

        return {
          teamAPlayerIds: teamA.map((p) => p.id),
          teamBPlayerIds: teamB.map((p) => p.id),
        };
      };

      const { teamAPlayerIds, teamBPlayerIds } = generateBalancedTeams();

      // 6. Create game_players records
      type GamePlayerInsert = {
        match_day_id: string;
        player_id: string;
        team_name: "team_a" | "team_b";
        original_team_name: "team_a" | "team_b";
        manually_adjusted: boolean;
        position_played: string | null;
      };

      const allGamePlayers: GamePlayerInsert[] = [];

      // Helper function to get player's position
      const getPlayerPosition = (playerId: string) => {
        // Check if it's a regular player
        const regularPlayer = players?.find((p) => p.id === playerId);
        if (regularPlayer) {
          return regularPlayer.primary_position_name || "No Position";
        }

        // Check if it's a temporary player
        const extraPlayerRecord = extraPlayerRecords.find(
          (ep) => ep.tempPlayerId === playerId
        );
        if (extraPlayerRecord) {
          return extraPlayerRecord.position;
        }

        return "No Position";
      };

      // Add Team A players with their positions
      teamAPlayerIds.forEach((playerId) => {
        allGamePlayers.push({
          match_day_id: matchDay.id,
          player_id: playerId,
          team_name: "team_a",
          original_team_name: "team_a",
          manually_adjusted: false,
          position_played: getPlayerPosition(playerId),
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
          position_played: getPlayerPosition(playerId),
        });
      });

      const { error: gamePlayersError } = await supabase
        .from("game_players")
        .insert(allGamePlayers);

      if (gamePlayersError) {
        console.error("Game players error:", gamePlayersError);
        throw new Error(
          `Failed to create game players: ${gamePlayersError.message}`
        );
      }

      // Invalidate the latest game query so Dashboard refetches
      queryClient.invalidateQueries({ queryKey: ["latestGame", clubId] });

      toast({
        title: "Game created!",
        description: `Your game has been created${
          extraPlayersCount > 0
            ? ` with ${extraPlayersCount} extra players`
            : ""
        }`,
      });

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

  const formatPlayerName = (player: ClubMember | ExtraPlayer) => {
    if (player.isExtraPlayer) {
      return (player as ExtraPlayer).name;
    }
    const regularPlayer = player as ClubMember;
    return `${regularPlayer.first_name} ${regularPlayer.last_name.charAt(0)}.`;
  };

  const getPlayerPosition = (player: ClubMember | ExtraPlayer) => {
    if (player.isExtraPlayer) {
      return `${(player as ExtraPlayer).position} (Level ${
        (player as ExtraPlayer).skill_rating
      })`;
    }
    return (player as ClubMember).primary_position_name || "No Position";
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

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-serif mb-8 text-gray-900 dark:text-gray-100">
            Create New Game
          </h1>

          {isLoadingPlayers ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl pb-24">
              {/* Date Picker, Location, and Extra Players Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Picker */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal border-gray-300 dark:border-gray-600",
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

                {/* Location Selector */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <LocationSelector
                    clubId={clubId!}
                    value={selectedLocationId}
                    onValueChange={setSelectedLocationId}
                    placeholder="Select or create location"
                  />
                </div>

                {/* Add Extra Players */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center justify-between gap-4 w-full">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Add guests or temp. players
                    </span>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleExtraPlayersChange(false)}
                        disabled={extraPlayersCount === 0}
                        className="h-8 w-8"
                        icon={<Minus className="h-4 w-4" />}
                      />
                      <span className="font-medium text-gray-900 dark:text-gray-100 min-w-[2rem] text-center">
                        {extraPlayersCount}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleExtraPlayersChange(true)}
                        className="h-8 w-8"
                        icon={<Plus className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Players Selection */}
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                <div className="bg-amber-400 dark:bg-amber-500 p-4 flex items-center justify-between">
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
                        className="w-48 bg-white dark:bg-gray-700 border-none"
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
                        className="text-black hover:bg-amber-500 dark:hover:bg-amber-600"
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

                {/* Players list */}
                <div>
                  {filteredAndSortedPlayers.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredAndSortedPlayers.map((player) => (
                        <div
                          key={player.id}
                          className={cn(
                            "flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700",
                            player.isExtraPlayer &&
                              "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-400 dark:border-l-blue-500"
                          )}
                        >
                          <div className="flex flex-col flex-grow">
                            <div className="flex items-center gap-2">
                              {player.isExtraPlayer &&
                              editingExtraPlayer === player.id ? (
                                <Input
                                  value={(player as ExtraPlayer).name}
                                  onChange={(e) =>
                                    updateExtraPlayerName(
                                      player.id,
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => setEditingExtraPlayer(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      setEditingExtraPlayer(null);
                                    }
                                  }}
                                  className="text-sm font-medium"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <span
                                    className={cn(
                                      "font-medium text-gray-900 dark:text-gray-100",
                                      player.isExtraPlayer &&
                                        "text-blue-700 dark:text-blue-300"
                                    )}
                                  >
                                    {formatPlayerName(player)}
                                  </span>
                                  {player.isExtraPlayer && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                      onClick={() =>
                                        setEditingExtraPlayer(player.id)
                                      }
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-sm",
                                player.isExtraPlayer
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-gray-500 dark:text-gray-400"
                              )}
                            >
                              {getPlayerPosition(player)}
                              {player.isExtraPlayer && " • Extra Player"}
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
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm
                        ? "No players found matching your search."
                        : "No players found in your club."}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {selectedPlayers.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>{selectedPlayers.length} players selected</strong>
                    {extraPlayersCount > 0 && (
                      <span>
                        {" "}
                        (including {extraPlayersCount} extra players)
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Button - right aligned with proper spacing */}
              <div className="flex justify-end pt-4">
                <Button
                  variant="primary"
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

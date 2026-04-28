import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import {
  CalendarIcon,
  Search,
  Plus,
  Minus,
  X,
  Edit2,
  ChevronLeft,
} from "lucide-react";
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
import { fetchActiveMembersBasic } from "@/integrations/supabase/clubMembers";
import { LocationSelector } from "@/components/forms/LocationSelector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  createOrReuseGuestByName,
  getLastPositionForPlayerInClub,
} from "@/integrations/supabase/players";
import { assignTeams } from "@/features/teams/assignLineup";
import { normalizeRole } from "@/features/teams/positions";
import {
  GuestNameSelector,
  GuestSummary,
} from "@/components/forms/GuestNameSelector";

interface ClubMember {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  primary_position_id?: string | null;
  primary_position_name?: string;
  secondary_position_name?: string | null;
  skill_rating?: number;
  gender?: string;
  height_cm?: number;
  isExtraPlayer: false;
}

interface ExtraPlayer {
  id: string; // can be "extra-..." for new guests or an existing player.id
  name: string; // guest first_name (no spaces)
  skill_rating: number;
  position: string;
  isExtraPlayer: true;
  existingPlayerId?: string | null;
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
  const { t } = useTranslation("games");

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

      // Centralized: active members for this club (basic fields)
      const members = await fetchActiveMembersBasic(clubId);
      if (!members.length) return [];

      const userIds = members.map((m) => m.user_id).filter(Boolean);

      // Get players for these users with their primary and secondary positions
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

      // Process players to get their primary and secondary positions
      const processedPlayers = (playersData || []).map((player) => {
        const primaryPosition = player.player_positions?.find(
          (pp) => pp.is_primary
        );
        const secondaryPosition = player.player_positions?.find(
          (pp) => !pp.is_primary
        );
        return {
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          user_id: player.user_id,
          primary_position_id: primaryPosition?.position_id || null,
          primary_position_name:
            primaryPosition?.positions?.name || "No Position",
          secondary_position_name:
            secondaryPosition?.positions?.name || null,
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

  // Handle extra players count change
  const handleExtraPlayersChange = (increment: boolean) => {
    const newCount = increment
      ? extraPlayersCount + 1
      : Math.max(0, extraPlayersCount - 1);

    if (increment) {
      const nextIndex = extraPlayers.length + 1;
      const defaultName = `Guest${nextIndex}`;
      const newExtraPlayer: ExtraPlayer = {
        id: `extra-${Date.now()}-${Math.random()}`,
        name: defaultName, // first_name, no spaces
        skill_rating: 5,
        position: "Any", // auto-assigned later / overridden by last position
        isExtraPlayer: true,
        existingPlayerId: null,
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
    const sanitized = newName.replace(/\s+/g, "");
    setExtraPlayers(
      extraPlayers.map((player) =>
        player.id === id
          ? { ...player, name: sanitized, existingPlayerId: null }
          : player
      )
    );
  };

  const setExtraFromExistingGuest = (id: string, guest: GuestSummary) => {
    const sanitizedFirst = guest.first_name.replace(/\s+/g, "");
    setExtraPlayers(
      extraPlayers.map((player) =>
        player.id === id
          ? {
              ...player,
              name: sanitizedFirst,
              existingPlayerId: guest.player_id,
            }
          : player
      )
    );
  };

  // Filter + sort:
  // - Regular players alphabetically by first_name
  // - Extra players only filtered, keep their creation order, and append after regulars
  const filteredAndSortedPlayers: (ClubMember | ExtraPlayer)[] = (() => {
    const term = searchTerm.toLowerCase().trim();

    const matchesRegular = (p: ClubMember) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(term);

    const matchesExtra = (p: ExtraPlayer) =>
      p.name.toLowerCase().includes(term);

    // 1) Regular players: filter + sort
    const regular: ClubMember[] = (players ?? []).filter((p) =>
      term ? matchesRegular(p) : true
    );

    regular.sort((a, b) => a.first_name.localeCompare(b.first_name));

    // 2) Extra players: filter only, keep original order from state
    const extras: ExtraPlayer[] = extraPlayers.filter((p) =>
      term ? matchesExtra(p) : true
    );

    // 3) Combined list: regulars first, then extras in their current order
    return [...regular, ...extras];
  })();

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
        title: t("game.dateRequired"),
        description: t("game.dateRequiredDesc"),
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (!selectedLocationId) {
      toast({
        title: t("game.locationRequired"),
        description: t("game.locationRequiredDesc"),
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (selectedPlayers.length < 4) {
      toast({
        title: t("game.notEnoughPlayers"),
        description: t("game.notEnoughPlayersDesc"),
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (!clubId || !user?.id) {
      toast({
        title: t("game.missingInfo"),
        description: t("game.missingInfoDesc"),
        variant: "destructive",
        duration: 2000,
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

      // 4. Create or reuse guest player records for extra players
      const extraPlayerRecords: {
        tempPlayerId: string;
        originalExtraId: string;
        position: string;
      }[] = [];

      // Resolve all extra players in parallel — each is independent
      const resolvedExtras = await Promise.all(
        extraPlayerIds.map(async (extraId) => {
          const extraPlayer = updatedExtraPlayers.find((ep) => ep.id === extraId);
          if (!extraPlayer) return null;

          let guestPlayerId: string;

          if (extraPlayer.existingPlayerId) {
            // Existing guest selected from autocomplete
            guestPlayerId = extraPlayer.existingPlayerId;
          } else {
            // New guest: first_name = name without spaces, last_name = "Player"
            const raw = extraPlayer.name.trim();
            const firstName = raw.replace(/\s+/g, "") || "Guest";

            const guestPlayer = await createOrReuseGuestByName(
              clubId!,
              firstName,
              "Player"
            );
            guestPlayerId = guestPlayer.id;
          }

          // Try to reuse the last position this guest played in this club
          const lastPos = await getLastPositionForPlayerInClub(clubId!, guestPlayerId);

          return {
            tempPlayerId: guestPlayerId,
            originalExtraId: extraId,
            position: lastPos ?? extraPlayer.position,
          };
        })
      );

      // Filter out any null entries (extraId not found in updatedExtraPlayers)
      for (const record of resolvedExtras) {
        if (record) extraPlayerRecords.push(record);
      }

      // 5. Build PlayerForTeams input and run spec-compliant team assignment
      const playersForTeams = [
        // Regular club members
        ...regularPlayerIds.flatMap((playerId) => {
          const player = players?.find((p) => p.id === playerId);
          if (!player) return [];
          return [{
            id: player.id,
            score: player.skill_rating ?? 50,
            mainPosition: normalizeRole(player.primary_position_name),
            secondaryPosition: player.secondary_position_name
              ? normalizeRole(player.secondary_position_name)
              : null,
          }];
        }),
        // Extra / guest players (using temp player IDs)
        ...extraPlayerRecords.flatMap((record) => {
          const extraPlayer = updatedExtraPlayers.find(
            (ep) => ep.id === record.originalExtraId
          );
          if (!extraPlayer) return [];
          return [{
            id: record.tempPlayerId,
            score: extraPlayer.skill_rating,
            mainPosition: normalizeRole(record.position),
            secondaryPosition: null,
          }];
        }),
      ];

      const teamAssignment = assignTeams(playersForTeams);

      // 6. Create game_players records
      type GamePlayerInsert = {
        match_day_id: string;
        player_id: string;
        team_name: "team_a" | "team_b";
        original_team_name: "team_a" | "team_b";
        manually_adjusted: boolean;
        position_played: string | null;
      };

      const allGamePlayers: GamePlayerInsert[] = [
        ...teamAssignment.teamA,
        ...teamAssignment.teamB,
      ].map((ap) => ({
        match_day_id: matchDay.id,
        player_id: ap.id,
        team_name: ap.team,
        original_team_name: ap.team,
        manually_adjusted: false,
        position_played: ap.assignedPosition,
      }));

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

      const baseDesc = `Your game has been created${
        extraPlayersCount > 0 ? ` with ${extraPlayersCount} extra players` : ""
      }`;
      const compromiseNote =
        teamAssignment.compromises.length > 0
          ? ` Note: ${teamAssignment.compromises.join("; ")}`
          : "";
      toast({
        title: "Game created!",
        description: baseDesc + compromiseNote,
        duration: 2000,
      });

      // Navigate to the new game
      navigate(`/game/${matchDay.id}`);
    } catch (error: unknown) {
      console.error("Error creating game:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create game. Please try again.",
        variant: "destructive",
        duration: 2000,
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
    return (player as ClubMember).primary_position_name || t("game.noPosition");
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
          <div className="flex items-center mb-7">
            <Button
              variant="outline"
              size="icon"
              className="mr-4"
              onClick={() => navigate(`/clubs/${clubId}`)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t("game.createNewGame")}
            </h1>
          </div>

          {isLoadingPlayers ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl pb-24">
              {/* Date Picker, Location, and Extra Players Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-14 justify-start text-left font-normal border-gray-300 dark:border-gray-600",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? (
                        format(date, "EEEE, do MMMM yyyy", { locale: getDateLocale() })
                      ) : (
                        <span>{t("game.selectGameDate")}</span>
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

                {/* Location Selector */}
                <LocationSelector
                  clubId={clubId!}
                  value={selectedLocationId}
                  onValueChange={setSelectedLocationId}
                  placeholder="Select or create location"
                  className="h-14"
                />

                {/* Add Extra Players */}
                <div className="bg-white dark:bg-gray-800 h-14 px-4 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t("game.addGuests")}
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

              {/* Players Selection */}
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                <div className="bg-amber-400 dark:bg-amber-500 p-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black">
                    {t("game.selectPlayers")}
                  </h2>
                  <div className="flex items-center gap-3">
                    {/* Search */}
                    {isSearchExpanded ? (
                      <Input
                        type="text"
                        placeholder={t("game.searchPlayers")}
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
                            "flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer select-none",
                            player.isExtraPlayer &&
                              "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-400 dark:border-l-blue-500"
                          )}
                          onClick={() => handlePlayerToggle(player.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handlePlayerToggle(player.id);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-pressed={selectedPlayers.includes(player.id)}
                        >
                          <div className="flex flex-col flex-grow">
                            <div className="flex items-center gap-2">
                              {player.isExtraPlayer ? (
                                <GuestNameSelector
                                  clubId={clubId!}
                                  value={(player as ExtraPlayer).name}
                                  onValueChange={(newName) =>
                                    updateExtraPlayerName(player.id, newName)
                                  }
                                  onExistingGuestSelected={(guest) =>
                                    setExtraFromExistingGuest(player.id, guest)
                                  }
                                  className="max-w-[220px]"
                                />
                              ) : (
                                <span
                                  className={cn(
                                    "font-medium text-gray-900 dark:text-gray-100"
                                  )}
                                >
                                  {formatPlayerName(player)}
                                </span>
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
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm
                        ? t("game.noPlayersSearch")
                        : t("game.noPlayersClub")}
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
                  disabled={
                    isSubmitting ||
                    selectedPlayers.length < 4 ||
                    !date ||
                    !selectedLocationId
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      {t("game.creatingGame")}
                    </>
                  ) : (
                    t("game.createTeams")
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

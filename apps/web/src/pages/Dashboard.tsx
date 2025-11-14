import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import SetBox from "@/components/match/SetBox";
import AddSetBox from "@/components/match/AddSetBox";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyTeamsState } from "@/components/team-generator/EmptyTeamsState";
import { EmptyGameState } from "@/components/common/EmptyGameState";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Pencil, MapPin } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";
import { useParams } from "react-router-dom";
import CopyableClubId from "@/components/clubs/CopyableClubId";
import {
  fetchUserRole,
  useMemberCount,
} from "@/integrations/supabase/clubMembers";
import { formatShortName } from "@/lib/formatName";
import { normalizeRole, CANONICAL_ORDER } from "@/features/teams/positions";
import type { CanonicalRole } from "@/features/teams/positions";

// Define proper interfaces
interface GamePlayerData {
  player_id: string;
  team_name: string;
  position_name: string;
  order_index?: number | null;
  players: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

type UIPlayer = {
  id: string;
  name: string;
  position: string; // display label exactly as stored (e.g. "Opposite Hitter")
  sortRole: CanonicalRole; // normalized only for sorting fallback
  orderIndex?: number | null;
};

const sortByOrderThenCanonical = (a: UIPlayer, b: UIPlayer) => {
  const ao = a.orderIndex;
  const bo = b.orderIndex;
  // If both have manual order, use it
  if (ao != null && bo != null) return ao - bo;
  // If one has manual order, prefer it
  if (ao != null) return -1;
  if (bo != null) return 1;
  // Fallback: canonical order
  return (
    CANONICAL_ORDER.indexOf(a.sortRole) - CANONICAL_ORDER.indexOf(b.sortRole)
  );
};

interface MatchData {
  id: string;
  game_number: number;
  team_a_score: number | null;
  team_b_score: number | null;
}

interface MatchDayData {
  id: string;
  date: string;
  notes: string | null;
  location_id: string | null;
  matches: MatchData[];
  game_players: GamePlayerData[];
  locations?: {
    id: string;
    name: string;
  } | null;
}

// Helper function to check if game can still be edited (within 1 day)
const canEditGame = (gameDate: string | Date): boolean => {
  const game = new Date(gameDate);
  const now = new Date();

  // Calculate the difference in milliseconds
  const timeDiff = now.getTime() - game.getTime();

  // Convert to days (24 hours = 86400000 milliseconds)
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  // Allow editing for 1 full day after the game (so < 1 day means still editable)
  return daysDiff < 1;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isCheckingClub, setIsCheckingClub] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clubMemberCount, setClubMemberCount] = useState(0);
  const { setClubId } = useClub();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (urlClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, setClubId]);

  // Use urlClubId for the rest of the component
  const userClubId = urlClubId;

  // Check if user belongs to any club or has created one
  useEffect(() => {
    const checkUserClub = async () => {
      if (!user?.id) return;

      try {
        // If clubId is provided in URL, use that
        if (userClubId) {
          // Store the visited club in localStorage for future logins
          localStorage.setItem("lastVisitedClub", userClubId);

          // Verify user has access to this club
          const memberRole = await fetchUserRole(user.id, userClubId);
          if (memberRole) {
            setUserRole(memberRole);
            setIsCheckingClub(false);
            return;
          }

          // Check if user is the creator
          const { data: creatorCheck } = await supabase
            .from("clubs")
            .select("id")
            .eq("id", userClubId)
            .eq("created_by", user.id)
            .maybeSingle();

          if (creatorCheck) {
            setUserRole("admin");
            setIsCheckingClub(false);
            return;
          }

          // User doesn't have access to this club
          /*console.log(
            "[DASH]",
            "navigating from",
            location.pathname,
            "to",
            "/clubs",
            "reason: User have no access to this club"
          );*/

          navigate("/clubs");
          return;
        }

        // User doesn't belong to any club and hasn't created one
        /* console.log(
          "[DASH]",
          "navigating from",
          location.pathname,
          "to",
          "/start",
          "reason: User doesn't belong to any club and hasn't created one"
        );*/
        navigate("/start");
      } catch (error) {
        console.error("Error checking user club:", error);
        // On error, safely redirect to start
        /*console.log(
          "[DASH]",
          "navigating from",
          location.pathname,
          "to",
          "/start",
          "reason: On error, safely redirect to start"
        );*/
        navigate("/start");
      } finally {
        setIsCheckingClub(false);
      }
    };

    checkUserClub();
  }, [user, navigate, userClubId]);

  // Query to fetch club details including name
  const { data: clubDetails } = useQuery({
    queryKey: ["clubDetails", userClubId],
    queryFn: async () => {
      if (!userClubId) return null;

      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, slug")
        .eq("id", userClubId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  // Query to fetch club member count (centralized helper)
  const { data: memberCount } = useMemberCount(userClubId, {
    enabled: !!userClubId && !isCheckingClub,
  });

  // Update member count when query data changes
  useEffect(() => {
    if (memberCount !== undefined) {
      setClubMemberCount(memberCount);
    }
  }, [memberCount]);

  useEffect(() => {
    // console. log(("=== USER OBJECT DEBUG ===");
    // console. log(("Full user object:", user);
    // console. log(("user.role:", user?.role);
    // console. log(("typeof user.role:", typeof user?.role);
  }, [user]);

  // Query to fetch the latest game with separate queries to avoid relation issues
  const { data: latestGame, isLoading } = useQuery({
    queryKey: ["latestGame", userClubId],
    queryFn: async (): Promise<MatchDayData | null> => {
      if (!userClubId) return null;

      // Get the latest match day that actually has players
      const { data: allMatchDays, error: matchDayError } = await supabase
        .from("match_days")
        .select(
          `
        id,
        date,
        notes,
        created_at,
        location_id,
        matches (
          id,
          game_number,
          team_a_score,
          team_b_score
        )
      `
        )
        .eq("club_id", userClubId)
        .order("created_at", { ascending: false });

      if (matchDayError) {
        console.error("Match day error:", matchDayError);
        throw matchDayError;
      }

      // Find the latest match day that has game players
      let selectedMatchDay = null;
      if (allMatchDays && allMatchDays.length > 0) {
        for (const md of allMatchDays) {
          // Quick check if this match day has game players
          const { data: playerCheck } = await supabase
            .from("game_players")
            .select("id")
            .eq("match_day_id", md.id)
            .limit(1);

          if (playerCheck && playerCheck.length > 0) {
            selectedMatchDay = md;
            break;
          }
        }
      }

      if (!selectedMatchDay) {
        return null;
      }

      // Get location data separately
      let locationData = null;
      if (selectedMatchDay.location_id) {
        const { data: location } = await supabase
          .from("locations")
          .select("id, name")
          .eq("id", selectedMatchDay.location_id)
          .single();

        locationData = location;
      }

      // Get game players
      // Try WITH order_index first
      let gamePlayersRaw:
        | {
            player_id: string;
            team_name: string;
            position_played: string | null;
            order_index: number | null;
          }[]
        | null = null;

      let gamePlayersError: unknown = null;

      // Attempt #1: with order_index
      {
        const { data, error } = await supabase
          .from("game_players")
          .select("player_id, team_name, position_played, order_index")
          .eq("match_day_id", selectedMatchDay.id)
          .order("team_name", { ascending: true })
          .order("order_index", { ascending: true, nullsFirst: true });

        if (!error) {
          gamePlayersRaw = data;
        } else {
          // If the column doesn't exist, fall back to query without it
          gamePlayersError = error;
          const { data: dataNoOrder, error: errNoOrder } = await supabase
            .from("game_players")
            .select("player_id, team_name, position_played")
            .eq("match_day_id", selectedMatchDay.id);

          if (!errNoOrder) {
            // normalize to same shape (order_index absent)
            gamePlayersRaw = (dataNoOrder ?? []).map((gp) => ({
              ...gp,
              order_index: null as number | null,
            }));
          } else {
            gamePlayersError = errNoOrder;
          }
        }
      }

      let gamePlayers: GamePlayerData[] = [];

      if (gamePlayersRaw && gamePlayersRaw.length > 0) {
        // Get player IDs
        const playerIds = gamePlayersRaw.map((gp) => gp.player_id);

        // Then get the player details
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, first_name, last_name")
          .in("id", playerIds);

        if (playersError) {
          console.error("Players error:", playersError);
        }

        // Combine the data
        if (playersData) {
          gamePlayers = gamePlayersRaw.map((gp) => {
            const player = playersData.find((p) => p.id === gp.player_id);
            return {
              player_id: gp.player_id,
              team_name: gp.team_name,
              position_name: gp.position_played || "No Position",
              order_index: gp.order_index ?? null, // typed, no `any`
              players: player || {
                id: gp.player_id,
                first_name: "Unknown",
                last_name: "Player",
              },
            };
          });
        }
      }

      // Combine the data
      const result: MatchDayData = {
        id: selectedMatchDay.id,
        date: selectedMatchDay.date,
        notes: selectedMatchDay.notes,
        location_id: selectedMatchDay.location_id,
        matches: selectedMatchDay.matches || [],
        game_players: gamePlayers,
        locations: locationData,
      };

      return result;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  const handleInviteMembers = () => {
    if (userClubId) {
      /*console.log(
        "[DASHBOARD]",
        "navigating from",
        location.pathname,
        "to",
        "/invite-members",
        "reason: Inviting members to the club"
      );*/
      navigate(`/invite-members/${userClubId}`);
    }
  };

  const handleCreateGame = () => {
    if (userClubId) {
      /*console.log(
        "[DASHBOARD]",
        "navigating from",
        location.pathname,
        "to",
        "/new-game/:clubId",
        "reason: Creating a new Game"
      );*/
      navigate(`/new-game/${userClubId}`);
    }
  };

  // Show loading state while checking club membership
  if (isCheckingClub) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  // Loading state while fetching the latest game
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  // If no games exist yet, show the empty state
  if (!latestGame) {
    const canGenerateTeams = clubMemberCount >= 4;
    const canInviteMembers = userRole === "admin";

    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow overflow-y-auto p-4 pt-8">
          <EmptyGameState
            clubName={clubDetails?.name}
            clubSlug={clubDetails?.slug}
            memberCount={clubMemberCount}
            canGenerateTeams={canGenerateTeams}
            canInviteMembers={canInviteMembers}
            onInviteMembers={handleInviteMembers}
            onCreateGame={handleCreateGame}
            variant="dashboard"
          />
        </div>
      </div>
    );
  }

  // Process the game players to extract teams
  let teamAPlayers: Array<{
    id: string;
    name: string;
    position: string;
    sortRole: CanonicalRole;
  }> = [];
  let teamBPlayers: Array<{
    id: string;
    name: string;
    position: string;
    sortRole: CanonicalRole;
  }> = [];

  if (latestGame?.game_players) {
    // console. log(("=== GAME PLAYERS DEBUG ===");
    // console. log(("Game players:", latestGame.game_players);

    const toUI = (gp: GamePlayerData): UIPlayer => {
      const display = gp.position_name ?? "No Position";
      return {
        id: gp.player_id,
        name: formatShortName(gp.players.first_name, gp.players.last_name),
        position: display, // keep exact label for UI
        sortRole: normalizeRole(gp.position_name), // only for sorting
        orderIndex: gp.order_index ?? null, // manual order if present
      };
    };

    teamAPlayers = latestGame.game_players
      .filter((gp) => gp.team_name === "team_a")
      .map(toUI)
      .sort(sortByOrderThenCanonical);

    teamBPlayers = latestGame.game_players
      .filter((gp) => gp.team_name === "team_b")
      .map(toUI)
      .sort(sortByOrderThenCanonical);

    // console. log(("Team A players:", teamAPlayers);
    // console. log(("Team B players:", teamBPlayers);
  }

  // Check if editing is still allowed (within 1 day of game date)
  const isEditingAllowed = latestGame?.date
    ? canEditGame(latestGame.date)
    : false;

  // Organize match scores
  const scores = latestGame.matches.map((match) => ({
    gameNumber: match.game_number,
    teamA: match.team_a_score,
    teamB: match.team_b_score,
  }));

  // Convenience maps for quick lookup
  const scoresByNumber = new Map<
    number,
    { teamA: number | null; teamB: number | null }
  >();
  for (const s of scores)
    scoresByNumber.set(s.gameNumber, {
      teamA: s.teamA ?? null,
      teamB: s.teamB ?? null,
    });

  // Extra sets (>5), sorted ascending
  const extraSets = [...latestGame.matches]
    .filter((m) => m.game_number > 5)
    .sort((a, b) => a.game_number - b.game_number);

  // Next set number: first extra is 6, then 7, 8...
  const nextSetNumber = (() => {
    const existing = latestGame.matches.map((m) => m.game_number);
    const currentMax = existing.length ? Math.max(...existing) : 5;
    return Math.max(5, currentMax) + 1;
  })();

  // Calculate the match result
  const teamAWins = scores.filter(
    (game) =>
      game.teamA !== null && game.teamB !== null && game.teamA > game.teamB
  ).length;

  const teamBWins = scores.filter(
    (game) =>
      game.teamA !== null && game.teamB !== null && game.teamB > game.teamA
  ).length;

  // Winner team
  const hasPlayedAnySet = scores.some(
    (game) =>
      game.teamA !== null &&
      game.teamB !== null &&
      (game.teamA > 0 || game.teamB > 0)
  );

  const winner = hasPlayedAnySet
    ? teamAWins > teamBWins
      ? "Team A"
      : teamBWins > teamAWins
      ? "Team B"
      : "Tie"
    : "TBD";

  const handleSetScoreUpdate = async (
    setNumber: number,
    teamAScore: number,
    teamBScore: number
  ) => {
    // console. log(("=== SCORE UPDATE DEBUG ===");
    // console. log(("Set Number:", setNumber);
    // console. log(("Team A Score:", teamAScore);
    // console. log(("Team B Score:", teamBScore);
    // console. log(("Latest Game:", latestGame);
    // console. log(("All Matches:", latestGame?.matches);

    try {
      // Find the match to update
      const matchToUpdate = latestGame?.matches?.find(
        (m) => m.game_number === setNumber
      );

      // console. log(("Match to update:", matchToUpdate);

      if (!matchToUpdate) {
        console.error("No match found for set number:", setNumber);
        return;
      }

      // console. log(("Updating match with ID:", matchToUpdate.id);

      // Update score in the database
      const { data, error } = await supabase
        .from("matches")
        .update({
          team_a_score: teamAScore,
          team_b_score: teamBScore,
        })
        .eq("id", matchToUpdate.id)
        .select(); // Add select() to see what was updated

      // console. log(("Supabase update result:", { data, error });

      if (error) {
        console.error("Error updating match score:", error);
        return;
      }

      // console. log(("Successfully updated match:", data);

      // Invalidate and refetch the latest game query
      // console. log(("Invalidating queries for userClubId:", userClubId);
      await queryClient.invalidateQueries({
        queryKey: ["latestGame", userClubId],
      });

      // console. log(("Queries invalidated successfully");
    } catch (error) {
      console.error("Error in handleSetScoreUpdate:", error);
    }
  };

  // OPTIONAL: clamp to your DB constraint (1..9)
  const MAX_SETS = 9; // keep in sync with DB constraint
  const canAddAnotherSet = nextSetNumber <= MAX_SETS;

  // Insert a new set (match row) for this match day
  const handleAddSet = async () => {
    if (!latestGame?.id) return;
    if (!canAddAnotherSet) return; // guard to avoid 23514
    try {
      const { data, error } = await supabase
        .from("matches")
        .insert({
          match_day_id: latestGame.id,
          game_number: nextSetNumber,
          team_a_score: 0,
          team_b_score: 0,
        })
        .select();

      if (error) {
        console.error("Error adding new set:", error);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["latestGame", userClubId],
      });
    } catch (e) {
      console.error("Error in handleAddSet:", e);
    }
  };

  // Delete an extra set (>5) by setNumber
  const handleDeleteSet = async (setNumber: number) => {
    if (setNumber <= 5) return; // guard
    try {
      const matchToDelete = latestGame?.matches?.find(
        (m) => m.game_number === setNumber
      );
      if (!matchToDelete) return;
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchToDelete.id);
      if (error) {
        console.error("Error deleting set:", error);
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["latestGame", userClubId],
      });
    } catch (e) {
      console.error("Error in handleDeleteSet:", e);
    }
  };

  // Format the match date
  const matchDate = latestGame.date ? new Date(latestGame.date) : new Date();
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Mobile-only short date: "Sun, Nov. 2, 2025"
  const formatDateMobile = (date: Date) => {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
    }).format(date); // e.g., "Sun"
    const monthShort = new Intl.DateTimeFormat("en-US", {
      month: "short",
    }).format(date); // e.g., "Nov"
    const day = date.getDate();
    const year = date.getFullYear();
    // Add a trailing period after the abbreviated month
    return `${weekday}, ${monthShort}. ${day}, ${year}`;
  };

  // Determine if the match is from today
  const today = new Date();
  const isMatchToday = matchDate.toDateString() === today.toDateString();

  // Determine which heading to display
  const headingText = isMatchToday
    ? "Today's Game Overview"
    : "Last Game Overview";

  const handleEditTeamsClick = () => {
    // console. log(("=== EDIT TEAMS BUTTON CLICKED ===");
    // console. log(("userClubId:", userClubId);
    // console. log(("latestGame:", latestGame);
    // console. log(("latestGame.id:", latestGame?.id);
    // console. log(("userRole:", userRole);
    // console. log(("clubDetails:", clubDetails);

    if (!userClubId) {
      console.error("❌ No userClubId found!");
      return;
    }

    if (!latestGame?.id) {
      console.error("❌ No latestGame.id found!");
      return;
    }

    const targetPath = `/edit-game/${userClubId}/${latestGame.id}`;
    // console. log(("🚀 Navigating to:", targetPath);
    /*console.log(
      "[DASHBOARD]",
      "navigating from",
      location.pathname,
      "to",
      "/edit-game/:clubId/:latestGameId",
      "reason: Clicked on Edit Game Button"
    );*/
    navigate(targetPath);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with title and buttons */}
          <div className="mb-8">
            {/* Desktop Layout */}
            <div className="hidden sm:block">
              <h1 className="text-4xl font-serif mb-2 text-gray-900 dark:text-gray-100">
                {headingText}
              </h1>

              <div className="flex justify-between items-end">
                {/* Desktop layout: Club name + date/location in one row */}
                {clubDetails?.name && (
                  <div className="hidden sm:flex flex-row items-center justify-start gap-2 mb-3">
                    <div className="text-xl font-semibold text-primary dark:text-blue-600">
                      Club: {clubDetails.name}
                    </div>
                    <div className="text-xl flex items-center text-gray-600 dark:text-gray-400 gap-3">
                      <span>|</span>
                      <span>{formatDate(matchDate)}</span>
                      {latestGame?.locations?.name && (
                        <>
                          <span>|</span>
                          <div className="flex items-center ">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{latestGame.locations.name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {isEditingAllowed && (
                  <Button
                    variant="action"
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={handleEditTeamsClick}
                    size="sm"
                  >
                    Edit Teams
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="sm:hidden">
              <h1 className="text-4xl font-serif mb-2 text-gray-900 dark:text-gray-100">
                {headingText}
              </h1>

              {/* Club name header (same styling as Members) */}
              {clubDetails?.name && (
                <div className="mb-3">
                  <div className="text-2xl font-semibold tracking-tight border-b border-border pb-2 text-primary dark:text-blue-600">
                    Club: {clubDetails.name}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center text-gray-600 dark:text-gray-400 gap-x-2 mb-3">
                {/* Mobile short date */}
                <span className="whitespace-nowrap">
                  {formatDateMobile(matchDate)}
                </span>

                {latestGame?.locations?.name && (
                  <div className="flex items-center whitespace-nowrap">
                    <span className="mr-2">|</span>
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{latestGame.locations.name}</span>
                  </div>
                )}
              </div>
              {isEditingAllowed && (
                <div className="flex justify-end">
                  <Button
                    variant="action"
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={handleEditTeamsClick}
                    size="sm"
                  >
                    Edit Teams
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left Column - Winner Card */}
            <div className="h-full">
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 h-full flex flex-col">
                <div className="bg-volleyball-primary dark:bg-blue-700 text-white p-4 text-center">
                  <h2 className="text-2xl font-bold">SCORE</h2>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 text-center flex-grow flex flex-col justify-center">
                  <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                    {hasPlayedAnySet ? winner : "TBD"}
                  </h3>
                  <div className="text-5xl font-bold">
                    <span className="text-red-500">{teamAWins}</span> -{" "}
                    <span className="text-emerald-500">{teamBWins}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Team Cards */}
            <div className="h-full">
              <div className="flex h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Team A Card */}
                <div className="w-1/2 bg-white dark:bg-gray-800 p-0">
                  <h3 className="bg-red-500 dark:bg-red-600 text-white py-1 px-2 text-center">
                    Team A
                  </h3>
                  <ul className="space-y-0.5 p-4">
                    {teamAPlayers.map((player, index) => (
                      <li key={player.id} className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          <span className="block sm:inline">
                            {index + 1}. {player.name}
                            {player.position && (
                              <span className="hidden sm:inline"> - </span>
                            )}
                          </span>
                          {player.position && (
                            <span className="block sm:inline text-xs sm:text-sm text-gray-600 dark:text-gray-400 sm:font-medium">
                              {player.position}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Team B Card */}
                <div className="w-1/2 bg-white dark:bg-gray-800 p-0">
                  <h3 className="bg-emerald-500 dark:bg-emerald-600 text-white py-1 px-2 text-center">
                    Team B
                  </h3>
                  <ul className="space-y-0.5 p-4">
                    {teamBPlayers.map((player, index) => (
                      <li key={player.id} className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          <span className="block sm:inline">
                            {index + 1}. {player.name}
                            {player.position && (
                              <span className="hidden sm:inline"> - </span>
                            )}
                          </span>
                          {player.position && (
                            <span className="block sm:inline text-xs sm:text-sm text-gray-600 dark:text-gray-400 sm:font-medium">
                              {player.position}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sets Layout - Grid arrangement */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Set 1 - Larger box on the left spanning two rows */}
            <div className="md:row-span-2 order-1">
              <SetBox
                key={1}
                setNumber={1}
                teamAScore={scoresByNumber.get(1)?.teamA ?? null}
                teamBScore={scoresByNumber.get(1)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isLarge={true}
                isEditingAllowed={isEditingAllowed}
              />
            </div>

            {/* Set 2 */}
            <div className="order-2">
              <SetBox
                key={2}
                setNumber={2}
                teamAScore={scoresByNumber.get(2)?.teamA ?? null}
                teamBScore={scoresByNumber.get(2)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isEditingAllowed={isEditingAllowed}
              />
            </div>

            {/* Set 3 */}
            <div className="order-3 md:order-4">
              <SetBox
                key={3}
                setNumber={3}
                teamAScore={scoresByNumber.get(3)?.teamA ?? null}
                teamBScore={scoresByNumber.get(3)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isEditingAllowed={isEditingAllowed}
              />
            </div>

            {/* Set 4 */}
            <div className="order-4 md:order-3">
              <SetBox
                key={4}
                setNumber={4}
                teamAScore={scoresByNumber.get(4)?.teamA ?? null}
                teamBScore={scoresByNumber.get(4)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isEditingAllowed={isEditingAllowed}
              />
            </div>

            {/* Set 5 */}
            <div className="order-5 md:order-4">
              <SetBox
                key={5}
                setNumber={5}
                teamAScore={scoresByNumber.get(5)?.teamA ?? null}
                teamBScore={scoresByNumber.get(5)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isEditingAllowed={isEditingAllowed}
              />
            </div>

            {/* Extra sets (>5) */}
            {extraSets.map((m) => (
              <div key={m.id} className="order-6">
                <SetBox
                  setNumber={m.game_number}
                  teamAScore={m.team_a_score}
                  teamBScore={m.team_b_score}
                  onScoreUpdate={handleSetScoreUpdate}
                  onDelete={handleDeleteSet}
                  isEditingAllowed={isEditingAllowed}
                  isDeletable={m.game_number > 5}
                />
              </div>
            ))}

            {/* Add Set dashed box – always last, same grid footprint */}
            <div className="order-7">
              <AddSetBox onClick={handleAddSet} disabled={!canAddAnotherSet} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

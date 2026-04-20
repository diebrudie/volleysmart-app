import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Pencil,
  Trophy,
  Edit,
  Save,
  X,
  Trash,
  ChevronDown,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import SetBox from "@/components/match/SetBox";
import AddSetBox from "@/components/match/AddSetBox";
import { LocationSelector } from "@/components/forms/LocationSelector";
import { formatShortName, formatFirstLastInitial } from "@/lib/formatName";
import { fetchUserRole } from "@/integrations/supabase/clubMembers";
import { normalizeRole, CANONICAL_ORDER } from "@/features/teams/positions";
import type { CanonicalRole } from "@/features/teams/positions";
import { useIsMobile } from "@/hooks/use-mobile";

// ── Types ────────────────────────────────────────────────────────────────────

interface GamePlayerData {
  player_id: string;
  team_name: string;
  position_name: string;
  order_index?: number | null;
  snapshot_name?: string | null;
  players: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

type UIPlayer = {
  id: string;
  name: string;
  position: string;
  sortRole: CanonicalRole;
  orderIndex?: number | null;
};

interface MatchData {
  id: string;
  game_number: number;
  team_a_score: number;
  team_b_score: number;
}

interface MatchDayData {
  id: string;
  date: string;
  notes: string | null;
  club_id: string;
  location_id: string | null;
  planned_event_id: string | null;
  matches: MatchData[];
  game_players: GamePlayerData[];
  clubs: { name: string };
  locations?: { id: string; name: string } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const sortByOrderThenCanonical = (a: UIPlayer, b: UIPlayer) => {
  const ao = a.orderIndex;
  const bo = b.orderIndex;
  if (ao != null && bo != null) return ao - bo;
  if (ao != null) return -1;
  if (bo != null) return 1;
  return (
    CANONICAL_ORDER.indexOf(a.sortRole) - CANONICAL_ORDER.indexOf(b.sortRole)
  );
};

const canEditGame = (gameDate: string | Date): boolean => {
  const game = new Date(gameDate);
  const now = new Date();
  const daysDiff = (now.getTime() - game.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff < 1;
};

/** Prefer snapshot_name; then live player name; then fallback */
function displayPlayerName(gp: GamePlayerData): string {
  const snap = gp.snapshot_name?.trim();
  if (snap) {
    const parts = snap.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return formatFirstLastInitial(parts[0], parts[parts.length - 1]);
    }
    return snap;
  }
  const p = gp.players;
  if (p?.first_name || p?.last_name) {
    return formatShortName(p.first_name ?? "", p.last_name ?? "");
  }
  return "Deleted P.";
}

// ── Component ────────────────────────────────────────────────────────────────

const Game = () => {
  const { matchDayId } = useParams<{ matchDayId: string }>();
  const navigate = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const { clubId, setClubId } = useClub();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [editing, setEditing] = useState(false);
  const [editedGames, setEditedGames] = useState<MatchData[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  const goBack = () => {
    if ((loc.state as any)?.fromTab === "past") {
      navigate("/home", { state: { tab: "past" } });
    } else {
      navigate(-1);
    }
  };

  // ── Fetch match day ────────────────────────────────────────────────────────

  const {
    data: matchData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["game", matchDayId],
    queryFn: async (): Promise<MatchDayData> => {
      if (!matchDayId) throw new Error("Match day ID is required");

      const { data: matchDay, error: mdError } = await supabase
        .from("match_days")
        .select(
          `
          id, date, notes, club_id, location_id,
          planned_event_id,
          matches ( id, game_number, team_a_score, team_b_score ),
          clubs ( name ),
          locations ( id, name )
        ` as unknown as string
        )
        .eq("id", matchDayId)
        .single();

      if (mdError) throw mdError;

      // Game players (with snapshot_name + order_index)
      type GPRaw = {
        player_id: string;
        team_name: string;
        position_played: string | null;
        order_index: number | null;
        snapshot_name: string | null;
      };

      let gamePlayersRaw: GPRaw[] = [];
      {
        const { data, error } = await supabase
          .from("game_players")
          .select(
            "player_id, team_name, position_played, order_index, snapshot_name" as unknown as string
          )
          .eq("match_day_id", matchDayId)
          .order("team_name", { ascending: true })
          .order("order_index", { ascending: true, nullsFirst: true });

        if (!error) {
          gamePlayersRaw = (data ?? []) as unknown as GPRaw[];
        } else {
          // Fallback without order_index/snapshot_name
          const { data: d2 } = await supabase
            .from("game_players")
            .select("player_id, team_name, position_played")
            .eq("match_day_id", matchDayId);
          gamePlayersRaw = ((d2 ?? []) as any[]).map((gp) => ({
            ...gp,
            order_index: null,
            snapshot_name: null,
          }));
        }
      }

      // Fetch player details
      let gamePlayers: GamePlayerData[] = [];
      if (gamePlayersRaw.length > 0) {
        const playerIds = gamePlayersRaw.map((gp) => gp.player_id);
        const { data: playersData } = await supabase
          .from("players")
          .select("id, first_name, last_name")
          .in("id", playerIds);

        gamePlayers = gamePlayersRaw.map((gp) => {
          const player = (playersData ?? []).find(
            (p) => p.id === gp.player_id
          );
          return {
            player_id: gp.player_id,
            team_name: gp.team_name,
            position_name: gp.position_played || "No Position",
            order_index: gp.order_index,
            snapshot_name: gp.snapshot_name,
            players: player || {
              id: gp.player_id,
              first_name: "Unknown",
              last_name: "Player",
            },
          };
        });
      }

      const md = matchDay as any;
      return {
        id: md.id,
        date: md.date,
        notes: md.notes,
        club_id: md.club_id,
        location_id: md.location_id,
        planned_event_id: md.planned_event_id ?? null,
        matches: md.matches ?? [],
        game_players: gamePlayers,
        clubs: md.clubs,
        locations: md.locations ?? null,
      };
    },
    enabled: !!matchDayId,
  });

  // Set club context
  useEffect(() => {
    if (matchData?.club_id && matchData.club_id !== clubId) {
      setClubId(matchData.club_id);
    }
  }, [matchData, clubId, setClubId]);

  // Initialize editing state
  useEffect(() => {
    if (matchData) {
      setEditedGames([...matchData.matches]);
    }
  }, [matchData]);

  // ── Permissions ────────────────────────────────────────────────────────────

  const { data: userRole } = useQuery({
    queryKey: ["userPermissions", matchData?.club_id, user?.id],
    enabled: !!matchData?.club_id && !!user?.id,
    queryFn: async () => {
      if (!matchData?.club_id || !user?.id) return null;
      return fetchUserRole(user.id, matchData.club_id);
    },
  });

  const isAdminOrEditor = userRole === "admin" || userRole === "editor";
  const isEditingAllowed = matchData?.date ? canEditGame(matchData.date) : false;
  const canEditScores = isAdminOrEditor;

  // ── Score editing (table mode from GameDetail) ─────────────────────────────

  const handleScoreChange = (
    gameIndex: number,
    team: "team_a_score" | "team_b_score",
    value: string
  ) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      const newGames = [...editedGames];
      newGames[gameIndex] = { ...newGames[gameIndex], [team]: numValue };
      setEditedGames(newGames);
    }
  };

  const handleSaveChanges = async () => {
    if (!matchData) return;
    try {
      for (const game of editedGames) {
        const { error } = await supabase
          .from("matches")
          .update({
            team_a_score: game.team_a_score,
            team_b_score: game.team_b_score,
          })
          .eq("id", game.id);
        if (error) throw error;
      }
      toast({ title: "Changes saved", description: "Scores updated.", duration: 1200 });
      setEditing(false);
      refetch();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive", duration: 2000 });
    }
  };

  // ── SetBox score editing (inline, from Dashboard) ──────────────────────────

  const handleSetScoreUpdate = async (
    setNumber: number,
    teamAScore: number,
    teamBScore: number
  ) => {
    const matchToUpdate = matchData?.matches?.find(
      (m) => m.game_number === setNumber
    );
    if (!matchToUpdate) return;

    const { error } = await supabase
      .from("matches")
      .update({ team_a_score: teamAScore, team_b_score: teamBScore })
      .eq("id", matchToUpdate.id);

    if (error) {
      console.error("Error updating match score:", error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["game", matchDayId] });
  };

  // ── Add / delete extra sets ────────────────────────────────────────────────

  const MAX_SETS = 9;

  const scoresByNumber = new Map<number, { teamA: number | null; teamB: number | null }>();
  for (const m of matchData?.matches ?? []) {
    scoresByNumber.set(m.game_number, {
      teamA: m.team_a_score ?? null,
      teamB: m.team_b_score ?? null,
    });
  }

  const extraSets = [...(matchData?.matches ?? [])]
    .filter((m) => m.game_number > 5)
    .sort((a, b) => a.game_number - b.game_number);

  const nextSetNumber = (() => {
    const existing = (matchData?.matches ?? []).map((m) => m.game_number);
    const currentMax = existing.length ? Math.max(...existing) : 5;
    return Math.max(5, currentMax) + 1;
  })();

  const set5 = scoresByNumber.get(5);
  const isSet5Scored = set5 !== undefined && set5.teamA !== null && set5.teamB !== null;
  const canAddAnotherSet = isEditingAllowed && isSet5Scored && nextSetNumber <= MAX_SETS;

  const handleAddSet = async () => {
    if (!matchData?.id || !isEditingAllowed || !canAddAnotherSet) return;
    const { error } = await supabase
      .from("matches")
      .insert({
        match_day_id: matchData.id,
        game_number: nextSetNumber,
        team_a_score: 0,
        team_b_score: 0,
      })
      .select();
    if (error) {
      console.error("Error adding new set:", error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["game", matchDayId] });
  };

  const handleDeleteSet = async (setNumber: number) => {
    if (!isEditingAllowed || setNumber <= 5) return;
    const matchToDelete = matchData?.matches?.find((m) => m.game_number === setNumber);
    if (!matchToDelete) return;
    const { error } = await supabase.from("matches").delete().eq("id", matchToDelete.id);
    if (error) {
      console.error("Error deleting set:", error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["game", matchDayId] });
  };

  // ── Delete match ───────────────────────────────────────────────────────────

  const handleDeleteMatch = async () => {
    if (!matchData) return;
    try {
      const { error } = await supabase
        .from("match_days")
        .delete()
        .eq("id", matchData.id);
      if (error) throw error;
      toast({ title: "Match deleted", duration: 1500 });
      navigate(`/games/${matchData.club_id}`);
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({ title: "Error", description: "Failed to delete match.", variant: "destructive", duration: 2000 });
    }
  };

  // ── Create new game with same teams ────────────────────────────────────────

  const handleCreateSameTeams = async () => {
    if (!matchData || !user?.id) return;
    try {
      const { data: matchDay, error: mdError } = await supabase
        .from("match_days")
        .insert({
          date: format(new Date(), "yyyy-MM-dd"),
          created_by: user.id,
          club_id: matchData.club_id,
          team_generated: true,
          location_id: matchData.location_id,
        })
        .select()
        .single();
      if (mdError) throw mdError;

      const matches = Array.from({ length: 5 }, (_, i) => ({
        match_day_id: matchDay.id,
        game_number: i + 1,
        team_a_score: 0,
        team_b_score: 0,
        added_by_user_id: user.id,
      }));
      const { error: mError } = await supabase.from("matches").insert(matches).select();
      if (mError) throw mError;

      const gamePlayersToInsert = matchData.game_players.map((gp) => ({
        match_day_id: matchDay.id,
        player_id: gp.player_id,
        team_name: gp.team_name,
        original_team_name: gp.team_name,
        manually_adjusted: false,
        position_played: gp.position_name === "No Position" ? null : gp.position_name,
      }));
      const { error: gpError } = await supabase.from("game_players").insert(gamePlayersToInsert);
      if (gpError) throw gpError;

      toast({ title: "Game created!", description: "New game with the same teams", duration: 1500 });
      navigate(`/game/${matchDay.id}`);
    } catch (error) {
      console.error("Error creating new game:", error);
      toast({ title: "Error", description: "Failed to create new game.", variant: "destructive", duration: 2000 });
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

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

  if (error || !matchData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Match not found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The match you're looking for doesn't exist or you don't have access.
            </p>
            <Button onClick={goBack}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Process teams ──────────────────────────────────────────────────────────

  const toUI = (gp: GamePlayerData): UIPlayer => ({
    id: gp.player_id,
    name: displayPlayerName(gp),
    position: gp.position_name ?? "No Position",
    sortRole: normalizeRole(gp.position_name),
    orderIndex: gp.order_index ?? null,
  });

  const teamAPlayers = matchData.game_players
    .filter((gp) => gp.team_name === "team_a")
    .map(toUI)
    .sort(sortByOrderThenCanonical);

  const teamBPlayers = matchData.game_players
    .filter((gp) => gp.team_name === "team_b")
    .map(toUI)
    .sort(sortByOrderThenCanonical);

  // ── Score calculations ─────────────────────────────────────────────────────

  const scores = matchData.matches.map((m) => ({
    gameNumber: m.game_number,
    teamA: m.team_a_score,
    teamB: m.team_b_score,
  }));

  const teamAWins = scores.filter(
    (g) => g.teamA !== null && g.teamB !== null && g.teamA > g.teamB
  ).length;
  const teamBWins = scores.filter(
    (g) => g.teamA !== null && g.teamB !== null && g.teamB > g.teamA
  ).length;
  const hasPlayedAnySet = scores.some(
    (g) => g.teamA !== null && g.teamB !== null && (g.teamA > 0 || g.teamB > 0)
  );
  const winner = hasPlayedAnySet
    ? teamAWins > teamBWins
      ? "Team A"
      : teamBWins > teamAWins
      ? "Team B"
      : "Tie"
    : "TBD";

  const totalScore = {
    teamA: matchData.matches.reduce((sum, g) => sum + g.team_a_score, 0),
    teamB: matchData.matches.reduce((sum, g) => sum + g.team_b_score, 0),
  };

  const matchWinner =
    teamAWins > teamBWins
      ? "Team A"
      : teamBWins > teamAWins
      ? "Team B"
      : "Draw";

  // ── Date formatting ────────────────────────────────────────────────────────

  const matchDate = matchData.date ? new Date(matchData.date) : new Date();
  const today = new Date();
  const isMatchToday = matchDate.toDateString() === today.toDateString();

  const formatDateLong = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatDateMobile = (date: Date) => {
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
    const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
    return `${weekday}, ${monthShort}. ${date.getDate()}, ${date.getFullYear()}`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="mr-4"
                onClick={goBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isMatchToday ? "Today's Game" : "Game Details"}
                </h1>
                {matchData.clubs?.name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {matchData.clubs.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Edit Teams button (inline, within edit window) */}
              {isEditingAllowed && isAdminOrEditor && (
                <Button
                  variant="action"
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() =>
                    navigate(
                      `/edit-game/${matchData.club_id}/${matchData.id}`
                    )
                  }
                  size="sm"
                >
                  Edit Teams
                </Button>
              )}

              {/* View Event link */}
              {matchData.planned_event_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/events/${matchData.planned_event_id}`)
                  }
                >
                  <CalendarCheck className="h-4 w-4 mr-1" />
                  View Event
                </Button>
              )}

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="action" size="sm">
                    Actions
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={isMobile ? "start" : "end"}
                  className="w-56"
                >
                  <DropdownMenuItem
                    onClick={handleCreateSameTeams}
                    className="text-gray-700 dark:text-gray-300"
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    New Game w. same Teams
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {canEditScores && !editing && (
                    <DropdownMenuItem
                      onClick={() => setEditing(true)}
                      className="text-gray-700 dark:text-gray-300"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Scores
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setIsEditingLocation(true)}
                    className="text-gray-700 dark:text-gray-300"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Edit Location
                  </DropdownMenuItem>
                  {isAdminOrEditor && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Match Info Row */}
          <Card className="mb-6">
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-top">
                  <Calendar className="h-5 w-5 mt-0.5 text-volleyball-primary dark:text-blue-400 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      <span className="hidden sm:inline">{formatDateLong(matchDate)}</span>
                      <span className="sm:hidden">{formatDateMobile(matchDate)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-top">
                  <MapPin className="h-5 w-5 mt-0.5 text-volleyball-primary dark:text-blue-400 mr-2 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location</p>
                    {isEditingLocation ? (
                      <div className="space-y-2">
                        <LocationSelector
                          clubId={matchData.club_id}
                          value={matchData.location_id || undefined}
                          onValueChange={async (locationId) => {
                            try {
                              const { error } = await supabase
                                .from("match_days")
                                .update({ location_id: locationId })
                                .eq("id", matchData.id);
                              if (error) throw error;
                              toast({ title: "Location updated", duration: 1500 });
                              setIsEditingLocation(false);
                              refetch();
                            } catch (err) {
                              console.error("Error updating location:", err);
                              toast({ title: "Error", description: "Failed to update location.", variant: "destructive", duration: 2000 });
                            }
                          }}
                          placeholder="Select or create location"
                          className="max-w-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingLocation(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p
                        className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => setIsEditingLocation(true)}
                      >
                        {matchData.locations?.name || "Click to set location"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-top">
                  <Trophy className="h-5 w-5 mt-0.5 text-volleyball-primary dark:text-blue-400 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Result</p>
                    <p className="font-medium text-lg text-gray-900 dark:text-gray-100">
                      <span className={teamAWins > teamBWins ? "font-bold text-red-500" : ""}>
                        {teamAWins}
                      </span>
                      <span className="mx-2">-</span>
                      <span className={teamBWins > teamAWins ? "font-bold text-emerald-500" : ""}>
                        {teamBWins}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({hasPlayedAnySet ? winner : "TBD"})
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teams (side-by-side, Dashboard style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Team A */}
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
              {/* Team B */}
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

            {/* Score overview card */}
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
          </div>

          {/* Sets (Dashboard-style SetBox grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:row-span-2 order-1">
              <SetBox
                setNumber={1}
                teamAScore={scoresByNumber.get(1)?.teamA ?? null}
                teamBScore={scoresByNumber.get(1)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isLarge={true}
                isEditingAllowed={isEditingAllowed && isAdminOrEditor}
              />
            </div>
            <div className="order-2">
              <SetBox
                setNumber={2}
                teamAScore={scoresByNumber.get(2)?.teamA ?? null}
                teamBScore={scoresByNumber.get(2)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isEditingAllowed={isEditingAllowed && isAdminOrEditor}
              />
            </div>
            <div className="order-3 md:order-4">
              <SetBox
                setNumber={3}
                teamAScore={scoresByNumber.get(3)?.teamA ?? null}
                teamBScore={scoresByNumber.get(3)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isEditingAllowed={isEditingAllowed && isAdminOrEditor}
              />
            </div>
            <div className="order-4 md:order-3">
              <SetBox
                setNumber={4}
                teamAScore={scoresByNumber.get(4)?.teamA ?? null}
                teamBScore={scoresByNumber.get(4)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isEditingAllowed={isEditingAllowed && isAdminOrEditor}
              />
            </div>
            <div className="order-5 md:order-4">
              <SetBox
                setNumber={5}
                teamAScore={scoresByNumber.get(5)?.teamA ?? null}
                teamBScore={scoresByNumber.get(5)?.teamB ?? null}
                onScoreUpdate={handleSetScoreUpdate}
                isEditingAllowed={isEditingAllowed && isAdminOrEditor}
              />
            </div>
            {extraSets.map((m) => (
              <div key={m.id} className="order-6">
                <SetBox
                  setNumber={m.game_number}
                  teamAScore={m.team_a_score}
                  teamBScore={m.team_b_score}
                  onScoreUpdate={handleSetScoreUpdate}
                  onDelete={isEditingAllowed && isAdminOrEditor ? handleDeleteSet : undefined}
                  isEditingAllowed={isEditingAllowed && isAdminOrEditor}
                  isDeletable={m.game_number > 5 && isEditingAllowed && isAdminOrEditor}
                />
              </div>
            ))}
            {isEditingAllowed && isAdminOrEditor && (
              <div className="order-7">
                <AddSetBox onClick={handleAddSet} disabled={!canAddAnotherSet} />
              </div>
            )}
          </div>

          {/* Match Scores table (from GameDetail, toggled via Edit Scores action) */}
          {editing && (
            <Card className="mb-8">
              <CardContent className="p-3 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Edit Match Scores
                </h3>
                <div className="rounded-md border dark:border-gray-700 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Set
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Team A
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Team B
                        </th>
                        <th className="pl-6 pr-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Winner
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {editedGames
                        .sort((a, b) => a.game_number - b.game_number)
                        .map((game, index) => (
                          <tr key={game.id}>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100 text-sm">
                              Set {game.game_number}
                            </td>
                            <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-right">
                              <Input
                                type="number"
                                min="0"
                                value={game.team_a_score}
                                onChange={(e) =>
                                  handleScoreChange(index, "team_a_score", e.target.value)
                                }
                                className="w-16 inline-block text-right"
                              />
                            </td>
                            <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-right">
                              <Input
                                type="number"
                                min="0"
                                value={game.team_b_score}
                                onChange={(e) =>
                                  handleScoreChange(index, "team_b_score", e.target.value)
                                }
                                className="w-16 inline-block text-right"
                              />
                            </td>
                            <td className="pl-6 pr-2 sm:px-6 py-4 whitespace-nowrap">
                              {game.team_a_score + game.team_b_score > 0 ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    game.team_a_score > game.team_b_score
                                      ? "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                      : game.team_b_score > game.team_a_score
                                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                  }`}
                                >
                                  {game.team_a_score > game.team_b_score
                                    ? "Team A"
                                    : game.team_b_score > game.team_a_score
                                    ? "Team B"
                                    : "Tie"}
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-xs">
                                  Not played
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          Total Points
                        </td>
                        <td className="px-2 sm:px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                          {editedGames.reduce((s, g) => s + g.team_a_score, 0)}
                        </td>
                        <td className="px-2 sm:px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                          {editedGames.reduce((s, g) => s + g.team_b_score, 0)}
                        </td>
                        <td className="pl-6 pr-2 sm:px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              matchWinner === "Team A"
                                ? "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                : matchWinner === "Team B"
                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {matchWinner}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setEditedGames([...matchData.matches]);
                    }}
                    className="flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveChanges}
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              match and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMatch}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Game;

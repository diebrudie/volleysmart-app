import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Trophy,
  Edit,
  Save,
  X,
  Trash,
  Calendar,
  CalendarCheck,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import SetBox from "@/components/match/SetBox";
import AddSetBox from "@/components/match/AddSetBox";
import { LocationSelector } from "@/components/forms/LocationSelector";
import { formatShortName, formatFirstLastInitial } from "@/lib/formatName";
import { fetchUserRole } from "@/integrations/supabase/clubMembers";
import { normalizeRole, CANONICAL_ORDER } from "@/features/teams/positions";
import type { CanonicalRole } from "@/features/teams/positions";
import { useIsMobile } from "@/hooks/use-mobile";

/** Shorten two-word positions: "Outside Hitter" → "O. Hitter", "Middle Blocker" → "M. Blocker" */
const shortenPosition = (pos: string): string => {
  const parts = pos.split(" ");
  if (parts.length === 2) return `${parts[0][0]}. ${parts[1]}`;
  return pos;
};

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
    } else if (clubId) {
      navigate(`/clubs/${clubId}`);
    } else {
      navigate("/clubs");
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
  const isSet5Scored = set5 !== undefined && set5.teamA !== null && set5.teamB !== null && (set5.teamA > 0 || set5.teamB > 0);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Match not found</h2>
          <p className="text-muted-foreground mb-4">
            The match you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={goBack}>Go Back</Button>
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

  const formatDateShort = (date: Date) => {
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
    const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
    return `${weekday}, ${monthShort}. ${date.getDate()}, ${date.getFullYear()}`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Gradient hero (short, ClubOverview style) */}
      <div className="relative h-28 sm:h-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-primary/20" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Back button — top left */}
        <button
          onClick={goBack}
          className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* 3-dot menu — top right */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur flex items-center justify-center">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isEditingAllowed && isAdminOrEditor && (
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/edit-game/${matchData.club_id}/${matchData.id}`)
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Teams
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setIsEditingLocation(true)}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Edit Location
            </DropdownMenuItem>
            {matchData.planned_event_id && (
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/events/${matchData.planned_event_id}`)
                }
              >
                <CalendarCheck className="mr-2 h-4 w-4" />
                View Event
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title + info row */}
      <div className="px-4 pt-5 space-y-3">
        <h1 className="text-2xl font-bold">
          {isMatchToday ? "Today's Game" : "Game Details"}
        </h1>

        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {matchData.clubs?.name && (
              <span className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" />
                {matchData.clubs.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateShort(matchDate)}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {matchData.locations?.name && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {matchData.locations.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {teamAPlayers.length + teamBPlayers.length} players
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Location editing inline */}
        {isEditingLocation && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
            <p className="text-sm font-medium">Update Location</p>
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
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingLocation(false)}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Teams (side-by-side) */}
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="flex">
            <div className="w-1/2 bg-card">
              <h3 className="bg-red-500 dark:bg-red-600 text-white py-2 px-3 text-center text-sm font-semibold">
                Team A
              </h3>
              <ul className="space-y-1 p-3">
                {teamAPlayers.map((player, index) => (
                  <li key={player.id} className="flex items-center text-sm min-w-0">
                    <span className="font-medium shrink-0">
                      {index + 1}.&nbsp;
                    </span>
                    <span className="font-medium truncate">
                      {player.name}
                    </span>
                    {player.position && player.position !== "No Position" && (
                      <span className="text-xs text-muted-foreground ml-1 whitespace-nowrap">
                        — {shortenPosition(player.position)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-1/2 bg-card border-l border-border">
              <h3 className="bg-emerald-500 dark:bg-emerald-600 text-white py-2 px-3 text-center text-sm font-semibold">
                Team B
              </h3>
              <ul className="space-y-1 p-3">
                {teamBPlayers.map((player, index) => (
                  <li key={player.id} className="flex items-center text-sm min-w-0">
                    <span className="font-medium shrink-0">
                      {index + 1}.&nbsp;
                    </span>
                    <span className="font-medium truncate">
                      {player.name}
                    </span>
                    {player.position && player.position !== "No Position" && (
                      <span className="text-xs text-muted-foreground ml-1 whitespace-nowrap">
                        — {shortenPosition(player.position)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Score overview */}
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground py-3 text-center">
            <h2 className="text-lg font-bold tracking-wide">SCORE</h2>
          </div>
          <div className="bg-card p-6 text-center">
            <p className="text-2xl font-bold mb-2">
              {hasPlayedAnySet ? winner : "TBD"}
            </p>
            <div className="text-5xl font-bold">
              <span className="text-red-500">{teamAWins}</span>
              <span className="mx-2 text-muted-foreground">-</span>
              <span className="text-emerald-500">{teamBWins}</span>
            </div>
          </div>
        </div>

        {/* Sets grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Edit Scores table */}
        {editing && (
          <div className="rounded-xl border border-border bg-card p-3 sm:p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Edit Match Scores
            </h3>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Set
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Team A
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Team B
                    </th>
                    <th className="pl-6 pr-2 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Winner
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {editedGames
                    .sort((a, b) => a.game_number - b.game_number)
                    .map((game, index) => (
                      <tr key={game.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium text-foreground text-sm">
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
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {game.team_a_score > game.team_b_score
                                ? "Team A"
                                : game.team_b_score > game.team_a_score
                                ? "Team B"
                                : "Tie"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Not played
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  <tr className="bg-muted font-semibold">
                    <td className="px-3 sm:px-6 py-4 text-sm text-foreground">
                      Total Points
                    </td>
                    <td className="px-2 sm:px-6 py-4 text-right text-foreground">
                      {editedGames.reduce((s, g) => s + g.team_a_score, 0)}
                    </td>
                    <td className="px-2 sm:px-6 py-4 text-right text-foreground">
                      {editedGames.reduce((s, g) => s + g.team_b_score, 0)}
                    </td>
                    <td className="pl-6 pr-2 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          matchWinner === "Team A"
                            ? "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                            : matchWinner === "Team B"
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
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
          </div>
        )}
        </div>

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

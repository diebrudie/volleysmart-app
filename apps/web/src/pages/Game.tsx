import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSameTeams } from "@volleysmart/core";
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
  Radio,
  Shield,
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
const shortenPosition = (pos: string, translate?: (key: string, opts?: any) => string): string => {
  const translated = translate ? translate(`positions.name.${pos}`, { defaultValue: pos }) : pos;
  const parts = translated.split(" ");
  if (parts.length === 2) return `${parts[0][0]}. ${parts[1]}`;
  return translated;
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
    user_id: string | null;
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
  is_opponent_mode: boolean;
  opponent_team_name: string | null;
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
function displayPlayerName(gp: GamePlayerData, deletedLabel = "Deleted P."): string {
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
  return deletedLabel;
}

// ── Component ────────────────────────────────────────────────────────────────

const Game = () => {
  const { t } = useTranslation("games");
  const { t: tProfile } = useTranslation("profile");
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
    if (matchData?.planned_event_id) {
      navigate(`/events/${matchData.planned_event_id}`);
    } else if ((loc.state as any)?.fromTab === "past") {
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
          planned_event_id, is_opponent_mode, opponent_team_name,
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
          .select("id, user_id, first_name, last_name")
          .in("id", playerIds);

        gamePlayers = gamePlayersRaw.map((gp) => {
          const player = (playersData ?? []).find(
            (p) => p.id === gp.player_id
          );
          return {
            player_id: gp.player_id,
            team_name: gp.team_name,
            position_name: gp.position_played || t("game.noPosition"),
            order_index: gp.order_index,
            snapshot_name: gp.snapshot_name,
            players: player || {
              id: gp.player_id,
              user_id: null,
              first_name: t("game.unknownFirstName"),
              last_name: t("game.unknownLastName"),
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
        is_opponent_mode: md.is_opponent_mode ?? false,
        opponent_team_name: md.opponent_team_name ?? null,
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
  const isMember = !!userRole;
  const isEditingAllowed = matchData?.date ? canEditGame(matchData.date) : false;

  const isTeamPlayer = Boolean(
    user?.id &&
    matchData?.game_players?.some(
      (gp) => gp.players?.user_id === user.id
    )
  );
  const canEdit = isMember || isTeamPlayer;

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
      toast({ title: t("game.toastChangesSaved"), description: t("game.toastScoresUpdated"), duration: 1200 });
      setEditing(false);
      refetch();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({ title: t("game.toastError"), description: t("game.toastFailedSaveChanges"), variant: "destructive", duration: 2000 });
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
      toast({ title: t("game.toastMatchDeleted"), duration: 1500 });
      navigate(`/games/${matchData.club_id}`);
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({ title: t("game.toastError"), description: t("game.toastFailedDeleteMatch"), variant: "destructive", duration: 2000 });
    }
  };

  // ── Create new game with same teams ────────────────────────────────────────

  const handleCreateSameTeams = async () => {
    if (!matchData || !user?.id) return;
    try {
      // Shared core path: also creates a parallel planned_event (dated today,
      // same players/location) so the new game is reachable from the Events
      // list after navigating away, and editable there.
      const matchDay = await createSameTeams(matchData.id, user.id);
      toast({ title: t("game.toastGameCreated"), description: t("game.toastNewGameSameTeams"), duration: 1500 });
      navigate(`/game/${matchDay.id}`);
    } catch (error) {
      console.error("Error creating new game:", error);
      toast({ title: t("game.toastError"), description: t("game.toastFailedCreateGame"), variant: "destructive", duration: 2000 });
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
          <h2 className="text-xl font-semibold mb-2">{t("game.matchNotFound")}</h2>
          <p className="text-muted-foreground mb-4">
            {t("game.matchNotFoundDescription")}
          </p>
          <Button onClick={goBack}>{t("game.goBack")}</Button>
        </div>
      </div>
    );
  }

  // ── Process teams ──────────────────────────────────────────────────────────

  const toUI = (gp: GamePlayerData): UIPlayer => ({
    id: gp.player_id,
    name: displayPlayerName(gp, t("game.deletedPlayer")),
    position: gp.position_name ?? t("game.noPosition"),
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

  const teamALabel = matchData.is_opponent_mode && matchData.clubs?.name
    ? matchData.clubs.name
    : t("game.teamA");
  const teamBLabel = matchData.is_opponent_mode
    ? (matchData.opponent_team_name || t("game.newGame.opponentTeam"))
    : t("game.teamB");

  const winner = hasPlayedAnySet
    ? teamAWins > teamBWins
      ? teamALabel
      : teamBWins > teamAWins
      ? teamBLabel
      : t("game.tie")
    : t("game.tbd");

  const matchWinner =
    teamAWins > teamBWins
      ? teamALabel
      : teamBWins > teamAWins
      ? teamBLabel
      : t("game.draw");

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
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between h-14 px-4">
          <button
            onClick={goBack}
            className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">
            {isMatchToday ? t("game.todaysGame") : t("game.gameDetails")}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isEditingAllowed && canEdit && !matchData.is_opponent_mode && (
                <DropdownMenuItem
                  onClick={() =>
                    navigate(`/edit-game/${matchData.club_id}/${matchData.id}`)
                  }
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("game.editTeams")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setIsEditingLocation(true)}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {t("game.editLocation")}
              </DropdownMenuItem>
              {matchData.planned_event_id && (
                <DropdownMenuItem
                  onClick={() =>
                    navigate(`/events/${matchData.planned_event_id}`)
                  }
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  {t("game.viewEvent")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="h-14" />

      {/* Info row */}
      <div className="px-4 pt-5 space-y-3 max-w-3xl mx-auto w-full">
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
              {t("game.playerCount", { count: teamAPlayers.length + teamBPlayers.length })}
            </span>
            {matchData.is_opponent_mode && (
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {matchData.opponent_team_name || t("game.newGame.opponentTeam")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Location editing inline */}
        {isEditingLocation && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
            <p className="text-sm font-medium">{t("game.updateLocation")}</p>
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
                  toast({ title: t("game.toastLocationUpdated"), duration: 1500 });
                  setIsEditingLocation(false);
                  refetch();
                } catch (err) {
                  console.error("Error updating location:", err);
                  toast({ title: t("game.toastError"), description: t("game.toastFailedUpdateLocation"), variant: "destructive", duration: 2000 });
                }
              }}
              placeholder={t("game.selectOrCreateLocation")}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingLocation(false)}
            >
              {t("game.cancel")}
            </Button>
          </div>
        )}

        {/* Teams (side-by-side) */}
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="flex">
            <div className={matchData.is_opponent_mode ? "w-1/2 bg-card" : "w-1/2 bg-card"}>
              <h3 className="bg-red-500 dark:bg-red-600 text-white py-2 px-3 text-center text-sm font-semibold">
                {matchData.is_opponent_mode && matchData.clubs?.name ? matchData.clubs.name : t("game.teamA")}
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
                    {player.position && player.position !== t("game.noPosition") && (
                      <span className="text-xs text-muted-foreground ml-1 whitespace-nowrap">
                        — {shortenPosition(player.position, tProfile)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-1/2 bg-card border-l border-border">
              <h3 className="bg-emerald-500 dark:bg-emerald-600 text-white py-2 px-3 text-center text-sm font-semibold">
                {matchData.is_opponent_mode
                  ? (matchData.opponent_team_name || t("game.newGame.opponentTeam"))
                  : t("game.teamB")}
              </h3>
              {matchData.is_opponent_mode ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Shield className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    {matchData.opponent_team_name || t("game.newGame.opponentTeam")}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1 p-3">
                  {teamBPlayers.map((player, index) => (
                    <li key={player.id} className="flex items-center text-sm min-w-0">
                      <span className="font-medium shrink-0">
                        {index + 1}.&nbsp;
                      </span>
                      <span className="font-medium truncate">
                        {player.name}
                      </span>
                      {player.position && player.position !== t("game.noPosition") && (
                        <span className="text-xs text-muted-foreground ml-1 whitespace-nowrap">
                          — {shortenPosition(player.position, tProfile)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Score overview */}
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground py-3 text-center">
            <h2 className="text-lg font-bold tracking-wide">{t("game.score")}</h2>
          </div>
          <div className="bg-card p-6 text-center">
            <p className="text-2xl font-bold mb-2">
              {hasPlayedAnySet ? winner : t("game.tbd")}
            </p>
            <div className="text-5xl font-bold">
              <span className="text-red-500">{teamAWins}</span>
              <span className="mx-2 text-muted-foreground">-</span>
              <span className="text-emerald-500">{teamBWins}</span>
            </div>
          </div>
        </div>

        {/* Live Score Tracker button */}
        {isEditingAllowed && canEdit && isMatchToday && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate(`/live-score/${matchDayId}`)}
          >
            <Radio className="h-4 w-4 mr-2" />
            {t("game.liveScoreTracker")}
          </Button>
        )}

        {/* Sets grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:row-span-2 order-1">
            <SetBox
              setNumber={1}
              teamAScore={scoresByNumber.get(1)?.teamA ?? null}
              teamBScore={scoresByNumber.get(1)?.teamB ?? null}
              onScoreUpdate={handleSetScoreUpdate}
              isLarge={true}
              isEditingAllowed={isEditingAllowed && canEdit}
            />
          </div>
          <div className="order-2">
            <SetBox
              setNumber={2}
              teamAScore={scoresByNumber.get(2)?.teamA ?? null}
              teamBScore={scoresByNumber.get(2)?.teamB ?? null}
              onScoreUpdate={handleSetScoreUpdate}
              isEditingAllowed={isEditingAllowed && canEdit}
            />
          </div>
          <div className="order-3 md:order-4">
            <SetBox
              setNumber={3}
              teamAScore={scoresByNumber.get(3)?.teamA ?? null}
              teamBScore={scoresByNumber.get(3)?.teamB ?? null}
              onScoreUpdate={handleSetScoreUpdate}
              isEditingAllowed={isEditingAllowed && canEdit}
            />
          </div>
          <div className="order-4 md:order-3">
            <SetBox
              setNumber={4}
              teamAScore={scoresByNumber.get(4)?.teamA ?? null}
              teamBScore={scoresByNumber.get(4)?.teamB ?? null}
              onScoreUpdate={handleSetScoreUpdate}
              isEditingAllowed={isEditingAllowed && canEdit}
            />
          </div>
          <div className="order-5 md:order-4">
            <SetBox
              setNumber={5}
              teamAScore={scoresByNumber.get(5)?.teamA ?? null}
              teamBScore={scoresByNumber.get(5)?.teamB ?? null}
              onScoreUpdate={handleSetScoreUpdate}
              isEditingAllowed={isEditingAllowed && canEdit}
            />
          </div>
          {extraSets.map((m) => (
            <div key={m.id} className="order-6">
              <SetBox
                setNumber={m.game_number}
                teamAScore={m.team_a_score}
                teamBScore={m.team_b_score}
                onScoreUpdate={handleSetScoreUpdate}
                onDelete={isEditingAllowed && canEdit ? handleDeleteSet : undefined}
                isEditingAllowed={isEditingAllowed && canEdit}
                isDeletable={m.game_number > 5 && isEditingAllowed && canEdit}
              />
            </div>
          ))}
          {isEditingAllowed && canEdit && (
            <div className="order-7">
              <AddSetBox onClick={handleAddSet} disabled={!canAddAnotherSet} />
            </div>
          )}
        </div>

        {/* Edit Scores table */}
        {editing && (
          <div className="rounded-xl border border-border bg-card p-3 sm:p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              {t("game.editMatchScores")}
            </h3>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("game.set")}
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("game.teamA")}
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("game.teamB")}
                    </th>
                    <th className="pl-6 pr-2 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("game.winner")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {editedGames
                    .sort((a, b) => a.game_number - b.game_number)
                    .map((game, index) => (
                      <tr key={game.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium text-foreground text-sm">
                          {t("game.setNumber", { number: game.game_number })}
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
                                ? teamALabel
                                : game.team_b_score > game.team_a_score
                                ? teamBLabel
                                : t("game.tie")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {t("game.notPlayed")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  <tr className="bg-muted font-semibold">
                    <td className="px-3 sm:px-6 py-4 text-sm text-foreground">
                      {t("game.totalPoints")}
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
                          matchWinner === teamALabel
                            ? "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                            : matchWinner === teamBLabel
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
                {t("game.cancel")}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveChanges}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                {t("game.saveChanges")}
              </Button>
            </div>
          </div>
        )}
        </div>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("game.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("game.deleteConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              {t("game.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteMatch}>
              {t("game.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Game;

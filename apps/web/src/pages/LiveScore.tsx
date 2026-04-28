import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/integrations/supabase/clubMembers";

const MAX_SETS = 9;

const canEditGame = (gameDate: string | Date): boolean => {
  const game = new Date(gameDate);
  const now = new Date();
  const daysDiff = (now.getTime() - game.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff < 1;
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
  club_id: string;
  matches: MatchData[];
  game_players: { player_id: string; players: { user_id: string | null } }[];
}

const LiveScore = () => {
  const { matchDayId } = useParams<{ matchDayId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [teamAPoints, setTeamAPoints] = useState(0);
  const [teamBPoints, setTeamBPoints] = useState(0);
  const [undoStack, setUndoStack] = useState<("a" | "b")[]>([]);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showEndSetConfirm, setShowEndSetConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [allSetsComplete, setAllSetsComplete] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  const isTrackingRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // ── Forced landscape orientation ────────────────────────────────────────────

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);

    try {
      screen.orientation?.lock?.("landscape").catch(() => {});
    } catch {}

    return () => {
      window.removeEventListener("resize", checkOrientation);
      try { screen.orientation?.unlock?.(); } catch {}
    };
  }, []);

  // ── Wake lock ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake lock not supported or denied
      }
    };
    requestWakeLock();
    return () => {
      wakeLockRef.current?.release();
    };
  }, []);

  // ── Fetch match day data ────────────────────────────────────────────────────

  const { data: matchData, isLoading } = useQuery({
    queryKey: ["liveScore", matchDayId],
    queryFn: async (): Promise<MatchDayData> => {
      if (!matchDayId) throw new Error("Match day ID is required");

      const { data: matchDay, error: mdError } = await supabase
        .from("match_days")
        .select(
          `
          id, date, club_id,
          matches ( id, game_number, team_a_score, team_b_score )
        ` as unknown as string
        )
        .eq("id", matchDayId)
        .single();

      if (mdError) throw mdError;

      const { data: gpData } = await supabase
        .from("game_players")
        .select("player_id, players:player_id ( user_id )" as unknown as string)
        .eq("match_day_id", matchDayId);

      const md = matchDay as any;
      return {
        id: md.id,
        date: md.date,
        club_id: md.club_id,
        matches: (md.matches ?? []) as MatchData[],
        game_players: (gpData ?? []) as any[],
      };
    },
    enabled: !!matchDayId,
  });

  // ── Permissions ─────────────────────────────────────────────────────────────

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
  const isTeamPlayer = Boolean(
    user?.id && matchData?.game_players?.some((gp) => (gp.players as any)?.user_id === user.id)
  );
  const canEdit = isAdminOrEditor || isTeamPlayer;
  const isMatchToday = matchData?.date
    ? new Date(matchData.date).toDateString() === new Date().toDateString()
    : false;

  // ── Redirect if not authorized ──────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && matchData && (!isEditingAllowed || !canEdit || !isMatchToday)) {
      navigate(`/game/${matchDayId}`, { replace: true });
    }
  }, [isLoading, matchData, isEditingAllowed, canEdit, isMatchToday, matchDayId, navigate]);

  // ── Initialize current set from match data ──────────────────────────────────

  useEffect(() => {
    if (!matchData || isTrackingRef.current) return;

    const sorted = [...matchData.matches].sort((a, b) => a.game_number - b.game_number);
    const firstUnplayed = sorted.find(
      (m) => m.team_a_score === 0 && m.team_b_score === 0
    );

    if (firstUnplayed) {
      setCurrentSetNumber(firstUnplayed.game_number);
      setAllSetsComplete(false);
    } else if (sorted.length > 0) {
      const maxSetNumber = Math.max(...sorted.map((m) => m.game_number));
      if (maxSetNumber >= MAX_SETS) {
        setAllSetsComplete(true);
        setCurrentSetNumber(maxSetNumber);
      } else {
        setCurrentSetNumber(maxSetNumber + 1);
        setAllSetsComplete(false);
      }
    }
  }, [matchData]);

  // ── Completed sets ──────────────────────────────────────────────────────────

  const completedSets = (matchData?.matches ?? [])
    .filter((m) => m.team_a_score > 0 || m.team_b_score > 0)
    .sort((a, b) => a.game_number - b.game_number);

  // ── Set point hint ──────────────────────────────────────────────────────────

  const setTarget = currentSetNumber >= 5 ? 15 : 25;
  const teamAHasSetPoint =
    teamAPoints >= setTarget - 1 && teamAPoints > teamBPoints;
  const teamBHasSetPoint =
    teamBPoints >= setTarget - 1 && teamBPoints > teamAPoints;

  // ── Tap handlers ────────────────────────────────────────────────────────────

  const handleTapA = useCallback(() => {
    if (allSetsComplete) return;
    isTrackingRef.current = true;
    setTeamAPoints((p) => p + 1);
    setUndoStack((s) => [...s, "a"]);
    try { navigator.vibrate?.(10); } catch {}
  }, [allSetsComplete]);

  const handleTapB = useCallback(() => {
    if (allSetsComplete) return;
    isTrackingRef.current = true;
    setTeamBPoints((p) => p + 1);
    setUndoStack((s) => [...s, "b"]);
    try { navigator.vibrate?.(10); } catch {}
  }, [allSetsComplete]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last === "a") setTeamAPoints((p) => Math.max(0, p - 1));
      else setTeamBPoints((p) => Math.max(0, p - 1));
      return prev.slice(0, -1);
    });
  }, []);

  // ── End Set ─────────────────────────────────────────────────────────────────

  const handleEndSet = async () => {
    if (!matchData) return;
    setIsSaving(true);

    try {
      const existingMatch = matchData.matches.find(
        (m) => m.game_number === currentSetNumber
      );

      if (existingMatch) {
        const { error } = await supabase
          .from("matches")
          .update({ team_a_score: teamAPoints, team_b_score: teamBPoints })
          .eq("id", existingMatch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("matches")
          .insert({
            match_day_id: matchData.id,
            game_number: currentSetNumber,
            team_a_score: teamAPoints,
            team_b_score: teamBPoints,
          });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["liveScore", matchDayId] });
      queryClient.invalidateQueries({ queryKey: ["game", matchDayId] });

      toast({
        title: `Set ${currentSetNumber} saved!`,
        description: `${teamAPoints} - ${teamBPoints}`,
        duration: 1500,
      });

      setTeamAPoints(0);
      setTeamBPoints(0);
      setUndoStack([]);
      setShowEndSetConfirm(false);
      isTrackingRef.current = false;

      const nextSet = currentSetNumber + 1;
      if (nextSet > MAX_SETS) {
        setAllSetsComplete(true);
      } else {
        setCurrentSetNumber(nextSet);
      }
    } catch (error) {
      console.error("Error saving set:", error);
      toast({
        title: "Failed to save set",
        description: "Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Exit ────────────────────────────────────────────────────────────────────

  const handleExit = () => {
    if (teamAPoints > 0 || teamBPoints > 0) {
      setShowExitConfirm(true);
    } else {
      navigate(`/game/${matchDayId}`);
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    navigate(`/game/${matchDayId}`);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Game not found
      </div>
    );
  }

  // ── Confirmation content ────────────────────────────────────────────────────

  const endSetContent = (
    <>
      <div className="text-center py-4">
        <p className="text-lg font-semibold mb-2">Save Set {currentSetNumber}?</p>
        <p className="text-4xl font-bold">
          <span className="text-red-500">{teamAPoints}</span>
          <span className="mx-2 text-muted-foreground">-</span>
          <span className="text-emerald-500">{teamBPoints}</span>
        </p>
        {teamAPoints === 0 && teamBPoints === 0 && (
          <p className="text-sm text-amber-500 mt-2">Both scores are 0</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setShowEndSetConfirm(false)}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleEndSet}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Set"}
        </Button>
      </div>
    </>
  );

  const exitContent = (
    <>
      <div className="text-center py-4">
        <p className="text-lg font-semibold mb-2">Unsaved set in progress</p>
        <p className="text-muted-foreground">
          Set {currentSetNumber}: {teamAPoints} - {teamBPoints} will be lost.
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setShowExitConfirm(false)}
        >
          Keep Scoring
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={confirmExit}
        >
          Discard & Exit
        </Button>
      </div>
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const rotateStyle: React.CSSProperties = isPortrait
    ? {
        position: "fixed",
        top: 0,
        left: "100vw",
        width: "100vh",
        height: "100vw",
        transform: "rotate(90deg)",
        transformOrigin: "top left",
      }
    : { position: "fixed", inset: 0 };

  return (
    <div style={rotateStyle} className="bg-background flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
        <button
          onClick={handleExit}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-semibold">SET {currentSetNumber}</h1>
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Undo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Completed sets */}
      {completedSets.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-border shrink-0 overflow-x-auto">
          {completedSets.map((s) => {
            const aWon = s.team_a_score > s.team_b_score;
            return (
              <div
                key={s.game_number}
                className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                  aWon
                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                }`}
              >
                {s.game_number}: {s.team_a_score}-{s.team_b_score}
              </div>
            );
          })}
        </div>
      )}

      {/* Score display */}
      <div className="flex items-center justify-center py-6 shrink-0">
        <div className="text-center">
          <div className="text-7xl sm:text-8xl font-bold tabular-nums">
            <span className="text-red-500">{teamAPoints}</span>
            <span className="mx-3 text-muted-foreground text-5xl">-</span>
            <span className="text-emerald-500">{teamBPoints}</span>
          </div>
          <div className="flex justify-between px-4 mt-1">
            <span className="text-sm text-muted-foreground">Team A</span>
            <span className="text-sm text-muted-foreground">Team B</span>
          </div>
        </div>
      </div>

      {/* Tap targets */}
      <div className="flex-1 flex gap-3 px-3 min-h-0">
        {allSetsComplete ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-muted-foreground font-medium">
              All sets complete
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleTapA}
              className={`flex-1 rounded-2xl flex flex-col items-center justify-center transition-transform active:scale-[0.97] ${
                teamAHasSetPoint
                  ? "bg-red-200 dark:bg-red-900 ring-2 ring-red-400 animate-pulse"
                  : "bg-red-100 dark:bg-red-950"
              }`}
            >
              <span className="text-red-600 dark:text-red-400 text-2xl font-bold">
                Team A
              </span>
              <span className="text-red-500/60 text-lg mt-1">+1</span>
              {teamAHasSetPoint && (
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 mt-2 uppercase tracking-wider">
                  Set Point
                </span>
              )}
            </button>
            <button
              onClick={handleTapB}
              className={`flex-1 rounded-2xl flex flex-col items-center justify-center transition-transform active:scale-[0.97] ${
                teamBHasSetPoint
                  ? "bg-emerald-200 dark:bg-emerald-900 ring-2 ring-emerald-400 animate-pulse"
                  : "bg-emerald-100 dark:bg-emerald-950"
              }`}
            >
              <span className="text-emerald-600 dark:text-emerald-400 text-2xl font-bold">
                Team B
              </span>
              <span className="text-emerald-500/60 text-lg mt-1">+1</span>
              {teamBHasSetPoint && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 uppercase tracking-wider">
                  Set Point
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => setShowEndSetConfirm(true)}
          disabled={allSetsComplete}
        >
          End Set
        </Button>
      </div>

      {/* End Set confirmation — always Dialog (Drawer breaks in rotated container) */}
      <Dialog open={showEndSetConfirm} onOpenChange={setShowEndSetConfirm}>
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>End Set</DialogTitle>
            <DialogDescription>Confirm saving the current set score</DialogDescription>
          </DialogHeader>
          {endSetContent}
        </DialogContent>
      </Dialog>

      {/* Exit confirmation */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>Exit</DialogTitle>
            <DialogDescription>Confirm exiting with unsaved score</DialogDescription>
          </DialogHeader>
          {exitContent}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveScore;

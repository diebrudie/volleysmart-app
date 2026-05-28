import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Undo2, ArrowLeftRight } from "lucide-react";
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
const STORAGE_KEY_PREFIX = "vs-live-score-";

const canEditGame = (gameDate: string | Date): boolean => {
  const game = new Date(gameDate);
  const now = new Date();
  const daysDiff = (now.getTime() - game.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff < 3;
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

interface PersistedScore {
  teamAPoints: number;
  teamBPoints: number;
  undoStack: ("a" | "b")[];
  currentSetNumber: number;
  timestamp: number;
}

function getStorageKey(matchDayId: string) {
  return `${STORAGE_KEY_PREFIX}${matchDayId}`;
}

function loadPersistedScore(matchDayId: string): PersistedScore | null {
  try {
    const raw = localStorage.getItem(getStorageKey(matchDayId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedScore;
    const ageMs = Date.now() - parsed.timestamp;
    if (ageMs > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getStorageKey(matchDayId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistScore(matchDayId: string, score: Omit<PersistedScore, "timestamp">) {
  try {
    localStorage.setItem(
      getStorageKey(matchDayId),
      JSON.stringify({ ...score, timestamp: Date.now() })
    );
  } catch {}
}

function clearPersistedScore(matchDayId: string) {
  try {
    localStorage.removeItem(getStorageKey(matchDayId));
  } catch {}
}

const LiveScore = () => {
  const { matchDayId } = useParams<{ matchDayId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("games");
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
  const [swapped, setSwapped] = useState(false);

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
      } catch {}
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
  const isMember = !!userRole;
  const isEditingAllowed = matchData?.date ? canEditGame(matchData.date) : false;
  const isTeamPlayer = Boolean(
    user?.id && matchData?.game_players?.some((gp) => (gp.players as any)?.user_id === user.id)
  );
  const canEdit = isMember || isTeamPlayer;
  const isMatchToday = matchData?.date
    ? new Date(matchData.date).toDateString() === new Date().toDateString()
    : false;

  // ── Redirect if not authorized ──────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && matchData && (!isEditingAllowed || !canEdit || !isMatchToday)) {
      navigate(`/game/${matchDayId}`, { replace: true });
    }
  }, [isLoading, matchData, isEditingAllowed, canEdit, isMatchToday, matchDayId, navigate]);

  // ── Initialize current set from match data + restore persisted score ────────

  useEffect(() => {
    if (!matchData || isTrackingRef.current) return;

    const sorted = [...matchData.matches].sort((a, b) => a.game_number - b.game_number);
    const firstUnplayed = sorted.find(
      (m) => m.team_a_score === 0 && m.team_b_score === 0
    );

    let setNum: number;
    if (firstUnplayed) {
      setNum = firstUnplayed.game_number;
      setAllSetsComplete(false);
    } else if (sorted.length > 0) {
      const maxSetNumber = Math.max(...sorted.map((m) => m.game_number));
      if (maxSetNumber >= MAX_SETS) {
        setAllSetsComplete(true);
        setNum = maxSetNumber;
        setCurrentSetNumber(maxSetNumber);
        return;
      } else {
        setNum = maxSetNumber + 1;
        setAllSetsComplete(false);
      }
    } else {
      setNum = 1;
    }

    setCurrentSetNumber(setNum);

    if (matchDayId) {
      const persisted = loadPersistedScore(matchDayId);
      if (persisted && persisted.currentSetNumber === setNum && (persisted.teamAPoints > 0 || persisted.teamBPoints > 0)) {
        setTeamAPoints(persisted.teamAPoints);
        setTeamBPoints(persisted.teamBPoints);
        setUndoStack(persisted.undoStack);
        isTrackingRef.current = true;
      }
    }
  }, [matchData, matchDayId]);

  // ── Persist score on every change ───────────────────────────────────────────

  useEffect(() => {
    if (!matchDayId || !isTrackingRef.current) return;
    persistScore(matchDayId, { teamAPoints, teamBPoints, undoStack, currentSetNumber });
  }, [teamAPoints, teamBPoints, undoStack, currentSetNumber, matchDayId]);

  // ── Completed sets ──────────────────────────────────────────────────────────

  const completedSets = (matchData?.matches ?? [])
    .filter((m) => m.team_a_score > 0 || m.team_b_score > 0)
    .sort((a, b) => a.game_number - b.game_number);

  // ── Set point / auto-finish logic ──────────────────────────────────────────

  const setTarget = currentSetNumber >= 5 ? 15 : 25;

  const isSetWon = (scoreA: number, scoreB: number): boolean => {
    const target = currentSetNumber >= 5 ? 15 : 25;
    if (scoreA >= target && scoreA - scoreB >= 2) return true;
    if (scoreB >= target && scoreB - scoreA >= 2) return true;
    return false;
  };

  const teamAHasSetPoint =
    teamAPoints >= setTarget - 1 && teamAPoints > teamBPoints && !isSetWon(teamAPoints, teamBPoints);
  const teamBHasSetPoint =
    teamBPoints >= setTarget - 1 && teamBPoints > teamAPoints && !isSetWon(teamAPoints, teamBPoints);

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
        title: t("liveScore.setSavedTitle", { setNumber: currentSetNumber }),
        description: t("liveScore.setSavedDescription", { scoreA: teamAPoints, scoreB: teamBPoints }),
        duration: 1500,
      });

      setTeamAPoints(0);
      setTeamBPoints(0);
      setUndoStack([]);
      setShowEndSetConfirm(false);
      isTrackingRef.current = false;

      if (matchDayId) clearPersistedScore(matchDayId);

      const nextSet = currentSetNumber + 1;
      if (nextSet > MAX_SETS) {
        setAllSetsComplete(true);
      } else {
        setCurrentSetNumber(nextSet);
      }
    } catch (error) {
      console.error("Error saving set:", error);
      toast({
        title: t("liveScore.failedToSaveSet"),
        description: t("liveScore.pleaseTryAgain"),
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

  // ── Swap helper — which team displays on which side ─────────────────────────

  const leftTeam = swapped ? "b" : "a";
  const rightTeam = swapped ? "a" : "b";
  const leftPoints = swapped ? teamBPoints : teamAPoints;
  const rightPoints = swapped ? teamAPoints : teamBPoints;
  const leftLabel = swapped ? t("liveScore.teamB") : t("liveScore.teamA");
  const rightLabel = swapped ? t("liveScore.teamA") : t("liveScore.teamB");
  const leftHasSetPoint = swapped ? teamBHasSetPoint : teamAHasSetPoint;
  const rightHasSetPoint = swapped ? teamAHasSetPoint : teamBHasSetPoint;
  const leftWon = isSetWon(teamAPoints, teamBPoints) && (swapped ? teamBPoints > teamAPoints : teamAPoints > teamBPoints);
  const rightWon = isSetWon(teamAPoints, teamBPoints) && (swapped ? teamAPoints > teamBPoints : teamBPoints > teamAPoints);

  const handleTapLeft = swapped ? handleTapB : handleTapA;
  const handleTapRight = swapped ? handleTapA : handleTapB;

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
        {t("liveScore.gameNotFound")}
      </div>
    );
  }

  // ── Confirmation content ────────────────────────────────────────────────────

  const endSetContent = (
    <>
      <div className="text-center py-4">
        <p className="text-lg font-semibold mb-2">{t("liveScore.saveSetTitle", { setNumber: currentSetNumber })}</p>
        <p className="text-4xl font-bold">
          <span className="text-red-500">{teamAPoints}</span>
          <span className="mx-2 text-muted-foreground">-</span>
          <span className="text-emerald-500">{teamBPoints}</span>
        </p>
        {teamAPoints === 0 && teamBPoints === 0 && (
          <p className="text-sm text-amber-500 mt-2">{t("liveScore.bothScoresZero")}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setShowEndSetConfirm(false)}
        >
          {t("liveScore.cancel")}
        </Button>
        <Button
          className="flex-1"
          onClick={handleEndSet}
          disabled={isSaving}
        >
          {isSaving ? t("liveScore.saving") : t("liveScore.saveSet")}
        </Button>
      </div>
    </>
  );

  const exitContent = (
    <>
      <div className="text-center py-4">
        <p className="text-lg font-semibold mb-2">{t("liveScore.unsavedSetInProgress")}</p>
        <p className="text-muted-foreground">
          {t("liveScore.setWillBeLost", { setNumber: currentSetNumber, scoreA: teamAPoints, scoreB: teamBPoints })}
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setShowExitConfirm(false)}
        >
          {t("liveScore.keepScoring")}
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={confirmExit}
        >
          {t("liveScore.discardAndExit")}
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
        <h1 className="text-base font-semibold">{t("liveScore.setHeader", { setNumber: currentSetNumber })}</h1>
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

      {/* Main scoring area: left tap + scores + right tap */}
      <div className="flex-1 flex min-h-0">
        {allSetsComplete ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-muted-foreground font-medium">
              {t("liveScore.allSetsComplete")}
            </p>
          </div>
        ) : (
          <>
            {/* Left tap target */}
            <button
              onClick={handleTapLeft}
              className={`w-[22%] flex flex-col items-center justify-center transition-transform active:scale-[0.97] ${
                leftHasSetPoint
                  ? "bg-red-200 dark:bg-red-900 ring-2 ring-red-400 ring-inset animate-pulse"
                  : leftTeam === "a"
                    ? "bg-red-50 dark:bg-red-950/50"
                    : "bg-emerald-50 dark:bg-emerald-950/50"
              }`}
            >
              <span className={`text-lg font-bold ${leftTeam === "a" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                +1
              </span>
              {leftHasSetPoint && (
                <span className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${leftTeam === "a" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {t("liveScore.setPoint")}
                </span>
              )}
            </button>

            {/* Center score display */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex items-baseline gap-3">
                <div className="text-center">
                  <span className={`text-9xl sm:text-[11rem] font-black tabular-nums leading-none ${leftTeam === "a" ? "text-red-500" : "text-emerald-500"}`}>
                    {leftPoints}
                  </span>
                  <p className={`text-xs font-medium mt-1 ${leftTeam === "a" ? "text-red-400" : "text-emerald-400"}`}>
                    {leftLabel}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1 pb-5">
                  <span className="text-3xl text-muted-foreground/40 font-light">:</span>
                  <button
                    onClick={() => setSwapped((s) => !s)}
                    className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                    title={t("liveScore.swapSides")}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-center">
                  <span className={`text-9xl sm:text-[11rem] font-black tabular-nums leading-none ${rightTeam === "b" ? "text-emerald-500" : "text-red-500"}`}>
                    {rightPoints}
                  </span>
                  <p className={`text-xs font-medium mt-1 ${rightTeam === "b" ? "text-emerald-400" : "text-red-400"}`}>
                    {rightLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Right tap target */}
            <button
              onClick={handleTapRight}
              className={`w-[22%] flex flex-col items-center justify-center transition-transform active:scale-[0.97] ${
                rightHasSetPoint
                  ? "bg-emerald-200 dark:bg-emerald-900 ring-2 ring-emerald-400 ring-inset animate-pulse"
                  : rightTeam === "b"
                    ? "bg-emerald-50 dark:bg-emerald-950/50"
                    : "bg-red-50 dark:bg-red-950/50"
              }`}
            >
              <span className={`text-lg font-bold ${rightTeam === "b" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                +1
              </span>
              {rightHasSetPoint && (
                <span className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${rightTeam === "b" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {t("liveScore.setPoint")}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
        <Button
          className="w-full h-11 text-base font-semibold"
          onClick={() => setShowEndSetConfirm(true)}
          disabled={allSetsComplete}
        >
          {t("liveScore.endSet")}
        </Button>
      </div>

      {/* End Set confirmation — always Dialog (Drawer breaks in rotated container) */}
      <Dialog open={showEndSetConfirm} onOpenChange={setShowEndSetConfirm}>
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>{t("liveScore.endSetDialogTitle")}</DialogTitle>
            <DialogDescription>{t("liveScore.endSetDialogDescription")}</DialogDescription>
          </DialogHeader>
          {endSetContent}
        </DialogContent>
      </Dialog>

      {/* Exit confirmation */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>{t("liveScore.exitDialogTitle")}</DialogTitle>
            <DialogDescription>{t("liveScore.exitDialogDescription")}</DialogDescription>
          </DialogHeader>
          {exitContent}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveScore;

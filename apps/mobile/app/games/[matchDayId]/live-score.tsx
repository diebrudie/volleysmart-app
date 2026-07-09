/**
 * Live Score screen (native parity for apps/web/src/pages/LiveScore.tsx).
 *
 * Deliberately DIFFERENT from web in three ways the plan calls out:
 *   - NO landscape lock. Portrait with two large tap zones (LiveScoreBoard).
 *   - Wake lock is `useKeepAwake()` (expo-keep-awake), used ONLY on this screen.
 *   - Score persistence uses AsyncStorage (async) instead of localStorage, so
 *     the screen shows a Spinner until the restore resolves. Every tap/undo is
 *     flushed to storage (a crash between points loses at most the last tap);
 *     the key is cleared when the set is written.
 *
 * MODAL-NESTING RULE (CLAUDE.md + plan): AT MOST ONE Dialog open at a time via a
 * single discriminated `confirm` state (exit OR end-set, never both), so the RN
 * Modal is never stacked and stays clickable — same pattern as the Game detail
 * screen.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Vibration } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { LiveScoreBoard } from "@/components/games/LiveScoreBoard";
import { useGame } from "@/hooks/useGame";
import { useGameMutations } from "@/hooks/useGameMutations";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { palette, radii, spacing, typography } from "@/constants/theme";
import { type MatchSet } from "@volleysmart/core";

const MAX_SETS = 9;
const STORAGE_KEY_PREFIX = "vs-live-score-";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Side = "a" | "b";

type PersistedScore = {
  teamAPoints: number;
  teamBPoints: number;
  undoStack: Side[];
  currentSetNumber: number;
  timestamp: number;
};

type Confirm = { type: "exit" } | { type: "endSet" } | null;

function storageKey(matchDayId: string): string {
  return `${STORAGE_KEY_PREFIX}${matchDayId}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** First unplayed (0-0) set, or null when every existing set is scored. */
function firstUnplayedSet(matches: MatchSet[]): MatchSet | null {
  return (
    [...matches]
      .sort((a, b) => a.game_number - b.game_number)
      .find((m) => m.team_a_score === 0 && m.team_b_score === 0) ?? null
  );
}

export default function LiveScoreScreen() {
  const { matchDayId } = useLocalSearchParams<{ matchDayId: string }>();
  const id = String(matchDayId ?? "");
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation("games");
  const { user } = useAuth();

  // Keep the screen awake while scoring (this screen only). expo-keep-awake.
  useKeepAwake();

  const game = useGame(id);
  const bundle = game.bundle;
  const mutations = useGameMutations(id, {
    clubId: bundle?.club_id,
    eventId: bundle?.planned_event_id,
  });

  // ── Scoring state ──────────────────────────────────────────────────────────
  const [teamAPoints, setTeamAPoints] = useState(0);
  const [teamBPoints, setTeamBPoints] = useState(0);
  const [undoStack, setUndoStack] = useState<Side[]>([]);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [allComplete, setAllComplete] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  /** Async restore has settled — until then we render a Spinner. */
  const [restored, setRestored] = useState(false);
  /** Only persist once the user has actually started tapping (web parity). */
  const trackingRef = useRef(false);
  /** One-shot guards so init/auto-prompt don't re-fire on every render. */
  const initRef = useRef(false);
  const wonPromptRef = useRef(false);

  // ── Init current set from the bundle, then async-restore persisted score ────
  useEffect(() => {
    if (!bundle || initRef.current) return;
    initRef.current = true;

    const unplayed = firstUnplayedSet(bundle.matches);
    let setNum: number;
    let matchId: string | null;
    if (unplayed) {
      setNum = unplayed.game_number;
      matchId = unplayed.id;
      setAllComplete(false);
    } else if (bundle.matches.length > 0) {
      // Every existing set is scored — nothing left to write to here.
      setNum = Math.max(...bundle.matches.map((m) => m.game_number));
      matchId = null;
      setAllComplete(true);
    } else {
      setNum = 1;
      matchId = null;
    }
    setCurrentSetNumber(setNum);
    setCurrentMatchId(matchId);

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(id));
        if (raw) {
          const p = JSON.parse(raw) as PersistedScore;
          const age = Date.now() - p.timestamp;
          if (age > MAX_AGE_MS) {
            await AsyncStorage.removeItem(storageKey(id));
          } else if (
            p.currentSetNumber === setNum &&
            (p.teamAPoints > 0 || p.teamBPoints > 0)
          ) {
            setTeamAPoints(p.teamAPoints);
            setTeamBPoints(p.teamBPoints);
            setUndoStack(Array.isArray(p.undoStack) ? p.undoStack : []);
            trackingRef.current = true;
          }
        }
      } catch {
        // Corrupt/unavailable storage — start fresh.
      } finally {
        setRestored(true);
      }
    })();
  }, [bundle, id]);

  // ── Flush to storage on every tap/undo (crash loses at most the last tap) ───
  useEffect(() => {
    if (!restored || !trackingRef.current) return;
    const payload: PersistedScore = {
      teamAPoints,
      teamBPoints,
      undoStack,
      currentSetNumber,
      timestamp: Date.now(),
    };
    AsyncStorage.setItem(storageKey(id), JSON.stringify(payload)).catch(() => {});
  }, [teamAPoints, teamBPoints, undoStack, currentSetNumber, restored, id]);

  // ── Set-point / win-by-2 logic (web parity) ────────────────────────────────
  const setTarget = currentSetNumber >= 5 ? 15 : 25;

  const isSetWon = (a: number, b: number): boolean => {
    if (a >= setTarget && a - b >= 2) return true;
    if (b >= setTarget && b - a >= 2) return true;
    return false;
  };

  const won = isSetWon(teamAPoints, teamBPoints);
  const teamAHasSetPoint =
    teamAPoints >= setTarget - 1 && teamAPoints > teamBPoints && !won;
  const teamBHasSetPoint =
    teamBPoints >= setTarget - 1 && teamBPoints > teamAPoints && !won;

  // Auto-prompt End Set once when the set becomes won (win-by-2). Reset when the
  // score drops back below a win (e.g. via undo) so it can prompt again later.
  useEffect(() => {
    if (allComplete) return;
    if (won && !wonPromptRef.current) {
      wonPromptRef.current = true;
      setConfirm((c) => c ?? { type: "endSet" });
    } else if (!won) {
      wonPromptRef.current = false;
    }
  }, [won, allComplete]);

  // ── Tap / undo handlers ────────────────────────────────────────────────────
  const tap = useCallback(
    (side: Side) => {
      if (allComplete) return;
      trackingRef.current = true;
      if (side === "a") setTeamAPoints((p) => p + 1);
      else setTeamBPoints((p) => p + 1);
      setUndoStack((s) => [...s, side]);
      try {
        Vibration.vibrate(10);
      } catch {
        // Vibration unsupported (e.g. web) — ignore.
      }
    },
    [allComplete]
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last === "a") setTeamAPoints((p) => Math.max(0, p - 1));
      else setTeamBPoints((p) => Math.max(0, p - 1));
      return prev.slice(0, -1);
    });
  }, []);

  // ── End set — write the matches row, clear persistence, advance/return ──────
  const handleEndSet = async () => {
    if (!currentMatchId || !bundle) return;
    try {
      await mutations.setScore.mutateAsync({
        matchId: currentMatchId,
        teamAScore: teamAPoints,
        teamBScore: teamBPoints,
      });
      await AsyncStorage.removeItem(storageKey(id)).catch(() => {});

      toast(
        t("liveScore.setSaved", {
          defaultValue: "Set {{setNumber}} saved · {{scoreA}}-{{scoreB}}",
          setNumber: currentSetNumber,
          scoreA: teamAPoints,
          scoreB: teamBPoints,
        }),
        "success"
      );

      // Advance to the next still-unplayed set (the just-saved one still reads
      // 0-0 in the local bundle until refetch, so exclude it by number).
      const next = [...bundle.matches]
        .sort((a, b) => a.game_number - b.game_number)
        .find(
          (m) =>
            m.game_number > currentSetNumber &&
            m.team_a_score === 0 &&
            m.team_b_score === 0
        );

      setTeamAPoints(0);
      setTeamBPoints(0);
      setUndoStack([]);
      trackingRef.current = false;
      wonPromptRef.current = false;
      setConfirm(null);

      if (next) {
        setCurrentSetNumber(next.game_number);
        setCurrentMatchId(next.id);
      } else {
        // Nothing left to score here — back to the game detail.
        router.replace(`/games/${id}` as never);
      }
    } catch {
      toast(t("liveScore.saveFailed", { defaultValue: "Couldn't save the set" }), "error");
    }
  };

  // ── Exit (confirm only when there are unsaved points) ───────────────────────
  const handleExit = () => {
    if (teamAPoints > 0 || teamBPoints > 0) {
      setConfirm({ type: "exit" });
    } else {
      goToGame();
    }
  };

  const goToGame = () => {
    setConfirm(null);
    router.replace(`/games/${id}` as never);
  };

  // ── Swap: which team shows on which side (visual only, web parity) ──────────
  const leftTeam: Side = swapped ? "b" : "a";
  const rightTeam: Side = swapped ? "a" : "b";
  const leftPoints = swapped ? teamBPoints : teamAPoints;
  const rightPoints = swapped ? teamAPoints : teamBPoints;

  // ── Loading / not-found ────────────────────────────────────────────────────
  if (game.isLoading || (!!bundle && !restored)) {
    return (
      <>
        <ScreenHeader title={t("liveScore.title", { defaultValue: "Live Score" })} />
        <Spinner />
      </>
    );
  }

  if (game.error || !bundle) {
    return (
      <>
        <ScreenHeader title={t("liveScore.title", { defaultValue: "Live Score" })} />
        <Screen scroll={false} safeTop={false}>
          <View style={styles.center}>
            <EmptyState
              icon={
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={theme.mutedForeground}
                />
              }
              title={t("liveScore.gameNotFound", { defaultValue: "Game not found" })}
            />
          </View>
        </Screen>
      </>
    );
  }

  // Team labels come from the bundle (opponent mode = club vs named opponent).
  const isOpponent = bundle.is_opponent_mode;
  const teamALabel =
    isOpponent && bundle.clubs?.name
      ? bundle.clubs.name
      : t("game.teamA", { defaultValue: "Team A" });
  const teamBLabel = isOpponent
    ? bundle.opponent_team_name ||
      t("game.newGame.opponentTeam", { defaultValue: "Opponent Team" })
    : t("game.teamB", { defaultValue: "Team B" });

  const leftLabel = leftTeam === "a" ? teamALabel : teamBLabel;
  const rightLabel = rightTeam === "a" ? teamALabel : teamBLabel;
  const leftHasSetPoint = leftTeam === "a" ? teamAHasSetPoint : teamBHasSetPoint;
  const rightHasSetPoint = rightTeam === "a" ? teamAHasSetPoint : teamBHasSetPoint;
  const leftWon = won && leftPoints > rightPoints;
  const rightWon = won && rightPoints > leftPoints;

  // Completed sets (0-0 excluded — unplayed, not a tie).
  const completedSets = [...bundle.matches]
    .filter((m) => m.team_a_score > 0 || m.team_b_score > 0)
    .sort((a, b) => a.game_number - b.game_number);

  // Single-Dialog props (never two modals — modal-nesting rule).
  const dialogProps =
    confirm?.type === "exit"
      ? {
          title: t("liveScore.exitTitle", {
            defaultValue: "Discard the set in progress?",
          }),
          message: t("liveScore.exitMessage", {
            defaultValue:
              "Set {{setNumber}} ({{scoreA}}-{{scoreB}}) hasn't been saved and will be lost.",
            setNumber: currentSetNumber,
            scoreA: teamAPoints,
            scoreB: teamBPoints,
          }),
          confirmLabel: t("liveScore.discardAndExit", {
            defaultValue: "Discard & exit",
          }),
          cancelLabel: t("liveScore.keepScoring", { defaultValue: "Keep scoring" }),
          destructive: true,
          loading: false,
          onConfirm: goToGame,
        }
      : {
          title: t("liveScore.endSetTitle", {
            defaultValue: "Save set {{setNumber}}?",
            setNumber: currentSetNumber,
          }),
          message:
            teamAPoints === 0 && teamBPoints === 0
              ? t("liveScore.endSetZero", {
                  defaultValue:
                    "Both scores are 0. Saving a 0-0 set marks it unplayed.",
                })
              : t("liveScore.endSetMessage", {
                  defaultValue: "Final score {{scoreA}}-{{scoreB}}.",
                  scoreA: teamAPoints,
                  scoreB: teamBPoints,
                }),
          confirmLabel: t("liveScore.saveSet", { defaultValue: "Save set" }),
          cancelLabel: t("liveScore.cancel", { defaultValue: "Cancel" }),
          destructive: false,
          loading: mutations.setScore.isPending,
          onConfirm: handleEndSet,
        };

  return (
    <>
      <ScreenHeader
        title={t("liveScore.setHeader", {
          defaultValue: "Set {{setNumber}}",
          setNumber: currentSetNumber,
        })}
        onBack={handleExit}
        right={
          <Pressable
            onPress={handleUndo}
            disabled={undoStack.length === 0}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("liveScore.undo", { defaultValue: "Undo" })}
            style={({ pressed }) => [
              styles.undoButton,
              { borderColor: theme.border },
              undoStack.length === 0 && styles.undoDisabled,
              pressed && undoStack.length > 0 && { backgroundColor: theme.muted },
            ]}
          >
            <Ionicons name="arrow-undo" size={18} color={theme.text} />
          </Pressable>
        }
      />

      <View style={[styles.body, { backgroundColor: theme.background }]}>
        {/* Completed sets strip */}
        {completedSets.length > 0 ? (
          <View style={styles.chips}>
            {completedSets.map((s) => {
              const aWon = s.team_a_score > s.team_b_score;
              const accent = aWon ? palette.red500 : palette.green400;
              return (
                <View
                  key={s.id}
                  style={[styles.chip, { backgroundColor: accent + "1A" }]}
                >
                  <Text style={[styles.chipText, { color: accent }]}>
                    {s.game_number}: {s.team_a_score}-{s.team_b_score}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Scoring board */}
        <LiveScoreBoard
          leftLabel={leftLabel}
          rightLabel={rightLabel}
          leftPoints={leftPoints}
          rightPoints={rightPoints}
          leftTeam={leftTeam}
          rightTeam={rightTeam}
          leftHasSetPoint={leftHasSetPoint}
          rightHasSetPoint={rightHasSetPoint}
          leftWon={leftWon}
          rightWon={rightWon}
          onTapLeft={() => tap(leftTeam)}
          onTapRight={() => tap(rightTeam)}
          onSwap={() => setSwapped((s) => !s)}
          disabled={allComplete}
        />

        {/* End set */}
        <View style={styles.footer}>
          <Button
            title={t("liveScore.endSet", { defaultValue: "End set" })}
            onPress={() => setConfirm({ type: "endSet" })}
            disabled={allComplete || !currentMatchId}
          />
        </View>
      </View>

      {/* Single confirm Dialog — only ever one modal open (modal-nesting rule). */}
      <Dialog
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={dialogProps.title}
        message={dialogProps.message}
        confirmLabel={dialogProps.confirmLabel}
        cancelLabel={dialogProps.cancelLabel}
        destructive={dialogProps.destructive}
        loading={dialogProps.loading}
        onConfirm={dialogProps.onConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  chipText: {
    ...typography.caption,
    fontWeight: "700",
  },
  footer: {
    paddingTop: spacing.xs,
  },
  undoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  undoDisabled: {
    opacity: 0.3,
  },
});

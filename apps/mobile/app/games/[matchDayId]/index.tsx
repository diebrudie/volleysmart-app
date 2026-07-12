/**
 * Game detail screen (native parity for apps/web/src/pages/Game.tsx).
 *
 * Shows the score overview, both team rosters, the 5 base sets + any extras,
 * and — for club admins/editors only — inline score editing, add/delete extra
 * set, "create new game with same teams", delete game, and entry buttons to
 * Live Score and Edit Game.
 *
 * MODAL-NESTING RULE (CLAUDE.md + plan): the screen renders AT MOST ONE confirm
 * Dialog at a time via a single `confirm` state (delete-set OR delete-game,
 * never both). The screen body is not itself a Modal, so a confirm Dialog is
 * always the only open RN Modal and stays clickable. Score editing is inline
 * (SetBox), never a modal, so it likewise cannot stack.
 */
import { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreOverview } from "@/components/games/ScoreOverview";
import { TeamColumn } from "@/components/games/TeamColumn";
import { SetBox } from "@/components/games/SetBox";
import { AddSetBox } from "@/components/games/AddSetBox";
import { EditLocationSheet } from "@/components/games/EditLocationSheet";
import { useGame } from "@/hooks/useGame";
import { useGameMutations } from "@/hooks/useGameMutations";
import { useTheme } from "@/hooks/useTheme";
import { palette, radii, spacing, typography } from "@/constants/theme";

const MAX_SETS = 9;

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Editable only within ~1 day of the game date (web canEditGame). */
function canEditGameDate(dateStr: string): boolean {
  const daysDiff =
    (Date.now() - parseLocalDate(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff < 1;
}

type Confirm =
  | { type: "deleteGame" }
  | { type: "deleteSet"; matchId: string; setNumber: number }
  | null;

export default function GameDetailScreen() {
  const { matchDayId } = useLocalSearchParams<{ matchDayId: string }>();
  const id = String(matchDayId ?? "");
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation("games");

  const game = useGame(id);
  const bundle = game.bundle;
  const mutations = useGameMutations(id, {
    clubId: bundle?.club_id,
    eventId: bundle?.planned_event_id,
  });

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editLocationOpen, setEditLocationOpen] = useState(false);
  // Defer the follow-up action until the menu Sheet fully dismisses — two
  // stacked RN Modals freeze iOS (see MenuDrawer pendingSubRef pattern). This
  // covers both the delete confirm Dialog and the Edit-Location Sheet.
  const pendingMenuActionRef = useRef<
    null | "editTeams" | "editLocation" | "sameTeams" | "delete"
  >(null);

  if (game.isLoading) {
    return (
      <>
        <ScreenHeader title={t("game.gameDetails", { defaultValue: "Game Details" })} />
        <Spinner />
      </>
    );
  }

  if (game.error || !bundle) {
    return (
      <>
        <ScreenHeader title={t("game.gameDetails", { defaultValue: "Game Details" })} />
        <Screen scroll={false} safeTop={false}>
          <View style={styles.center}>
            <EmptyState
              icon={
                <Ionicons name="alert-circle-outline" size={48} color={theme.mutedForeground} />
              }
              title={t("game.matchNotFound", { defaultValue: "Match not found" })}
              subtitle={t("game.matchNotFoundDescription", {
                defaultValue:
                  "The match you're looking for doesn't exist or you don't have access.",
              })}
            />
          </View>
        </Screen>
      </>
    );
  }

  const isOpponent = bundle.is_opponent_mode;
  const teamALabel =
    isOpponent && bundle.clubs?.name
      ? bundle.clubs.name
      : t("game.teamA", { defaultValue: "Team A" });
  const teamBLabel = isOpponent
    ? bundle.opponent_team_name ||
      t("game.newGame.opponentTeam", { defaultValue: "Opponent Team" })
    : t("game.teamB", { defaultValue: "Team B" });

  const teamAPlayers = bundle.game_players.filter((gp) => gp.team_name === "team_a");
  const teamBPlayers = bundle.game_players.filter((gp) => gp.team_name === "team_b");

  const matchDate = parseLocalDate(bundle.date);
  const isMatchToday = matchDate.toDateString() === new Date().toDateString();
  const isEditingAllowed = canEditGameDate(bundle.date);

  // Admin actions are HIDDEN entirely for non-admins (web parity).
  const canAdmin = game.isAdminOrEditor && game.roleReady;

  // Add-set gating mirrors web: set 5 scored, next number under MAX_SETS.
  const set5 = bundle.matches.find((m) => m.game_number === 5);
  const isSet5Scored = !!set5 && (set5.team_a_score > 0 || set5.team_b_score > 0);
  const currentMax = bundle.matches.length
    ? Math.max(...bundle.matches.map((m) => m.game_number))
    : 5;
  const nextSetNumber = Math.max(5, currentMax) + 1;
  const canAddAnotherSet =
    isEditingAllowed && isSet5Scored && nextSetNumber <= MAX_SETS;

  const title = isMatchToday
    ? t("game.todaysGame", { defaultValue: "Today's Game" })
    : t("game.gameDetails", { defaultValue: "Game Details" });

  const handleSameTeams = async () => {
    try {
      const md = await mutations.sameTeams.mutateAsync();
      toast(t("game.toastGameCreated", { defaultValue: "Game created" }), "success");
      router.push(`/games/${md.id}` as never);
    } catch {
      toast(t("game.toastError", { defaultValue: "Something went wrong" }), "error");
    }
  };

  const requestMenuAction = (
    action: "editTeams" | "editLocation" | "sameTeams" | "delete"
  ) => {
    pendingMenuActionRef.current = action;
    setMenuOpen(false);
  };
  const handleMenuClosed = () => {
    const action = pendingMenuActionRef.current;
    pendingMenuActionRef.current = null;
    if (action === "editTeams") router.push(`/games/${id}/edit` as never);
    else if (action === "editLocation") setEditLocationOpen(true);
    else if (action === "sameTeams") handleSameTeams();
    else if (action === "delete") setConfirm({ type: "deleteGame" });
  };

  const handleSelectLocation = (locationId: string) => {
    mutations.updateLocation.mutate(
      { locationId },
      {
        onSuccess: () =>
          toast(
            t("game.toastLocationUpdated", { defaultValue: "Location updated" }),
            "success"
          ),
        onError: () =>
          toast(t("game.toastError", { defaultValue: "Something went wrong" }), "error"),
      }
    );
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.type === "deleteSet") {
      mutations.removeSet.mutate(
        { matchId: confirm.matchId },
        {
          onError: () =>
            toast(t("game.toastError", { defaultValue: "Something went wrong" }), "error"),
        }
      );
      setConfirm(null);
      return;
    }
    // deleteGame
    try {
      await mutations.removeMatchDay.mutateAsync();
      setConfirm(null);
      toast(t("game.toastMatchDeleted", { defaultValue: "Game deleted" }), "success");
      if (bundle.planned_event_id) {
        router.replace(`/events/${bundle.planned_event_id}` as never);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)" as never);
      }
    } catch {
      toast(t("game.toastError", { defaultValue: "Something went wrong" }), "error");
    }
  };

  const dialogProps =
    confirm?.type === "deleteSet"
      ? {
          title: t("game.deleteSetConfirmTitle", { defaultValue: "Delete this set?" }),
          message: t("game.deleteSetConfirmDescription", {
            defaultValue: "This will permanently remove the extra set.",
          }),
        }
      : {
          title: t("game.deleteConfirmTitle", {
            defaultValue: "Are you sure you want to delete?",
          }),
          message: t("game.deleteConfirmDescription", {
            defaultValue:
              "This action cannot be undone. This will permanently delete the match and all associated data.",
          }),
        };

  return (
    <>
      <ScreenHeader
        title={title}
        {...(bundle.planned_event_id
          ? {
              // Back ALWAYS returns to the linked event (R6-8): the game screen
              // can be reached from several places, so router.back() loops.
              onBack: () =>
                router.replace(
                  `/events/${bundle.planned_event_id}` as never
                ),
            }
          : {})}
        right={
          canAdmin ? (
            <Pressable
              onPress={() => setMenuOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("game.moreActions", {
                defaultValue: "More actions",
              })}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={theme.text} />
            </Pressable>
          ) : undefined
        }
      />
      <Screen
        onRefresh={async () => void (await game.refetch())}
        safeTop={false}
        contentStyle={styles.content}
      >
        {/* Meta row */}
        <View style={styles.meta}>
          {bundle.clubs?.name ? (
            <View style={styles.metaItem}>
              <Ionicons name="trophy-outline" size={14} color={theme.mutedForeground} />
              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
                {bundle.clubs.name}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={theme.mutedForeground} />
            <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
              {matchDate.toLocaleDateString()}
            </Text>
          </View>
          {bundle.locations?.name ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={theme.mutedForeground} />
              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
                {bundle.locations.name}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={theme.mutedForeground} />
            <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
              {t("game.playerCount", {
                defaultValue: "{{count}} players",
                count: teamAPlayers.length + teamBPlayers.length,
              })}
            </Text>
          </View>
        </View>

        {/* Teams */}
        <View style={styles.teams}>
          <TeamColumn title={teamALabel} players={teamAPlayers} accent={palette.red500} />
          <TeamColumn
            title={teamBLabel}
            players={teamBPlayers}
            accent={palette.green400}
            {...(isOpponent ? { opponentPlaceholder: teamBLabel } : {})}
          />
        </View>

        {/* Score overview */}
        <View style={styles.block}>
          <ScoreOverview
            matches={bundle.matches}
            teamALabel={teamALabel}
            teamBLabel={teamBLabel}
          />
        </View>

        {/* Live Score entry (admin, today, in edit window) */}
        {canAdmin && isEditingAllowed && isMatchToday ? (
          <View style={styles.block}>
            <Button
              title={t("game.liveScoreTracker", { defaultValue: "Live Score Tracker" })}
              variant="secondary"
              onPress={() => router.push(`/games/${id}/live-score` as never)}
            />
          </View>
        ) : null}

        {/* Sets */}
        <View style={[styles.block, styles.sets]}>
          {bundle.matches.map((m, index) => (
            <SetBox
              key={m.id}
              setNumber={m.game_number}
              teamAScore={m.team_a_score}
              teamBScore={m.team_b_score}
              large={index === 0}
              editable={canAdmin && isEditingAllowed}
              onSave={(a, b) =>
                mutations.setScore.mutate(
                  { matchId: m.id, teamAScore: a, teamBScore: b },
                  {
                    onError: () =>
                      toast(
                        t("game.toastError", { defaultValue: "Something went wrong" }),
                        "error"
                      ),
                  }
                )
              }
              {...(canAdmin && isEditingAllowed && m.game_number > 5
                ? {
                    onDelete: () =>
                      setConfirm({
                        type: "deleteSet",
                        matchId: m.id,
                        setNumber: m.game_number,
                      }),
                  }
                : {})}
            />
          ))}
          {canAdmin && isEditingAllowed ? (
            <AddSetBox
              disabled={!canAddAnotherSet}
              onPress={() =>
                mutations.addExtraSet.mutate(
                  { gameNumber: nextSetNumber },
                  {
                    onError: () =>
                      toast(
                        t("game.toastError", { defaultValue: "Something went wrong" }),
                        "error"
                      ),
                  }
                )
              }
            />
          ) : null}
        </View>

        {/* All admin actions (Edit Teams, Edit Location, same-teams, delete)
            live in the top-right three-dots menu — no bottom button (R6-1). */}
      </Screen>

      {/* Three-dots action menu (admin) */}
      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onClosed={handleMenuClosed}
      >
        <View style={styles.menu}>
          {isEditingAllowed && !isOpponent ? (
            <Pressable
              onPress={() => requestMenuAction("editTeams")}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && { backgroundColor: theme.surface },
              ]}
            >
              <Ionicons name="people-outline" size={20} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>
                {t("game.editTeams", { defaultValue: "Edit Teams" })}
              </Text>
            </Pressable>
          ) : null}
          {bundle.club_id ? (
            <Pressable
              onPress={() => requestMenuAction("editLocation")}
              style={({ pressed }) => [
                styles.menuRow,
                pressed && { backgroundColor: theme.surface },
              ]}
            >
              <Ionicons name="location-outline" size={20} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>
                {t("game.editLocation", { defaultValue: "Edit Location" })}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => requestMenuAction("sameTeams")}
            style={({ pressed }) => [
              styles.menuRow,
              pressed && { backgroundColor: theme.surface },
            ]}
          >
            <Ionicons name="copy-outline" size={20} color={theme.text} />
            <Text style={[styles.menuText, { color: theme.text }]}>
              {t("game.createSameTeams", {
                defaultValue: "Create new game with same teams",
              })}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => requestMenuAction("delete")}
            style={({ pressed }) => [
              styles.menuRow,
              pressed && { backgroundColor: theme.surface },
            ]}
          >
            <Ionicons name="trash-outline" size={20} color={theme.destructive} />
            <Text style={[styles.menuText, { color: theme.destructive }]}>
              {t("game.deleteGame", { defaultValue: "Delete game" })}
            </Text>
          </Pressable>
        </View>
      </Sheet>

      {/* Edit Location — opened only after the menu Sheet fully dismisses. */}
      <EditLocationSheet
        visible={editLocationOpen}
        onClose={() => setEditLocationOpen(false)}
        clubId={bundle.club_id}
        currentLocationId={bundle.location_id}
        onSelect={handleSelectLocation}
      />

      {/* Single confirm Dialog — only ever one modal open (modal-nesting rule). */}
      <Dialog
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={dialogProps.title}
        message={dialogProps.message}
        destructive
        confirmLabel={t("game.delete", { defaultValue: "Delete" })}
        loading={mutations.removeMatchDay.isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingTop: spacing.lg },
  menu: { paddingBottom: spacing.sm },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  menuText: { ...typography.body, fontWeight: "500" },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...typography.bodySm,
  },
  teams: {
    flexDirection: "row",
    gap: spacing.md,
  },
  block: {
    marginTop: spacing.lg,
  },
  sets: {
    gap: spacing.md,
  },
});

/**
 * Edit Teams screen (native parity for apps/web/src/pages/EditGame.tsx).
 *
 * The web page uses @dnd-kit drag-and-drop, which has no React Native port
 * (game-layer plan edge case). This screen redesigns team editing as
 * TAP-TO-MOVE (see EditableTeams.tsx): tap a player to select, tap the other
 * team's "Move here" banner to move them; a selected player also reveals an
 * inline position Select and a Remove button.
 *
 * Scope vs. web: composition editing (move / add / remove / position) + save.
 * Date and location are left unchanged (updateGamePlayers only touches them
 * when opts.date/locationId are passed).
 *
 * Gating (mirrors web / the Game detail screen):
 *   - Club admins/editors only (isAdminOrEditor); others see a not-allowed state.
 *   - Disabled for opponent-mode games.
 *
 * Add player: existing club members are keyed by user_id (not players.id) in
 * the available mobile hooks, so member-add is deferred to a follow-up; guest
 * add is supported here via the shared core guest-resolution functions
 * (createOrReuseGuestByName + getLastPositionForPlayerInClub), which return a
 * real players.id — the same path web's PlayersEditModal uses.
 *
 * MODAL-NESTING RULE: at most one RN Modal is ever open. The teams area lives
 * in the plain screen body; a player's position Select opens a Sheet, the
 * "add guest" flow opens a Sheet, and the discard prompt is a Dialog — these
 * are mutually exclusive (opening one requires the others closed).
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  CANONICAL_ORDER,
  createOrReuseGuestByName,
  formatFirstLastInitial,
  formatShortName,
  getLastPositionForPlayerInClub,
  normalizeRole,
  type BundleGamePlayer,
  type GamePlayerAssignment,
  type MatchDayBundle,
} from "@volleysmart/core";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import {
  EditableTeams,
  type EditablePlayer,
  type EditableTeam,
} from "@/components/games/EditableTeams";
import { useGame } from "@/hooks/useGame";
import { useGameMutations } from "@/hooks/useGameMutations";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { palette, spacing, typography } from "@/constants/theme";

/** Guest fallback position when the guest has no prior position in this club. */
const GUEST_FALLBACK_POSITION = "Outside Hitter";

/** Prefer snapshot_name (guest / deleted fallback), then live player name. */
function displayName(gp: BundleGamePlayer, deletedLabel: string): string {
  const snap = gp.snapshot_name?.trim();
  if (snap) {
    const parts = snap.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return formatFirstLastInitial(parts[0], parts[parts.length - 1]);
    }
    return snap;
  }
  const p = gp.player;
  if (p?.first_name || p?.last_name) {
    return formatShortName(p.first_name ?? "", p.last_name ?? "");
  }
  return deletedLabel;
}

/** order_index first (nulls last), then canonical position order (web parity). */
function sortRoster(a: BundleGamePlayer, b: BundleGamePlayer): number {
  const ao = a.order_index;
  const bo = b.order_index;
  if (ao != null && bo != null) return ao - bo;
  if (ao != null) return -1;
  if (bo != null) return 1;
  return (
    CANONICAL_ORDER.indexOf(normalizeRole(a.position_played)) -
    CANONICAL_ORDER.indexOf(normalizeRole(b.position_played))
  );
}

/** Build the initial flat roster from a bundle (both teams, sorted). */
function buildInitial(
  bundle: MatchDayBundle,
  deletedLabel: string
): EditablePlayer[] {
  const forTeam = (team: EditableTeam): EditablePlayer[] =>
    bundle.game_players
      .filter((gp) => gp.team_name === team)
      .sort(sortRoster)
      .map((gp) => ({
        playerId: gp.player_id,
        name: displayName(gp, deletedLabel),
        position: gp.position_played,
        team,
      }));
  return [...forTeam("team_a"), ...forTeam("team_b")];
}

/** Stable serialization for dirty-state comparison (order matters). */
function serialize(players: EditablePlayer[]): string {
  return players
    .map((p) => `${p.team}:${p.playerId}:${p.position ?? ""}`)
    .join("|");
}

export default function EditTeamsScreen() {
  const { matchDayId } = useLocalSearchParams<{ matchDayId: string }>();
  const id = String(matchDayId ?? "");
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation("games");
  const { user } = useAuth();

  const game = useGame(id);
  const bundle = game.bundle;
  const mutations = useGameMutations(id, {
    clubId: bundle?.club_id,
    eventId: bundle?.planned_event_id,
  });

  const deletedLabel = t("game.deletedPlayer", { defaultValue: "Deleted P." });

  const [players, setPlayers] = useState<EditablePlayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestAdding, setGuestAdding] = useState(false);

  const seededForRef = useRef<string | null>(null);
  const initialKeyRef = useRef<string>("");

  // Seed local team state once the bundle arrives (per match day).
  useEffect(() => {
    if (!bundle) return;
    if (seededForRef.current === bundle.id) return;
    seededForRef.current = bundle.id;
    const built = buildInitial(bundle, deletedLabel);
    setPlayers(built);
    initialKeyRef.current = serialize(built);
  }, [bundle, deletedLabel]);

  const dirty = useMemo(
    () =>
      seededForRef.current !== null &&
      serialize(players) !== initialKeyRef.current,
    [players]
  );

  const teamA = players.filter((p) => p.team === "team_a");
  const teamB = players.filter((p) => p.team === "team_b");

  // ---- Tap-to-move handlers -------------------------------------------------

  const handleMove = (team: EditableTeam) => {
    if (!selectedId) return;
    setPlayers((prev) => {
      const target = prev.find((p) => p.playerId === selectedId);
      if (!target || target.team === team) return prev;
      const without = prev.filter((p) => p.playerId !== selectedId);
      return [...without, { ...target, team }];
    });
    setSelectedId(null);
  };

  const handleRemove = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
    if (selectedId === playerId) setSelectedId(null);
  };

  const handleChangePosition = (playerId: string, position: string | null) => {
    setPlayers((prev) =>
      prev.map((p) => (p.playerId === playerId ? { ...p, position } : p))
    );
  };

  // ---- Add guest ------------------------------------------------------------

  const handleAddGuest = async () => {
    const clubId = bundle?.club_id;
    if (!clubId) return;
    const firstName = guestName.trim().replace(/\s+/g, "") || "Guest";
    setGuestAdding(true);
    try {
      const guest = await createOrReuseGuestByName(clubId, firstName, "Player");
      if (players.some((p) => p.playerId === guest.id)) {
        toast(
          t("game.playerAlreadyAdded", { defaultValue: "Player already added" }),
          "info"
        );
        return;
      }
      let position: string | null = null;
      try {
        position = await getLastPositionForPlayerInClub(clubId, guest.id);
      } catch {
        position = null;
      }
      const target: EditableTeam =
        teamA.length <= teamB.length ? "team_a" : "team_b";
      setPlayers((prev) => [
        ...prev,
        {
          playerId: guest.id,
          name: formatShortName(guest.first_name ?? firstName, guest.last_name),
          position: position ?? GUEST_FALLBACK_POSITION,
          team: target,
        },
      ]);
      setGuestName("");
      setAddOpen(false);
      toast(t("game.guestAdded", { defaultValue: "Guest added" }), "success");
    } catch {
      toast(t("game.toastError", { defaultValue: "Something went wrong" }), "error");
    } finally {
      setGuestAdding(false);
    }
  };

  // ---- Save -----------------------------------------------------------------

  const handleSave = async () => {
    const assignments: GamePlayerAssignment[] = [
      ...teamA.map((p, i) => ({
        player_id: p.playerId,
        team_name: "team_a" as const,
        position_played: p.position,
        order_index: i,
      })),
      ...teamB.map((p, i) => ({
        player_id: p.playerId,
        team_name: "team_b" as const,
        position_played: p.position,
        order_index: i,
      })),
    ];
    try {
      await mutations.saveTeams.mutateAsync({
        assignments,
        opts: { adjustedBy: user?.id ?? null },
      });
      // Reset dirty so leaving the screen doesn't prompt discard.
      initialKeyRef.current = serialize(players);
      toast(t("game.teamsSaved", { defaultValue: "Teams saved" }), "success");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/games/${id}` as never);
      }
    } catch {
      toast(t("game.toastError", { defaultValue: "Something went wrong" }), "error");
    }
  };

  // ---- Discard-on-back ------------------------------------------------------

  const attemptBack = useCallback(() => {
    // Never open a second Modal: if a Sheet/Dialog is open, just close it
    // (respects the phase-3 modal-nesting rule for hardware back).
    if (addOpen) {
      setAddOpen(false);
      return true;
    }
    if (discardOpen) {
      setDiscardOpen(false);
      return true;
    }
    if (dirty) {
      setDiscardOpen(true);
      return true;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/games/${id}` as never);
    }
    return true;
  }, [addOpen, discardOpen, dirty, router, id]);

  // Intercept the Android hardware back button while focused.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        attemptBack
      );
      return () => sub.remove();
    }, [attemptBack])
  );

  const confirmDiscard = () => {
    setDiscardOpen(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/games/${id}` as never);
    }
  };

  // ---- Render states --------------------------------------------------------

  const headerTitle = t("game.editTeams", { defaultValue: "Edit Teams" });

  if (game.isLoading || (bundle && !game.roleReady)) {
    return (
      <>
        <ScreenHeader title={headerTitle} onBack={attemptBack} />
        <Spinner />
      </>
    );
  }

  if (game.error || !bundle) {
    return (
      <>
        <ScreenHeader title={headerTitle} onBack={attemptBack} />
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

  // Not allowed: non-admin/editor, or opponent-mode game (no team editing).
  if (!game.isAdminOrEditor || bundle.is_opponent_mode) {
    return (
      <>
        <ScreenHeader title={headerTitle} onBack={attemptBack} />
        <Screen scroll={false} safeTop={false}>
          <View style={styles.center}>
            <EmptyState
              icon={
                <Ionicons name="lock-closed-outline" size={48} color={theme.mutedForeground} />
              }
              title={t("game.editNotAllowedTitle", {
                defaultValue: "Editing not available",
              })}
              subtitle={
                bundle.is_opponent_mode
                  ? t("game.editOpponentNotAllowed", {
                      defaultValue: "Team editing isn't available for opponent games.",
                    })
                  : t("game.editNotAllowedSubtitle", {
                      defaultValue: "Only club admins and editors can edit teams.",
                    })
              }
            />
            <Button
              title={t("game.back", { defaultValue: "Back" })}
              variant="outline"
              onPress={attemptBack}
              style={styles.notAllowedButton}
            />
          </View>
        </Screen>
      </>
    );
  }

  const teamALabel = t("game.teamA", { defaultValue: "Team A" });
  const teamBLabel = t("game.teamB", { defaultValue: "Team B" });
  const canAddGuest = !!bundle.club_id;

  return (
    <>
      <ScreenHeader title={headerTitle} onBack={attemptBack} />
      <Screen safeTop={false}>
        <Text style={[styles.hint, { color: theme.mutedForeground }]}>
          {t("game.editTeamsHint", {
            defaultValue:
              "Tap a player, then tap the other team to move them. Tap again to change position or remove.",
          })}
        </Text>

        <EditableTeams
          teamA={teamA}
          teamB={teamB}
          teamALabel={teamALabel}
          teamBLabel={teamBLabel}
          accentA={palette.red500}
          accentB={palette.green400}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={handleMove}
          onRemove={handleRemove}
          onChangePosition={handleChangePosition}
        />

        {canAddGuest ? (
          <View style={styles.addBlock}>
            <Button
              title={t("game.addGuest", { defaultValue: "Add guest" })}
              variant="outline"
              onPress={() => {
                setGuestName("");
                setAddOpen(true);
              }}
            />
          </View>
        ) : null}

        <View style={styles.saveBlock}>
          <Button
            title={t("game.save", { defaultValue: "Save" })}
            onPress={handleSave}
            loading={mutations.saveTeams.isPending}
            disabled={!dirty || players.length === 0}
          />
        </View>
      </Screen>

      {/* Add-guest Sheet — the only Modal open while it's visible. */}
      <Sheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("game.addGuest", { defaultValue: "Add guest" })}
        keyboardAware
        footer={
          <Button
            title={t("game.addGuest", { defaultValue: "Add guest" })}
            onPress={handleAddGuest}
            loading={guestAdding}
            disabled={guestName.trim().length === 0}
          />
        }
      >
        <Text style={[styles.sheetHelp, { color: theme.mutedForeground }]}>
          {t("game.addGuestHelp", {
            defaultValue:
              "Guests are temporary players. Enter a first name; they'll be added to the smaller team.",
          })}
        </Text>
        <Input
          label={t("game.guestName", { defaultValue: "Guest name" })}
          value={guestName}
          onChangeText={setGuestName}
          placeholder={t("game.guestNamePlaceholder", { defaultValue: "First name" })}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => {
            if (guestName.trim().length > 0 && !guestAdding) handleAddGuest();
          }}
        />
      </Sheet>

      {/* Discard-changes Dialog — only opened when the Sheet is closed. */}
      <Dialog
        visible={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={t("game.discardTitle", { defaultValue: "Discard changes?" })}
        message={t("game.discardMessage", {
          defaultValue: "You have unsaved team changes. Leave without saving?",
        })}
        destructive
        confirmLabel={t("game.discard", { defaultValue: "Discard" })}
        cancelLabel={t("game.keepEditing", { defaultValue: "Keep editing" })}
        onConfirm={confirmDiscard}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: {
    ...typography.bodySm,
    marginBottom: spacing.lg,
  },
  addBlock: {
    marginTop: spacing.lg,
  },
  saveBlock: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  sheetHelp: {
    ...typography.bodySm,
    marginBottom: spacing.md,
  },
  notAllowedButton: {
    marginTop: spacing.lg,
    alignSelf: "center",
    minWidth: 160,
  },
});

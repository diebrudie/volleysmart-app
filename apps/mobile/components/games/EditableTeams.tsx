/**
 * Editable two-team roster for the Edit Teams screen (tap-to-move variant).
 *
 * This is the EDITABLE sibling of the read-only TeamColumn.tsx — kept separate
 * so the game-detail display stays untouched.
 *
 * Interaction (no drag-and-drop; @dnd-kit has no RN port — see the game-layer
 * plan edge case):
 *   1. Tap a player row to SELECT it (row highlights).
 *   2. A "Move here" banner appears at the top of the OTHER team's column —
 *      tap it to move the selected player to that team (appended last).
 *   3. While selected, the row reveals an inline position Select and a Remove
 *      button.
 *
 * All state lives in the parent screen; this component is controlled.
 *
 * MODAL note: the inline position Select opens its own Sheet (one RN Modal).
 * This component is rendered directly in the screen body (never inside a Sheet
 * or Dialog), so that Select is always the only open Modal — the phase-3
 * modal-nesting rule is respected as long as the parent keeps its add-player
 * Sheet / discard Dialog closed while the teams are interactive.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CANONICAL_ORDER } from "@volleysmart/core";
import { Select, type SelectOption } from "@/components/ui/Select";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, typography } from "@/constants/theme";

export type EditableTeam = "team_a" | "team_b";

export type EditablePlayer = {
  /** players.id */
  playerId: string;
  /** Pre-formatted display name (guest / deleted fallbacks resolved upstream). */
  name: string;
  /** Raw position_played; null = "No Position". */
  position: string | null;
  team: EditableTeam;
};

/** Sentinel Select value representing "No Position" (maps to null upstream). */
const NO_POSITION = "__none__";

type Props = {
  teamA: EditablePlayer[];
  teamB: EditablePlayer[];
  teamALabel: string;
  teamBLabel: string;
  accentA: string;
  accentB: string;
  selectedId: string | null;
  onSelect: (playerId: string | null) => void;
  /** Move the currently selected player to `team`. */
  onMove: (team: EditableTeam) => void;
  onRemove: (playerId: string) => void;
  /** `position` is null for "No Position", else a raw position string. */
  onChangePosition: (playerId: string, position: string | null) => void;
};

/** "Outside Hitter" → "O. Hitter" (matches read-only TeamColumn). */
function shorten(label: string): string {
  const parts = label.split(" ");
  if (parts.length === 2 && parts[0].length > 0) {
    return `${parts[0][0]}. ${parts[1]}`;
  }
  return label;
}

export function EditableTeams({
  teamA,
  teamB,
  teamALabel,
  teamBLabel,
  accentA,
  accentB,
  selectedId,
  onSelect,
  onMove,
  onRemove,
  onChangePosition,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation("games");
  const { t: tProfile } = useTranslation("profile");

  const noPositionLabel = t("game.noPosition", { defaultValue: "No Position" });

  const posLabel = (pos: string) =>
    tProfile(`positions.name.${pos}`, { defaultValue: pos });

  /** Options for a player's position Select, including the current value. */
  const optionsFor = (position: string | null): SelectOption<string>[] => {
    const opts: SelectOption<string>[] = [
      { value: NO_POSITION, label: noPositionLabel },
      ...CANONICAL_ORDER.map((p) => ({ value: p, label: posLabel(p) })),
    ];
    // Preserve a non-canonical stored position so it still displays.
    if (position && !opts.some((o) => o.value === position)) {
      opts.push({ value: position, label: posLabel(position) });
    }
    return opts;
  };

  const renderColumn = (
    team: EditableTeam,
    players: EditablePlayer[],
    label: string,
    accent: string
  ) => {
    const selected = selectedId
      ? [...teamA, ...teamB].find((p) => p.playerId === selectedId) ?? null
      : null;
    const showMoveTarget = !!selected && selected.team !== team;

    return (
      <View
        style={[
          styles.column,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
        ]}
      >
        <View style={[styles.header, { backgroundColor: accent }]}>
          <Text style={styles.headerText} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <View style={styles.list}>
          {showMoveTarget ? (
            <Pressable
              onPress={() => onMove(team)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.moveTarget,
                {
                  borderColor: theme.primary,
                  backgroundColor: pressed ? theme.muted : theme.surface,
                },
              ]}
            >
              <Ionicons name="arrow-down-circle-outline" size={16} color={theme.primary} />
              <Text style={[styles.moveTargetText, { color: theme.primary }]} numberOfLines={2}>
                {t("game.moveHere", {
                  defaultValue: "Move {{name}} here",
                  name: selected?.name ?? "",
                })}
              </Text>
            </Pressable>
          ) : null}

          {players.length === 0 && !showMoveTarget ? (
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
              {t("game.noPlayers", { defaultValue: "No players" })}
            </Text>
          ) : null}

          {players.map((p, index) => {
            const isSelected = p.playerId === selectedId;
            const label2 =
              p.position && p.position.length > 0
                ? shorten(posLabel(p.position))
                : null;
            return (
              <View key={p.playerId}>
                <Pressable
                  onPress={() => onSelect(isSelected ? null : p.playerId)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.row,
                    isSelected && {
                      backgroundColor: theme.muted,
                      borderColor: theme.primary,
                    },
                    !isSelected &&
                      pressed && { backgroundColor: theme.surface },
                  ]}
                >
                  <Text style={[styles.index, { color: theme.text }]}>
                    {index + 1}.
                  </Text>
                  <View style={styles.nameWrap}>
                    <Text
                      style={[styles.name, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    {label2 ? (
                      <Text
                        style={[styles.position, { color: theme.mutedForeground }]}
                        numberOfLines={1}
                      >
                        {label2}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={isSelected ? theme.primary : theme.mutedForeground}
                  />
                </Pressable>

                {isSelected ? (
                  <View style={styles.editControls}>
                    <View style={styles.selectWrap}>
                      <Select
                        value={p.position ?? NO_POSITION}
                        onChange={(v) =>
                          onChangePosition(
                            p.playerId,
                            v === NO_POSITION ? null : v
                          )
                        }
                        options={optionsFor(p.position)}
                        sheetTitle={t("game.positionLabel", { defaultValue: "Position" })}
                      />
                    </View>
                    <Pressable
                      onPress={() => onRemove(p.playerId)}
                      accessibilityRole="button"
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.removeButton,
                        {
                          borderColor: theme.danger,
                          backgroundColor: pressed ? theme.muted : "transparent",
                        },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {renderColumn("team_a", teamA, teamALabel, accentA)}
      {renderColumn("team_b", teamB, teamBLabel, accentB)}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  column: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  headerText: {
    ...typography.label,
    color: "#fff",
    fontWeight: "700",
  },
  list: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  moveTarget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  moveTargetText: {
    ...typography.caption,
    fontWeight: "600",
    flexShrink: 1,
  },
  emptyText: {
    ...typography.caption,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  index: {
    ...typography.bodySm,
    fontWeight: "600",
  },
  nameWrap: {
    flex: 1,
  },
  name: {
    ...typography.bodySm,
    fontWeight: "600",
  },
  position: {
    ...typography.caption,
  },
  editControls: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  selectWrap: {
    flex: 1,
  },
  removeButton: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

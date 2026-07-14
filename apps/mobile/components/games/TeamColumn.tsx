/**
 * One team's roster column for the Game detail screen.
 *
 * Mirrors the web Game.tsx team list (apps/web/src/pages/Game.tsx :731-790):
 * a colored header (team name) over a numbered player list, sorted by
 * order_index then canonical position order. Guest / deleted players fall back
 * to `snapshot_name`. In opponent mode, team B renders a shield placeholder
 * instead of a roster.
 */
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  CANONICAL_ORDER,
  normalizeRole,
  formatShortName,
  formatFirstLastInitial,
  type BundleGamePlayer,
} from "@volleysmart/core";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  title: string;
  /** This team's roster rows (unsorted). Ignored when `opponentPlaceholder` set. */
  players: BundleGamePlayer[];
  /** Header background color (red for A, emerald for B). */
  accent: string;
  /** When provided, render a shield + this name instead of a roster (opponent mode). */
  opponentPlaceholder?: string;
};

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

export function TeamColumn({ title, players, accent, opponentPlaceholder }: Props) {
  const theme = useTheme();
  const { t } = useTranslation("games");
  const { t: tProfile } = useTranslation("profile");

  const noPosition = t("game.noPosition", { defaultValue: "No Position" });
  const deletedLabel = t("game.deletedPlayer", { defaultValue: "Deleted P." });

  const sorted = [...players].sort(sortRoster);

  return (
    <View style={[styles.column, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <Text style={styles.headerText} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {opponentPlaceholder !== undefined ? (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name="shield-outline"
            size={28}
            color={theme.mutedForeground}
          />
          <Text style={[styles.placeholderText, { color: theme.text }]} numberOfLines={2}>
            {opponentPlaceholder}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sorted.map((gp, index) => {
            const pos = gp.position_played;
            // Full position on its own line (no ellipsis) — the narrow
            // side-by-side columns can't fit name + position on one row.
            const posLabel =
              pos && pos !== noPosition
                ? tProfile(`positions.name.${pos}`, { defaultValue: pos })
                : null;
            return (
              <View key={`${gp.player_id}-${index}`} style={styles.row}>
                <Text style={[styles.index, { color: theme.mutedForeground }]}>
                  {index + 1}
                </Text>
                <View style={styles.playerInfo}>
                  <Text style={[styles.name, { color: theme.text }]}>
                    {displayName(gp, deletedLabel)}
                  </Text>
                  {posLabel ? (
                    <Text style={[styles.position, { color: theme.mutedForeground }]}>
                      {posLabel}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  index: {
    ...typography.bodySm,
    fontWeight: "600",
    minWidth: 14,
  },
  playerInfo: {
    flex: 1,
  },
  name: {
    ...typography.bodySm,
    fontWeight: "600",
  },
  position: {
    ...typography.caption,
    marginTop: 1,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  placeholderText: {
    ...typography.bodySm,
    fontWeight: "600",
    textAlign: "center",
  },
});

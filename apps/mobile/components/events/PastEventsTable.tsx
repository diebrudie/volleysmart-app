import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
import { Badge } from "@/components/ui/Badge";
import { type PastEventRow } from "@volleysmart/core";

type Props = {
  events: PastEventRow[];
  /** Row tap → event detail (no game screen on mobile yet). */
  onRowPress: (eventId: string) => void;
};

/**
 * Compact past-events score table, mirroring the web PastEventsList
 * (UpcomingEvents.tsx): date + title | set score / cancelled badge | view.
 */
export function PastEventsTable({ events, onRowPress }: Props) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation("events");
  const locale = i18n.language || "en";

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr + "T00:00:00"));

  return (
    <View
      style={[
        styles.table,
        { backgroundColor: t.card, borderColor: t.cardBorder },
      ]}
    >
      {/* Header */}
      <View style={[styles.row, styles.headerRow, { borderColor: t.border }]}>
        <Text
          style={[styles.headerLabel, styles.colMain, { color: t.mutedForeground }]}
        >
          {tr("upcoming.tableDate", { defaultValue: "Date" })}
        </Text>
        <Text
          style={[
            styles.headerLabel,
            styles.colScore,
            styles.centerText,
            { color: t.mutedForeground },
          ]}
        >
          {tr("upcoming.tableScore", { defaultValue: "Score" })}
        </Text>
        <Text
          style={[
            styles.headerLabel,
            styles.colView,
            styles.rightText,
            { color: t.mutedForeground },
          ]}
        >
          {tr("upcoming.tableDetails", { defaultValue: "Details" })}
        </Text>
      </View>

      {events.map((e, idx) => (
        <Pressable
          key={e.id}
          onPress={() => onRowPress(e.id)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            idx < events.length - 1 && [
              styles.rowBorder,
              { borderColor: t.border },
            ],
            pressed && { backgroundColor: t.surface },
          ]}
        >
          {/* Date + title */}
          <View style={styles.colMain}>
            <Text style={[styles.dateText, { color: t.textSecondary }]}>
              {formatDate(e.date)}
            </Text>
            <Text
              style={[styles.titleText, { color: t.primary }]}
              numberOfLines={1}
            >
              {e.title}
            </Text>
          </View>

          {/* Score / cancelled / dash */}
          <View style={[styles.colScore, styles.scoreCell]}>
            {e.status === "cancelled" ? (
              <Badge
                label={tr("upcoming.cancelled", { defaultValue: "Cancelled" })}
                variant="danger"
                style={styles.centerBadge}
              />
            ) : e.has_score ? (
              <Text style={[styles.scoreText, { color: t.text }]}>
                {e.team_a_wins} – {e.team_b_wins}
              </Text>
            ) : (
              <Text style={[styles.dash, { color: t.mutedForeground }]}>—</Text>
            )}
          </View>

          {/* View */}
          <View style={[styles.colView, styles.viewCell]}>
            <Ionicons name={icons.eye} size={14} color={t.mutedForeground} />
            <Text style={[styles.viewText, { color: t.mutedForeground }]}>
              {tr("upcoming.view", { defaultValue: "View" })}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  rowBorder: { borderBottomWidth: 1 },
  headerLabel: {
    ...typography.label,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colMain: { flex: 1, minWidth: 0 },
  colScore: { width: 72 },
  colView: { width: 56 },
  scoreCell: { alignItems: "center" },
  viewCell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  centerText: { textAlign: "center" },
  rightText: { textAlign: "right" },
  centerBadge: { alignSelf: "center" },
  dateText: { ...typography.caption },
  titleText: { ...typography.bodySm, fontWeight: "600" },
  scoreText: { fontSize: 16, fontWeight: "600", letterSpacing: 1 },
  dash: { ...typography.bodySm },
  viewText: { ...typography.caption },
});

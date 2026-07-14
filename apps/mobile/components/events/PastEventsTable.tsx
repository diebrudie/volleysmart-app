import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing } from "@/constants/theme";
import { type PastEventRow } from "@volleysmart/core";

type Props = {
  events: PastEventRow[];
  /** Row tap → event detail (no game screen on mobile yet). */
  onRowPress: (eventId: string) => void;
};

// Fixed result colors (readable on both light card and dark slate card).
const WIN = "#16a34a"; // green-600
const LOSE = "#dc2626"; // red-600

/**
 * Past events as a stacked card list (redesign of the old score table):
 * tinted month/day/year date pill · title + club · result (colored score
 * with WON/LOST, or a Cancelled / No score pill).
 */
export function PastEventsTable({ events, onRowPress }: Props) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation("events");
  const locale = i18n.language || "en";

  const parts = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return {
      month: new Intl.DateTimeFormat(locale, { month: "short" })
        .format(d)
        .toUpperCase(),
      day: new Intl.DateTimeFormat(locale, { day: "numeric" }).format(d),
      year: new Intl.DateTimeFormat(locale, { year: "numeric" }).format(d),
    };
  };

  return (
    <View style={styles.list}>
      {events.map((e) => {
        const p = parts(e.date);
        const isCancelled = e.status === "cancelled";
        const aWon = e.team_a_wins > e.team_b_wins;
        const bWon = e.team_b_wins > e.team_a_wins;

        return (
          <Pressable
            key={e.id}
            onPress={() => onRowPress(e.id)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: t.card, borderColor: t.cardBorder },
              pressed && { backgroundColor: t.surface },
            ]}
          >
            {/* Date pill */}
            <View style={[styles.datePill, { backgroundColor: t.muted }]}>
              <Text style={[styles.month, { color: t.primary }]}>{p.month}</Text>
              <Text style={[styles.day, { color: t.text }]}>{p.day}</Text>
              <Text style={[styles.year, { color: t.mutedForeground }]}>
                {p.year}
              </Text>
            </View>

            {/* Title + club */}
            <View style={styles.info}>
              <Text
                style={[styles.title, { color: t.text }]}
                numberOfLines={1}
              >
                {e.title}
              </Text>
              {e.club_name ? (
                <Text
                  style={[styles.club, { color: t.mutedForeground }]}
                  numberOfLines={1}
                >
                  {e.club_name}
                </Text>
              ) : null}
            </View>

            {/* Result */}
            <View style={styles.result}>
              {isCancelled ? (
                <View style={styles.cancelledPill}>
                  <Text style={styles.cancelledText} numberOfLines={1}>
                    {tr("upcoming.cancelled", { defaultValue: "Cancelled" })}
                  </Text>
                </View>
              ) : e.has_score ? (
                <>
                  <Text style={styles.score} numberOfLines={1}>
                    <Text style={{ color: aWon ? WIN : LOSE }}>
                      {e.team_a_wins}
                    </Text>
                    <Text style={{ color: t.text }}> – </Text>
                    <Text style={{ color: bWon ? WIN : LOSE }}>
                      {e.team_b_wins}
                    </Text>
                  </Text>
                  {aWon || bWon ? (
                    <Text
                      style={[
                        styles.outcome,
                        { color: aWon ? WIN : LOSE },
                      ]}
                    >
                      {aWon
                        ? tr("upcoming.won", { defaultValue: "WON" })
                        : tr("upcoming.lost", { defaultValue: "LOST" })}
                    </Text>
                  ) : (
                    <Text
                      style={[styles.outcome, { color: t.mutedForeground }]}
                    >
                      {tr("upcoming.tie", { defaultValue: "TIE" })}
                    </Text>
                  )}
                </>
              ) : (
                <View style={[styles.noScorePill, { backgroundColor: t.muted }]}>
                  <Text
                    style={[styles.noScoreText, { color: t.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {tr("upcoming.noScore", { defaultValue: "No score" })}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  datePill: {
    width: 52,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  month: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  day: { fontSize: 20, fontWeight: "700", lineHeight: 24 },
  year: { fontSize: 10, fontWeight: "500" },
  info: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15, fontWeight: "600" },
  club: { fontSize: 13 },
  result: { alignItems: "flex-end", minWidth: 68 },
  score: { fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  outcome: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cancelledPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: "#fee2e2", // red-100
  },
  cancelledText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
  noScorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  noScoreText: { fontSize: 12, fontWeight: "500" },
});

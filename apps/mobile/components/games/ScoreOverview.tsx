/**
 * Sets-won summary for the Game detail screen.
 *
 * Mirrors the web Game.tsx score overview (apps/web/src/pages/Game.tsx :792-807
 * and :552-583). Sets scored 0-0 are UNPLAYED: they count for neither team and
 * are not a tie. When no set has been played the winner reads "TBD".
 */
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { type MatchSet } from "@volleysmart/core";
import { useTheme } from "@/hooks/useTheme";
import { palette, radii, spacing, typography } from "@/constants/theme";

type Props = {
  matches: MatchSet[];
  teamALabel: string;
  teamBLabel: string;
};

export function ScoreOverview({ matches, teamALabel, teamBLabel }: Props) {
  const theme = useTheme();
  const { t } = useTranslation("games");

  // 0-0 sets are unplayed — exclude from wins and from "has played" (plan rule).
  const played = matches.filter(
    (m) => m.team_a_score > 0 || m.team_b_score > 0
  );
  const teamAWins = played.filter((m) => m.team_a_score > m.team_b_score).length;
  const teamBWins = played.filter((m) => m.team_b_score > m.team_a_score).length;
  const hasPlayedAnySet = played.length > 0;

  const winner = !hasPlayedAnySet
    ? t("game.tbd", { defaultValue: "TBD" })
    : teamAWins > teamBWins
      ? teamALabel
      : teamBWins > teamAWins
        ? teamBLabel
        : t("game.tie", { defaultValue: "Tie" });

  return (
    <View style={[styles.card, { borderColor: theme.cardBorder }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerText}>
          {t("game.score", { defaultValue: "SCORE" })}
        </Text>
      </View>
      <View style={[styles.body, { backgroundColor: theme.card }]}>
        <Text style={[styles.winner, { color: theme.text }]} numberOfLines={1}>
          {winner}
        </Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.score, { color: palette.red500 }]}>{teamAWins}</Text>
          <Text style={[styles.dash, { color: theme.mutedForeground }]}>-</Text>
          <Text style={[styles.score, { color: palette.green400 }]}>{teamBWins}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  headerText: {
    ...typography.h3,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 1,
  },
  body: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  winner: {
    ...typography.h2,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  score: {
    fontSize: 44,
    fontWeight: "800",
  },
  dash: {
    fontSize: 36,
    fontWeight: "700",
    marginHorizontal: spacing.md,
  },
});

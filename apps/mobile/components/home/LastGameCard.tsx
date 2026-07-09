/**
 * LastGameCard — last match day with set score + winner.
 * Port of the "Last Game" card in apps/web/src/pages/HomeDashboard.tsx.
 */
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { type LastGame } from "@/hooks/useHomeDashboard";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
import { Skeleton } from "@/components/ui/Skeleton";

type Props = {
  game: LastGame | null | undefined;
  loading?: boolean;
};

const formatDate = (dateStr: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr + "T00:00:00"));

export function LastGameCard({ game, loading }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation("events");
  const { t: tGames } = useTranslation("games");

  const frame = [
    styles.card,
    { backgroundColor: theme.card, borderColor: theme.cardBorder },
  ];

  if (loading) {
    return (
      <View style={frame}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="70%" height={20} style={{ marginTop: spacing.md }} />
        <Skeleton width="50%" height={32} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const winnerColor =
    game?.winner === "A" ? theme.destructive : theme.success;

  // Native has no game screen (web only). If the game is linked to an event,
  // open the event detail (it shows the "view game in web app" hint row);
  // otherwise the card is inert and shows the web-only hint instead.
  const canOpenEvent = !!game?.eventId;

  return (
    <Pressable
      onPress={() =>
        game?.eventId && router.push(`/events/${game.eventId}`)
      }
      disabled={!canOpenEvent}
      style={({ pressed }) => [
        frame,
        pressed && canOpenEvent && { opacity: 0.8 },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name={icons.trophy} size={18} color={theme.primary} />
          <Text style={[styles.headerLabel, { color: theme.textSecondary }]}>
            {t("home.lastGame", { defaultValue: "Last Game" })}
          </Text>
        </View>
        {canOpenEvent ? (
          <View style={styles.viewRow}>
            <Ionicons name={icons.eye} size={15} color={theme.textSecondary} />
            <Text style={[styles.viewText, { color: theme.textSecondary }]}>
              {t("home.view", { defaultValue: "View" })}
            </Text>
          </View>
        ) : null}
      </View>

      {game ? (
        <View style={styles.body}>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={1}
          >
            {game.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {game.clubName} · {formatDate(game.date, i18n.language || "en")}
          </Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: theme.destructive }]}>
              {game.teamAWins}
            </Text>
            <Text style={[styles.scoreDash, { color: theme.text }]}>-</Text>
            <Text style={[styles.score, { color: theme.success }]}>
              {game.teamBWins}
            </Text>
          </View>
          {game.winner === "draw" ? (
            <Text style={[styles.winnerText, { color: theme.textSecondary }]}>
              {t("home.draw", { defaultValue: "Draw" })}
            </Text>
          ) : (
            <Text style={[styles.winnerText, { color: winnerColor }]}>
              {tGames(`game.team${game.winner}`, {
                defaultValue: `Team ${game.winner}`,
              })}{" "}
              {t("home.wins", { defaultValue: "wins" })}
            </Text>
          )}
          {!canOpenEvent ? (
            <Text
              style={[styles.webOnlyHint, { color: theme.mutedForeground }]}
            >
              {t("detail.viewGameWebOnly", {
                defaultValue: "View game in the web app",
              })}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyBody}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t("home.noGamesYet", { defaultValue: "No games played yet" })}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    minHeight: 196,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerLabel: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  viewRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  viewText: { ...typography.bodySm },
  body: { alignItems: "center", gap: spacing.sm, flex: 1 },
  title: { ...typography.h3, textAlign: "center" },
  subtitle: { ...typography.bodySm, textAlign: "center" },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  score: { fontSize: 34, fontWeight: "700", lineHeight: 38 },
  scoreDash: { fontSize: 22, fontWeight: "700" },
  winnerText: { ...typography.bodySm, fontWeight: "600" },
  webOnlyHint: { ...typography.caption },
  emptyBody: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { ...typography.bodySm, textAlign: "center" },
});

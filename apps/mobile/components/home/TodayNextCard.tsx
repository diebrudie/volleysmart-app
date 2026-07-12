/**
 * TodayNextCard — "Today's Game" / "Next Event" slider card.
 * Port of the primary card in apps/web/src/pages/HomeDashboard.tsx, with a
 * quick-RSVP button added for mobile.
 */
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { type TodayNextEvent } from "@/hooks/useHomeDashboard";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

type Props = {
  event: TodayNextEvent | null | undefined;
  loading?: boolean;
};

const formatDate = (dateStr: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr + "T00:00:00"));

export function TodayNextCard({ event, loading }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation("events");

  const frame = [
    styles.card,
    { backgroundColor: theme.card, borderColor: theme.cardBorder },
  ];

  if (loading) {
    return (
      <View style={frame}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="80%" height={20} style={{ marginTop: spacing.md }} />
        <Skeleton width="60%" height={14} style={{ marginTop: spacing.sm }} />
        <Skeleton height={40} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  // Empty state — no game today, no upcoming event
  if (!event) {
    return (
      <View style={frame}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="volleyball" size={18} color={theme.primary} />
            <Text style={[styles.headerLabel, { color: theme.textSecondary }]}>
              {t("home.todaysGame", { defaultValue: "Today's Game" })}
            </Text>
          </View>
        </View>
        <View style={styles.emptyBody}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t("home.noGameToday", { defaultValue: "No game scheduled today" })}
          </Text>
          <Button
            title={t("home.createEvent", { defaultValue: "Create Event" })}
            onPress={() => router.push("/events/create")}
            style={styles.smallButton}
          />
        </View>
      </View>
    );
  }

  const isAttending = event.currentUserRsvp === "attending";

  // Native has no game screen (web only) — the card and its buttons all lead
  // to the event detail screen, which shows the "view game in web app" hint.
  const openEvent = () => router.push(`/events/${event.eventId}`);

  return (
    <Pressable
      onPress={openEvent}
      accessibilityRole="button"
      style={({ pressed }) => [...frame, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="volleyball" size={18} color={theme.primary} />
          <Text style={[styles.headerLabel, { color: theme.textSecondary }]}>
            {event.isToday
              ? t("home.todaysGame", { defaultValue: "Today's Game" })
              : t("home.nextEvent", { defaultValue: "Next Event" })}
          </Text>
        </View>
        {isAttending ? (
          <View style={styles.goingRow}>
            <Ionicons name={icons.checkCircle} size={15} color={theme.success} />
            <Text style={[styles.goingText, { color: theme.success }]}>
              {t("home.youreGoing", { defaultValue: "You're going" })}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleGroup}>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {event.clubName}
            {!event.isToday && event.date
              ? ` · ${formatDate(event.date, i18n.language || "en")}`
              : ""}
          </Text>
        </View>

        <View style={styles.attendingRow}>
          <Ionicons name={icons.users} size={15} color={theme.textSecondary} />
          <Text style={[styles.attendingText, { color: theme.textSecondary }]}>
            {t("home.playersAttending", {
              defaultValue: "{{count}} players attending",
              count: event.attendingCount,
            })}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title={t("home.viewEvent", { defaultValue: "View Event" })}
            onPress={openEvent}
            style={styles.actionButton}
          />
        </View>
      </View>
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
  goingRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  goingText: { ...typography.bodySm, fontWeight: "600" },
  body: { gap: spacing.md, flex: 1 },
  titleGroup: { gap: spacing.sm },
  title: { ...typography.h3 },
  subtitle: { ...typography.bodySm },
  attendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  attendingText: { ...typography.bodySm },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: "auto",
  },
  actionButton: { flex: 1, height: 42 },
  emptyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  emptyText: { ...typography.bodySm, textAlign: "center" },
  smallButton: { height: 40, alignSelf: "stretch" },
});

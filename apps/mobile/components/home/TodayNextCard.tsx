/**
 * TodayNextCard — "Today's Game" / "Next Event" slider card.
 * Port of the primary card in apps/web/src/pages/HomeDashboard.tsx, with a
 * quick-RSVP button added for mobile.
 */
import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useRsvpMutation } from "@/hooks/useRsvpMutation";
import {
  homeQueryKeyPrefixes,
  type TodayNextEvent,
} from "@/hooks/useHomeDashboard";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";

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
  const queryClient = useQueryClient();
  const { data: playerId } = useCurrentPlayerId();
  const rsvpMutation = useRsvpMutation();
  const [rsvpPending, setRsvpPending] = useState(false);

  const handleQuickRsvp = () => {
    if (!event || !playerId) return;
    setRsvpPending(true);
    rsvpMutation.mutate(
      { eventId: event.eventId, playerId, status: "attending" },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: [homeQueryKeyPrefixes.todayNext],
          });
          toast(
            t("home.youreGoing", { defaultValue: "You're going" }),
            "success"
          );
        },
        onError: () => {
          toast(
            t("detail.failedToUpdateRsvp", {
              defaultValue: "Failed to update RSVP",
            }),
            "error"
          );
        },
        onSettled: () => setRsvpPending(false),
      }
    );
  };

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
            <Ionicons name="football-outline" size={18} color={theme.primary} />
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
            onPress={() => router.push("/events/create" as never)}
            style={styles.smallButton}
          />
        </View>
      </View>
    );
  }

  const isAttending = event.currentUserRsvp === "attending";

  return (
    <View style={frame}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="football-outline" size={18} color={theme.primary} />
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
        <View>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={1}
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
          {!isAttending && playerId ? (
            <Button
              title={t("detail.going", { defaultValue: "Going" })}
              onPress={handleQuickRsvp}
              loading={rsvpPending}
              style={styles.actionButton}
            />
          ) : null}
          {event.isToday ? (
            <Button
              title={
                event.matchDayId
                  ? t("home.viewGame", { defaultValue: "View Game" })
                  : t("home.startGame", { defaultValue: "Start Game" })
              }
              variant={
                event.matchDayId || (!isAttending && playerId)
                  ? "outline"
                  : "primary"
              }
              onPress={() =>
                event.matchDayId
                  ? router.push(`/game/${event.matchDayId}` as never)
                  : router.push(`/events/${event.eventId}` as never)
              }
              style={styles.actionButton}
            />
          ) : (
            <Button
              title={t("home.viewEvent", { defaultValue: "View Event" })}
              variant={!isAttending && playerId ? "outline" : "primary"}
              onPress={() => router.push(`/events/${event.eventId}` as never)}
              style={styles.actionButton}
            />
          )}
        </View>
      </View>
    </View>
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
  title: { ...typography.h3 },
  subtitle: { ...typography.bodySm, marginTop: 2 },
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

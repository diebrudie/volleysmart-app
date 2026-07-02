import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useEventDetail } from "@/hooks/useEventDetail";
import { useRsvpMutation } from "@/hooks/useRsvpMutation";
import { RsvpActions } from "@/components/RsvpActions";
import { type RsvpStatus } from "@volleysmart/core";

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const formatTime = (time: string) => time.slice(0, 5);

const eventTypeLabels: Record<string, string> = {
  friendly_game: "Friendly Game",
  social_game: "Social Game",
  training: "Training",
  tournament: "Tournament",
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("events");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: playerId } = useCurrentPlayerId();
  const { data: event, isLoading } = useEventDetail(id);
  const rsvpMutation = useRsvpMutation();

  const attendingCount =
    event?.event_rsvp?.filter((r) => r.status === "attending").length ?? 0;
  const userRsvp = playerId
    ? event?.event_rsvp?.find((r) => r.player_id === playerId)
    : undefined;

  const handleRsvp = (status: RsvpStatus | null) => {
    if (!playerId || !event) return;
    rsvpMutation.mutate({ eventId: event.id, playerId, status });
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["event-detail", id],
    });
  };

  if (isLoading || !event) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: t("back", { defaultValue: "Back" }),
          }}
        />
        <Screen>
          <Spinner />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("back", { defaultValue: "Back" }),
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
        }}
      />
      <Screen onRefresh={handleRefresh}>
        <Text style={[styles.title, { color: theme.text }]}>
          {event.title}
        </Text>

        <View style={styles.badges}>
          {event.status === "cancelled" && (
            <Badge label="Cancelled" variant="danger" />
          )}
          <Badge
            label={eventTypeLabels[event.event_type] ?? event.event_type}
            variant="default"
          />
          {event.activity_type === "beach" && (
            <Badge label="Beach" variant="warning" />
          )}
        </View>

        <View style={styles.infoSection}>
          <InfoRow icon="calendar-outline" theme={theme}>
            {formatDate(event.date)}
          </InfoRow>
          <InfoRow icon="time-outline" theme={theme}>
            {formatTime(event.start_time)}
            {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
          </InfoRow>
          {event.locations && (
            <InfoRow icon="location-outline" theme={theme}>
              {event.locations.name}
              {event.locations.address ? ` · ${event.locations.address}` : ""}
            </InfoRow>
          )}
          {event.clubs && (
            <Pressable
              onPress={() => router.push(`/clubs/${event.club_id}`)}
            >
              <InfoRow icon="people-outline" theme={theme}>
                <Text style={{ color: theme.primary }}>
                  {event.clubs.name}
                </Text>
              </InfoRow>
            </Pressable>
          )}
          <InfoRow icon="person-outline" theme={theme}>
            {attendingCount} {t("attending", { defaultValue: "attending" })}
            {event.max_players ? ` / ${event.max_players} max` : ""}
          </InfoRow>
        </View>

        {event.notes && (
          <View style={styles.notesSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              {t("notes", { defaultValue: "Notes" })}
            </Text>
            <Text style={[styles.notesText, { color: theme.text }]}>
              {event.notes}
            </Text>
          </View>
        )}

        {playerId && event.status !== "cancelled" && (
          <View style={styles.rsvpSection}>
            <RsvpActions
              currentStatus={(userRsvp?.status as RsvpStatus) ?? null}
              isPending={rsvpMutation.isPending}
              onRsvp={handleRsvp}
            />
          </View>
        )}
      </Screen>
    </>
  );
}

function InfoRow({
  icon,
  theme,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  theme: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.textSecondary} />
      <Text style={[styles.infoText, { color: theme.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", marginTop: 8 },
  badges: { flexDirection: "row", gap: 8, marginTop: 12 },
  infoSection: { marginTop: 20, gap: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 15, flex: 1 },
  notesSection: { marginTop: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  notesText: { fontSize: 15, lineHeight: 22 },
  rsvpSection: { marginTop: 32 },
});

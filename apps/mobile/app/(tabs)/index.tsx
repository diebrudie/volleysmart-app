import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents";
import { useUserClubs } from "@/hooks/useUserClubs";
import { EventCard } from "@/components/EventCard";
import { ClubCard } from "@/components/ClubCard";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const { t } = useTranslation("home");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: playerId } = useCurrentPlayerId();
  const {
    data: events,
    isLoading: eventsLoading,
  } = useUpcomingEvents();
  const {
    data: clubs,
    isLoading: clubsLoading,
  } = useUserClubs();

  const firstName = user?.user_metadata?.first_name ?? "";
  const nextEvent = events?.[0];

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] }),
      queryClient.invalidateQueries({ queryKey: ["user-clubs"] }),
    ]);
  };

  const isLoading = eventsLoading && clubsLoading;

  return (
    <Screen onRefresh={handleRefresh} safeTop={false}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>
          {t("greeting", { defaultValue: "Welcome back," })}{" "}
          <Text style={[styles.greetingName, { color: theme.text }]}>
            {firstName || "Player"}
          </Text>
        </Text>
      </View>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="people" size={20} color={theme.primary} />
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {clubs?.length ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t("stats.clubs", { defaultValue: "Clubs" })}
                </Text>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="calendar" size={20} color={theme.primary} />
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {events?.length ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {t("stats.upcoming", { defaultValue: "Upcoming" })}
                </Text>
              </View>
            </Card>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("sections.nextEvent", { defaultValue: "Next Event" })}
          </Text>
          {nextEvent ? (
            <EventCard
              event={nextEvent}
              currentPlayerId={playerId}
              onPress={() => router.push(`/events/${nextEvent.id}`)}
            />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t("empty.noEvents", { defaultValue: "No upcoming events" })}
            </Text>
          )}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("sections.myClubs", { defaultValue: "My Clubs" })}
          </Text>
          {clubs && clubs.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.clubScroll}
            >
              {clubs.map((club) => (
                <View key={club.club_id} style={styles.clubScrollItem}>
                  <ClubCard
                    club={club}
                    onPress={() => router.push(`/clubs/${club.club_id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t("empty.noClubs", {
                defaultValue: "Join a club to get started",
              })}
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 12, marginBottom: 20 },
  greeting: { fontSize: 16 },
  greetingName: { fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1 },
  statContent: { alignItems: "center", gap: 4 },
  statNumber: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12, marginTop: 8 },
  emptyText: { fontSize: 14, marginBottom: 16 },
  clubScroll: { gap: 12, paddingRight: 16 },
  clubScrollItem: { width: 280 },
});

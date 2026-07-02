import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useUserClubs } from "@/hooks/useUserClubs";
import { useClubMembers } from "@/hooks/useClubMembers";
import { useClubEvents } from "@/hooks/useClubEvents";
import { EventCard } from "@/components/EventCard";
import { MemberRow } from "@/components/MemberRow";

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: playerId } = useCurrentPlayerId();
  const { data: clubs } = useUserClubs();
  const { data: members, isLoading: membersLoading } = useClubMembers(id);
  const { data: events, isLoading: eventsLoading } = useClubEvents(id);

  const club = clubs?.find((c) => c.club_id === id);
  const clubData = club?.clubs;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["club-members", id] }),
      queryClient.invalidateQueries({ queryKey: ["club-events", id] }),
      queryClient.invalidateQueries({ queryKey: ["user-clubs"] }),
    ]);
  };

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
        <View style={styles.header}>
          <Avatar
            uri={clubData?.image_url}
            name={clubData?.name}
            size={64}
          />
          <Text style={[styles.name, { color: theme.text }]}>
            {clubData?.name ?? t("loading", { defaultValue: "Loading..." })}
          </Text>
          {clubData?.city && (
            <Text style={[styles.city, { color: theme.textSecondary }]}>
              {clubData.city}
            </Text>
          )}
          {clubData?.description && (
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {clubData.description}
            </Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("sections.upcomingEvents", { defaultValue: "Upcoming Events" })}
        </Text>
        {eventsLoading ? (
          <Spinner />
        ) : events && events.length > 0 ? (
          <View style={styles.eventList}>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentPlayerId={playerId}
                onPress={() => router.push(`/events/${event.id}`)}
              />
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t("empty.noEvents", { defaultValue: "No upcoming events" })}
          </Text>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("sections.members", { defaultValue: "Members" })} ({members?.length ?? 0})
        </Text>
        {membersLoading ? (
          <Spinner />
        ) : members && members.length > 0 ? (
          <View style={styles.memberList}>
            {members.slice(0, 10).map((member) => (
              <MemberRow
                key={member.user_id}
                name={
                  [member.first_name, member.last_name]
                    .filter(Boolean)
                    .join(" ") || "Player"
                }
                imageUrl={member.image_url}
                role={member.role}
              />
            ))}
            {members.length > 10 && (
              <Text
                style={[styles.moreText, { color: theme.textSecondary }]}
              >
                +{members.length - 10}{" "}
                {t("more", { defaultValue: "more" })}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t("empty.noMembers", { defaultValue: "No members" })}
          </Text>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: 8, marginBottom: 24, gap: 6 },
  name: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  city: { fontSize: 14 },
  description: { fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
  },
  eventList: { gap: 12 },
  memberList: { gap: 0 },
  emptyText: { fontSize: 14, marginBottom: 16 },
  moreText: { fontSize: 13, paddingVertical: 8, textAlign: "center" },
});

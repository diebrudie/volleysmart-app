import { FlatList, RefreshControl, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents";
import { EventCard } from "@/components/EventCard";
import { type PlannedEvent } from "@volleysmart/core";

export default function EventsScreen() {
  const { t } = useTranslation("events");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: playerId } = useCurrentPlayerId();
  const { data: events, isLoading } = useUpcomingEvents();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
    setRefreshing(false);
  }, [queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: PlannedEvent }) => (
      <EventCard
        event={item}
        currentPlayerId={playerId}
        onPress={() => router.push(`/events/${item.id}`)}
      />
    ),
    [playerId, router]
  );

  return (
    <Screen scroll={false} padded={false} safeTop={false}>
      {isLoading && !events ? (
        <Spinner />
      ) : (
        <FlatList
          data={events ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={t("empty.title", { defaultValue: "No events yet" })}
              subtitle={t("empty.subtitle", {
                defaultValue:
                  "Events will appear here once your clubs create them",
              })}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 20, paddingHorizontal: 16 },
});

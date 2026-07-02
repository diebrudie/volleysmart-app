import { FlatList, RefreshControl, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useUserClubs } from "@/hooks/useUserClubs";
import { ClubCard } from "@/components/ClubCard";
import { type MemberClubWithDetails } from "@volleysmart/core";

export default function ClubsScreen() {
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: clubs, isLoading } = useUserClubs();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["user-clubs"] });
    setRefreshing(false);
  }, [queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: MemberClubWithDetails }) => (
      <ClubCard
        club={item}
        onPress={() => router.push(`/clubs/${item.club_id}`)}
      />
    ),
    [router]
  );

  return (
    <Screen scroll={false} padded={false} safeTop={false}>
      {isLoading && !clubs ? (
        <Spinner />
      ) : (
        <FlatList
          data={clubs ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item.club_id}
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
              title={t("empty.title", { defaultValue: "No clubs yet" })}
              subtitle={t("empty.subtitle", {
                defaultValue: "Join or create a club to get started",
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

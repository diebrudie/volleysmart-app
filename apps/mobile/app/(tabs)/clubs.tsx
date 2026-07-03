import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getClubMemberCount } from "@volleysmart/core";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useUserClubs } from "@/hooks/useUserClubs";
import { usePendingClubRequests } from "@/hooks/useDiscoverClubs";
import { ClubCard } from "@/components/ClubCard";
import { DiscoverClubsSection } from "@/components/clubs/DiscoverClubsSection";
import { queryKeys } from "@/constants/queryKeys";
import { spacing, radii, typography, palette } from "@/constants/theme";
import { icons } from "@/constants/icons";

export default function ClubsScreen() {
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clubs, isLoading } = useUserClubs();
  const { data: pendingRequests = [] } = usePendingClubRequests();

  // Member count per club (SECURITY DEFINER RPC), cached per club id.
  const memberCountQueries = useQueries({
    queries: (clubs ?? []).map((club) => ({
      queryKey: queryKeys.clubs.memberCount(club.club_id),
      queryFn: () => getClubMemberCount(club.club_id),
      staleTime: 60_000,
    })),
  });
  const memberCounts = new Map<string, number>();
  (clubs ?? []).forEach((club, i) => {
    const count = memberCountQueries[i]?.data;
    if (typeof count === "number") memberCounts.set(club.club_id, count);
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.mine(user?.id) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.pendingJoinRequests(user?.id),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allDiscover }),
    ]);
  }, [queryClient, user?.id]);

  const handleCreateClub = () => router.push("/clubs/create");

  if (isLoading && !clubs) {
    return (
      <Screen scroll={false} safeTop={false}>
        <Spinner />
      </Screen>
    );
  }

  const hasClubs = (clubs ?? []).length > 0;

  return (
    <Screen safeTop={false} onRefresh={handleRefresh}>
      {/* Header: title + create CTA (web Clubs.tsx header) */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t("title", { defaultValue: "Your Clubs" })}
        </Text>
        <Pressable
          onPress={handleCreateClub}
          style={({ pressed }) => [
            styles.createButton,
            {
              backgroundColor: pressed ? theme.primaryPressed : theme.primary,
            },
          ]}
        >
          <Ionicons name={icons.userPlus} size={14} color={palette.white} />
          <Text style={styles.createButtonText}>
            {t("createClub", { defaultValue: "Create Club" })}
          </Text>
        </Pressable>
      </View>

      {/* Your clubs */}
      {hasClubs ? (
        <View style={styles.list}>
          {(clubs ?? []).map((club) => (
            <ClubCard
              key={club.club_id}
              club={club}
              memberCount={memberCounts.get(club.club_id)}
              onPress={() => router.push(`/clubs/${club.club_id}`)}
            />
          ))}
        </View>
      ) : pendingRequests.length === 0 ? (
        <EmptyState
          title={t("empty.title", { defaultValue: "No clubs yet" })}
          subtitle={t("emptyState", {
            defaultValue: "You haven't joined any clubs yet.",
          })}
        />
      ) : null}

      {/* Pending join requests (web Clubs.tsx pending section) */}
      {pendingRequests.length > 0 && (
        <View style={[styles.list, hasClubs && styles.pendingSpacing]}>
          {pendingRequests.map((req) => (
            <View
              key={req.club_id}
              style={[
                styles.pendingRow,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Avatar name={req.clubs?.name} size={48} />
              <View style={styles.pendingInfo}>
                <Text
                  style={[styles.pendingName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {req.clubs?.name ??
                    t("unknownClub", { defaultValue: "Unknown Club" })}
                </Text>
                {req.clubs?.city && (
                  <Text
                    style={[
                      styles.pendingCity,
                      { color: theme.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {req.clubs.city}
                  </Text>
                )}
              </View>
              <Badge
                label={t("pendingBadge", { defaultValue: "Pending" })}
                variant="warning"
              />
            </View>
          ))}
        </View>
      )}

      {/* Discover */}
      <View style={styles.discoverSpacing}>
        <DiscoverClubsSection />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  headerTitle: { ...typography.h2 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 36,
  },
  createButtonText: {
    ...typography.bodySm,
    fontWeight: "600",
    color: palette.white,
  },
  list: { gap: spacing.md },
  pendingSpacing: { marginTop: spacing.lg },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  pendingInfo: { flex: 1, gap: 2 },
  pendingName: { ...typography.bodySm, fontWeight: "600" },
  pendingCity: { ...typography.caption },
  discoverSpacing: { marginTop: spacing.xxl },
});

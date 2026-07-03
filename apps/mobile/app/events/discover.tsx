/**
 * Discover Events screen — full list of public events near the player's
 * home city, excluding the user's own clubs.
 * Port of apps/web/src/pages/DiscoverEvents.tsx (list view only; the web
 * map view is intentionally skipped on mobile).
 */
import { View, FlatList, Text, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventCard } from "@/components/EventCard";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useDiscoverEvents } from "@/hooks/useDiscoverEvents";
import { icons } from "@/constants/icons";
import { radii, spacing } from "@/constants/theme";

export default function DiscoverEventsScreen() {
  const { t } = useTranslation("events");
  const theme = useTheme();
  const router = useRouter();
  const { data: playerId } = useCurrentPlayerId();
  const { events, city, isLoading } = useDiscoverEvents();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t("discover.title", { defaultValue: "Public Events" }),
          headerBackTitle: t("common:back", { defaultValue: "Back" }),
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
        }}
      />
      <Screen scroll={false} safeTop={false} padded={false}>
        {isLoading ? (
          <View style={styles.skeletons}>
            <Skeleton height={96} radius={radii.xl} />
            <Skeleton height={96} radius={radii.xl} />
            <Skeleton height={96} radius={radii.xl} />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.center}>
            <EmptyState
              icon={
                <Ionicons
                  name={icons.calendarDays}
                  size={44}
                  color={theme.textSecondary}
                />
              }
              title={t("discover.noPublicEvents", {
                defaultValue: "No public events",
              })}
              subtitle={
                city
                  ? t("discover.checkBack", {
                      defaultValue: "Check back later for events in your area",
                    })
                  : t("discover.setCityHint", {
                      defaultValue:
                        "Add your city to your profile to find public events near you",
                    })
              }
            />
            {!city ? (
              <Button
                title={t("discover.editProfile", {
                  defaultValue: "Edit Profile",
                })}
                variant="outline"
                onPress={() => router.push("/profile")}
                style={styles.profileButton}
              />
            ) : null}
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              city ? (
                <Text
                  style={[styles.cityHint, { color: theme.textSecondary }]}
                >
                  {t("discover.nearCity", {
                    defaultValue: "Public events in {{city}}",
                    city,
                  })}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <EventCard
                event={item}
                currentPlayerId={playerId}
                onPress={() => router.push(`/events/${item.id}`)}
              />
            )}
          />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  skeletons: { padding: spacing.lg, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  profileButton: { marginTop: spacing.sm, paddingHorizontal: spacing.xxl },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  cityHint: { fontSize: 13, marginBottom: spacing.xs },
});

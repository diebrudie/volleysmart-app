/**
 * DiscoverSection — up to 3 public events near the player's city with a
 * "See more" link to /events/discover.
 * Port of the "Discover Events" section in apps/web/src/pages/HomeDashboard.tsx.
 */
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useDiscoverEvents } from "@/hooks/useDiscoverEvents";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EventCard } from "@/components/EventCard";

export function DiscoverSection() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation("events");
  const { data: playerId } = useCurrentPlayerId();
  const { events, city, isLoading } = useDiscoverEvents(3);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="compass-outline"
            size={20}
            color={theme.textSecondary}
          />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t("home.discoverEvents", { defaultValue: "Discover Events" })}
          </Text>
        </View>
        {events.length > 0 ? (
          <Pressable
            onPress={() => router.push("/events/discover" as never)}
            hitSlop={8}
          >
            <Text style={[styles.seeMore, { color: theme.primary }]}>
              {t("home.seeMore", { defaultValue: "See more" })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.list}>
          <Skeleton height={96} radius={radii.xl} />
          <Skeleton height={96} radius={radii.xl} />
        </View>
      ) : events.length > 0 ? (
        <View style={styles.list}>
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              currentPlayerId={playerId}
              onPress={() => router.push(`/events/${event.id}` as never)}
            />
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.empty,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <Ionicons
            name={icons.calendarDays}
            size={36}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {city
              ? t("home.noPublicEvents", {
                  defaultValue: "No public events happening in {{city}}",
                  city,
                })
              : t("home.noPublicEventsDefault", {
                  defaultValue: "No public events happening in your area",
                })}
          </Text>
          <Button
            title={t("home.createEvent", { defaultValue: "Create Event" })}
            onPress={() => router.push("/events/create" as never)}
            style={styles.createButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xxl },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { ...typography.h2 },
  seeMore: { ...typography.bodySm, fontWeight: "600" },
  list: { gap: spacing.md },
  empty: {
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: { ...typography.bodySm, textAlign: "center" },
  createButton: { height: 40, paddingHorizontal: spacing.xl },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  formatShortName,
  getClubMemberCount,
  getSupabaseClient,
  type PlannedEvent,
} from "@volleysmart/core";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { queryKeys } from "@/constants/queryKeys";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  event: PlannedEvent;
  isCreator: boolean;
  /** Public event viewed by a non-member: hide the creator photo like web. */
  anonymizeCreator: boolean;
};

/**
 * Missing from constants/queryKeys (frozen for this work package):
 * creator profile for an event, keyed by the creator's user id.
 */
const creatorProfileKey = (userId: string | undefined) =>
  ["creator-profile", userId] as const;

type CreatorProfile = {
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
} | null;

/**
 * "Hosted by" card mirroring the web EventDetail section: club row
 * (image, name, member count; tap -> club detail) + creator row
 * (avatar, short name, "Organizer", disabled chat button placeholder).
 */
export function HostedBy({ event, isCreator, anonymizeCreator }: Props) {
  const { t } = useTranslation("events");
  const theme = useTheme();
  const router = useRouter();

  const { data: creatorProfile } = useQuery<CreatorProfile>({
    queryKey: creatorProfileKey(event.created_by),
    enabled: !!event.created_by,
    queryFn: async () => {
      const { data } = await getSupabaseClient()
        .from("players")
        .select("first_name, last_name, image_url")
        .eq("user_id", event.created_by)
        .maybeSingle();
      return (data as CreatorProfile) ?? null;
    },
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: queryKeys.clubs.memberCount(event.club_id ?? undefined),
    enabled: !!event.club_id,
    queryFn: () => getClubMemberCount(event.club_id!),
  });

  const creatorName = creatorProfile
    ? formatShortName(creatorProfile.first_name, creatorProfile.last_name)
    : t("detail.unknown", { defaultValue: "Unknown" });

  return (
    <View style={styles.section}>
      <Text style={[styles.header, { color: theme.text }]}>
        {t("detail.hostedBy", { defaultValue: "Hosted by" })}
      </Text>
      <View
        style={[
          styles.card,
          { borderColor: theme.cardBorder, backgroundColor: theme.card },
        ]}
      >
        {event.clubs ? (
          <>
            <Pressable
              onPress={() => router.push(`/clubs/${event.clubs!.id}` as never)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: theme.surface },
              ]}
            >
              {event.clubs.image_url ? (
                <Image
                  source={{ uri: event.clubs.image_url }}
                  style={[styles.clubImage, { backgroundColor: theme.muted }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.clubImage, { backgroundColor: theme.muted }]}>
                  <Ionicons
                    name={icons.users}
                    size={24}
                    color={theme.mutedForeground}
                  />
                </View>
              )}
              <View style={styles.textCol}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                  {event.clubs.name}
                </Text>
                {memberCount > 0 ? (
                  <Text style={[styles.sub, { color: theme.mutedForeground }]}>
                    {t("detail.memberCount", {
                      count: memberCount,
                      defaultValue: "{{count}} Members",
                    })}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name={icons.chevronRight}
                size={18}
                color={theme.mutedForeground}
              />
            </Pressable>
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          </>
        ) : null}

        <View style={styles.row}>
          {anonymizeCreator ? (
            <View style={[styles.anonAvatar, { backgroundColor: theme.muted }]}>
              <Ionicons name={icons.user} size={24} color={theme.mutedForeground} />
            </View>
          ) : (
            <Avatar uri={creatorProfile?.image_url} name={creatorName} size={48} />
          )}
          <View style={styles.textCol}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {creatorName}
            </Text>
            <Text style={[styles.sub, { color: theme.mutedForeground }]}>
              {t("detail.organizer", { defaultValue: "Organizer" })}
            </Text>
          </View>
          {!isCreator ? (
            <View
              style={[styles.chatButton, { borderColor: theme.border }]}
              accessibilityLabel="Chat with organizer (coming soon)"
            >
              <Ionicons
                name={icons.messageSquare}
                size={16}
                color={theme.mutedForeground}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { ...typography.h3 },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  clubImage: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  anonAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, minWidth: 0, gap: 1 },
  name: { ...typography.body, fontWeight: "600" },
  sub: { ...typography.bodySm },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  chatButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.4,
  },
});

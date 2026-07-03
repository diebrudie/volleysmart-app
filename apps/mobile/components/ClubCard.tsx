import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { spacing, radii, typography, palette } from "@/constants/theme";
import { icons } from "@/constants/icons";
import { type MemberClubWithDetails } from "@volleysmart/core";

type Props = {
  club: MemberClubWithDetails;
  /** Active member count (fetched by the screen; hidden when undefined). */
  memberCount?: number;
  onPress?: () => void;
};

/**
 * "Your Clubs" card, mirroring apps/web/src/pages/Clubs.tsx:
 * 16:10 image banner (initial fallback), name + admin badge,
 * "Playing since" date, city row, optional member count.
 */
export function ClubCard({ club, memberCount, onPress }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("clubs");
  const isAdmin = club.role === "admin" || club.role === "editor";
  const name = club.clubs?.name ?? tr("unknownClub", { defaultValue: "Unknown Club" });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: t.card, borderColor: t.cardBorder },
        pressed && styles.pressed,
      ]}
    >
      {/* Image banner */}
      <View style={[styles.banner, { backgroundColor: t.muted }]}>
        {club.clubs?.image_url ? (
          <Image
            source={{ uri: club.clubs.image_url }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.bannerFallback, { backgroundColor: t.primary }]}>
            <Text style={styles.bannerInitial}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {name}
          </Text>
          {isAdmin && (
            <View style={[styles.roleBadge, { backgroundColor: t.muted }]}>
              <Text style={[styles.roleBadgeText, { color: t.mutedForeground }]}>
                {club.role === "admin"
                  ? tr("adminBadge", { defaultValue: "Admin" })
                  : tr("editorBadge", { defaultValue: "Editor" })}
              </Text>
            </View>
          )}
        </View>

        {club.clubs?.created_at && (
          <Text style={[styles.meta, { color: t.mutedForeground }]}>
            {tr("playingSince", {
              date: formatDate(club.clubs.created_at),
              defaultValue: "Playing since {{date}}",
            })}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Ionicons name={icons.mapPin} size={14} color={t.mutedForeground} />
          <Text
            style={[styles.meta, { color: t.mutedForeground }]}
            numberOfLines={1}
          >
            {club.clubs?.city ??
              tr("locationNotSet", { defaultValue: "Location not set" })}
          </Text>
        </View>

        {memberCount !== undefined && (
          <View style={styles.metaRow}>
            <Ionicons name={icons.users} size={14} color={t.mutedForeground} />
            <Text style={[styles.meta, { color: t.mutedForeground }]}>
              {tr("memberCount", {
                count: memberCount,
                defaultValue: "{{count}} members",
              })}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  pressed: { opacity: 0.8 },
  banner: {
    width: "100%",
    aspectRatio: 16 / 10,
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerInitial: {
    ...typography.h1,
    color: palette.white,
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    ...typography.h3,
    flexShrink: 1,
  },
  roleBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  roleBadgeText: {
    ...typography.label,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  meta: {
    ...typography.bodySm,
    flexShrink: 1,
  },
});

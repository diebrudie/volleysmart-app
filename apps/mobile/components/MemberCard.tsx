import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  /** Display name, e.g. "Isabel B." */
  name: string;
  imageUrl?: string | null;
  /** Secondary line under the name (e.g. primary position). */
  subtitle?: string | null;
  /** Small inline label right of the name (e.g. "You"). */
  badgeLabel?: string | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * Grid-view member card, mirroring apps/web
 * components/members/MemberCard.tsx: 4:3 image banner
 * (person-glyph fallback), name + optional "You" label, position.
 */
export function MemberCard({ name, imageUrl, subtitle, badgeLabel, style }: Props) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.cardBorder },
        style,
      ]}
    >
      {/* Image banner */}
      <View style={[styles.image, { backgroundColor: t.muted }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.imageFill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.fallback}>
            <Ionicons name={icons.user} size={40} color={t.mutedForeground} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: t.text }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {badgeLabel ? (
            <Text style={[styles.badge, { color: t.textSecondary }]}>
              {badgeLabel}
            </Text>
          ) : null}
        </View>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: t.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  imageFill: { width: "100%", height: "100%" },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.md,
    // spacing.sm between stacked text rows (name / position) —
    // matches ClubCard.
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  name: {
    ...typography.body,
    fontWeight: "600",
    flexShrink: 1,
  },
  badge: {
    ...typography.caption,
    flexShrink: 0,
  },
  subtitle: { ...typography.caption },
});

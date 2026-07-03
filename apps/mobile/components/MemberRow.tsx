import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { spacing, typography } from "@/constants/theme";

type Props = {
  name: string;
  imageUrl?: string | null;
  /** Membership role; "admin"/"editor" renders a role badge. */
  role?: string | null;
  /** Secondary line under the name (e.g. primary position). */
  subtitle?: string | null;
  /** Tertiary line (e.g. clubs shared with the current user). */
  caption?: string | null;
  /** Custom badge text; overrides the role badge when provided. */
  badgeLabel?: string | null;
  avatarSize?: number;
};

export function MemberRow({
  name,
  imageUrl,
  role,
  subtitle,
  caption,
  badgeLabel,
  avatarSize = 40,
}: Props) {
  const t = useTheme();
  const isAdmin = role === "admin" || role === "editor";
  const badge = badgeLabel ?? (isAdmin ? (role as string) : null);

  return (
    <View style={styles.row}>
      <Avatar uri={imageUrl} name={name} size={avatarSize} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: t.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        {caption ? (
          <Text
            style={[styles.caption, { color: t.textSecondary }]}
            numberOfLines={1}
          >
            {caption}
          </Text>
        ) : null}
      </View>
      {badge ? <Badge label={badge} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  info: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontWeight: "500" },
  subtitle: { ...typography.caption, marginTop: 1 },
  caption: { ...typography.caption, marginTop: 1 },
});

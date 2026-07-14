/**
 * Single notification inbox row.
 *
 * Mirrors the web row in apps/web/src/pages/Notifications.tsx: type icon,
 * title (+ unread dot), two-line description, relative timestamp. Unread rows
 * get a primary-tinted background.
 */

import { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow, parseISO } from "date-fns";
import { getDateLocale, type Notification } from "@volleysmart/core";
import { spacing, radii, typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  getNotificationDisplay,
  type NotificationDisplay,
} from "./notificationMeta";

type Props = {
  notification: Notification;
  /** Called with the resolved display (icon/title/href) on tap. */
  onPress: (notification: Notification, display: NotificationDisplay) => void;
};

function NotificationRowInner({ notification, onPress }: Props) {
  const { t, i18n } = useTranslation("notifications");
  const theme = useTheme();
  const dateLocale = getDateLocale(i18n.language);

  const display = getNotificationDisplay(notification, t, dateLocale);
  const unread = !notification.read;

  return (
    <Pressable
      onPress={() => onPress(notification, display)}
      style={({ pressed }) => [
        styles.row,
        unread && { backgroundColor: `${theme.primary}0D` },
        pressed && { backgroundColor: `${theme.primary}1A` },
      ]}
      accessibilityRole="button"
      accessibilityLabel={display.title}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={display.icon} size={20} color={theme[display.colorKey]} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: theme.text },
              unread && styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {display.title}
          </Text>
          {unread && (
            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          )}
        </View>
        {display.description ? (
          <Text
            style={[styles.description, { color: theme.mutedForeground }]}
            numberOfLines={2}
          >
            {display.description}
          </Text>
        ) : null}
        <Text style={[styles.time, { color: theme.mutedForeground }]}>
          {formatDistanceToNow(parseISO(notification.created_at), {
            addSuffix: true,
            locale: dateLocale,
          })}
        </Text>
      </View>
    </Pressable>
  );
}

export const NotificationRow = memo(NotificationRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    borderRadius: radii.lg,
  },
  iconWrap: {
    marginTop: spacing.xs / 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: "500",
    flexShrink: 1,
  },
  titleUnread: {
    fontWeight: "600",
  },
  dot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radii.full,
  },
  description: {
    ...typography.bodySm,
    marginTop: spacing.xs / 2,
  },
  time: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

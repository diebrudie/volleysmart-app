/**
 * Notifications inbox. Web reference: apps/web/src/pages/Notifications.tsx.
 * Unread rows are primary-tinted; tap marks read and navigates to the
 * notification's target; header action marks everything read.
 */

import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { Notification } from "@volleysmart/core";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import type { NotificationDisplay } from "@/components/notifications/notificationMeta";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { spacing, radii, typography } from "@/constants/theme";

export default function NotificationsScreen() {
  const { t } = useTranslation("notifications");
  const theme = useTheme();
  const router = useRouter();

  const {
    data: notifications = [],
    isLoading,
    refetch,
    isRefetching,
  } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRowPress = useCallback(
    (n: Notification, display: NotificationDisplay) => {
      if (!n.read) {
        markRead.mutate(n.id);
      }
      if (display.href) {
        router.push(display.href as never);
      }
    },
    [markRead, router]
  );

  const renderHeaderRight = () =>
    unreadCount > 0 ? (
      <Pressable
        onPress={() => markAllRead.mutate()}
        disabled={markAllRead.isPending}
        style={({ pressed }) => [
          styles.readAllButton,
          { borderColor: theme.border },
          pressed && { backgroundColor: theme.muted },
          markAllRead.isPending && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        <Ionicons name={icons.check} size={14} color={theme.text} />
        <Text style={[styles.readAllText, { color: theme.text }]}>
          {t("readAll", { defaultValue: "Read all" })}
        </Text>
      </Pressable>
    ) : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t("header", { defaultValue: "Notifications" }),
          headerBackTitle: t("common:button.back", { defaultValue: "Back" }),
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
          headerRight: renderHeaderRight,
        }}
      />
      <Screen scroll={false} safeTop={false} padded={false}>
        {isLoading ? (
          <Spinner />
        ) : notifications.length === 0 ? (
          <View style={styles.center}>
            <EmptyState
              icon={
                <Ionicons
                  name={icons.bell}
                  size={48}
                  color={theme.mutedForeground}
                />
              }
              title={t("header", { defaultValue: "Notifications" })}
              subtitle={t("empty", { defaultValue: "No notifications yet" })}
            />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(n) => n.id}
            renderItem={({ item }) => (
              <NotificationRow notification={item} onPress={handleRowPress} />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={theme.primary}
              />
            }
          />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.xs / 2,
  },
  readAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  readAllText: {
    ...typography.caption,
    fontWeight: "500",
  },
  disabled: { opacity: 0.5 },
});

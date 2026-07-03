import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  type Notification,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

/**
 * Prefix keys for invalidation. queryKeys.notifications only exposes
 * per-user key builders, no `all*` prefix arrays (see queryKeys.events.allUpcoming
 * for the pattern) — defined locally per workflow rules and reported.
 */
const NOTIFICATIONS_LIST_PREFIX = ["notifications"] as const;
const UNREAD_COUNT_PREFIX = ["unreadNotificationCount"] as const;

/** Inbox list for the signed-in user (newest first). */
export function useNotifications() {
  const { user } = useAuth();
  return useQuery<Notification[]>({
    queryKey: queryKeys.notifications.list(user?.id),
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

/** Mark one notification read; invalidates list + unread badge. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_PREFIX });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_PREFIX });
    },
  });
}

/** Mark every notification of the signed-in user read. */
export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_PREFIX });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_PREFIX });
    },
  });
}

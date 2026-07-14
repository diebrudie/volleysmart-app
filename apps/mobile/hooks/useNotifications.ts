import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  type Notification,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

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
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.allUnread });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.allUnread });
    },
  });
}

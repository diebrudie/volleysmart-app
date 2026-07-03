import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotificationPreferences,
  getPref,
  upsertNotificationPreference,
  type NotificationPref,
  type NotificationType,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

export type NotificationChannel = keyof NotificationPref; // "in_app" | "push" | "email"

/**
 * Notification preferences with optimistic per-channel toggling.
 * Mirrors apps/web/src/pages/NotificationPreferences.tsx handleToggleTypes:
 * cache is updated immediately, then upserts run; on failure the previous
 * Map is restored.
 */
export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.notifications.preferences(user?.id);

  const { data: prefs, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: !!user?.id,
  });

  /**
   * Toggle one channel for a group of notification types.
   * Resolves true on success, false when the write failed (and was rolled back).
   */
  const toggleTypes = useCallback(
    async (
      types: NotificationType[],
      channel: NotificationChannel,
      value: boolean
    ): Promise<boolean> => {
      if (!user?.id || !prefs) return false;

      const previous = new Map(prefs);
      const next = new Map(prefs);
      for (const type of types) {
        next.set(type, { ...getPref(next, type), [channel]: value });
      }
      queryClient.setQueryData(queryKey, next);

      try {
        await Promise.all(
          types.map((type) =>
            upsertNotificationPreference(user.id, type, channel, value)
          )
        );
        return true;
      } catch {
        queryClient.setQueryData(queryKey, previous);
        return false;
      }
    },
    // queryKey identity changes with user?.id which is already a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, prefs, queryClient]
  );

  /** True when every given type has the channel enabled (defaults on). */
  const isChannelOn = useCallback(
    (types: NotificationType[], channel: NotificationChannel): boolean =>
      prefs ? types.every((type) => getPref(prefs, type)[channel]) : true,
    [prefs]
  );

  return { prefs, isLoading, toggleTypes, isChannelOn };
}

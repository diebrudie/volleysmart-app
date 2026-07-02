import { useQuery } from "@tanstack/react-query";
import { fetchUnreadCount } from "@volleysmart/core";
import { useAuth } from "./useAuth";

export function useUnreadNotifications() {
  const { user } = useAuth();
  return useQuery<number>({
    queryKey: ["unreadNotificationCount", user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

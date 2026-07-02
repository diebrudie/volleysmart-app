import { useQuery } from "@tanstack/react-query";
import { fetchUpcomingEvents, type PlannedEvent } from "@volleysmart/core";
import { useAuth } from "./useAuth";

export function useUpcomingEvents() {
  const { user } = useAuth();
  return useQuery<PlannedEvent[]>({
    queryKey: ["upcoming-events", user?.id],
    queryFn: () => fetchUpcomingEvents(user!.id),
    enabled: !!user?.id,
  });
}

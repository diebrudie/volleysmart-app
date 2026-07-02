import { useQuery } from "@tanstack/react-query";
import { fetchSingleEvent, type PlannedEvent } from "@volleysmart/core";

export function useEventDetail(eventId: string) {
  return useQuery<PlannedEvent>({
    queryKey: ["event-detail", eventId],
    queryFn: () => fetchSingleEvent(eventId),
    enabled: !!eventId,
  });
}

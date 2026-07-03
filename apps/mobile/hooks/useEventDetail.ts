import { useQuery } from "@tanstack/react-query";
import {
  fetchSingleEvent,
  getSupabaseClient,
  type PlannedEvent,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

export function useEventDetail(eventId: string) {
  return useQuery<PlannedEvent>({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => fetchSingleEvent(eventId),
    enabled: !!eventId,
  });
}

/**
 * Missing from constants/queryKeys (frozen for this work package):
 * linked match day for a planned event (mirrors web ["event-match-day", id]).
 */
export const eventMatchDayKey = (eventId: string | undefined) =>
  ["event-match-day", eventId] as const;

/**
 * The match day (game) linked to this event, if one was started.
 * Mirrors the web EventDetail `linkedMatchDay` query. The mobile app only
 * uses this to show a "game exists — view in web app" hint (game layer is
 * deferred on native).
 */
export function useEventMatchDay(eventId?: string) {
  return useQuery<{ id: string } | null>({
    queryKey: eventMatchDayKey(eventId),
    enabled: !!eventId,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("match_days")
        .select("id" as unknown as string)
        .eq("planned_event_id" as never, eventId!)
        .maybeSingle();
      return (data as { id: string } | null) ?? null;
    },
  });
}

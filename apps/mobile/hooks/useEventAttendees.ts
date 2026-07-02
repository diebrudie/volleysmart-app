import { useQuery } from "@tanstack/react-query";
import { getEventAttendees, type EventAttendeeRow } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

/**
 * Attendee profiles for an event via the get_event_attendees RPC
 * (SECURITY DEFINER: works for organizer + club members, [] for others).
 */
export function useEventAttendees(eventId?: string | null) {
  return useQuery<EventAttendeeRow[]>({
    queryKey: queryKeys.events.attendees(eventId ?? undefined),
    enabled: !!eventId,
    queryFn: () => getEventAttendees(eventId!),
  });
}

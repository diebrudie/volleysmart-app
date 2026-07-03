import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  cancelPlannedEvent,
  cancelRecurringSeries,
  deletePlannedEvent,
  updatePlannedEvent,
  updateRecurringSeries,
  type PlannedEvent,
  type UpdateEventInput,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import type { EventFormValues } from "@/components/events/form/EventFormFields";
import { useAuth } from "./useAuth";
import { resolveLocationId } from "./useCreateEvent";

/** "single" = this event only, "series" = this and all future events. */
export type EventEditScope = "single" | "series";

function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Map the shared EventFormValues to core UpdateEventInput. */
function buildUpdateInput(
  values: EventFormValues,
  locationId: string | null,
  hasClub: boolean
): UpdateEventInput {
  const input: UpdateEventInput = {
    title: values.title.trim(),
    location_id: locationId,
    is_public: values.isPublic,
    max_players: values.maxPlayers ?? null,
    notes: values.notes.trim() || null,
    event_gender: values.eventGender,
    activity_type: values.isIndoor ? "indoor" : "beach",
    rsvp_deadline: values.rsvpDeadline
      ? values.rsvpDeadline.toISOString()
      : null,
    is_opponent_mode: hasClub && values.isOpponentMode,
    opponent_team_name:
      hasClub && values.isOpponentMode
        ? values.opponentTeamName.trim() || null
        : null,
  };
  if (values.eventType) input.event_type = values.eventType;
  if (values.date) input.date = toDateString(values.date);
  if (values.startTime) input.start_time = values.startTime;
  if (values.endTime) input.end_time = values.endTime;
  return input;
}

function invalidateEventCaches(queryClient: QueryClient, eventId?: string) {
  // Series edits touch sibling events too — invalidate all detail queries.
  queryClient.invalidateQueries({ queryKey: queryKeys.events.allDetails });
  queryClient.invalidateQueries({ queryKey: queryKeys.events.allUpcoming });
  queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allEvents });
  if (eventId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.events.attendees(eventId),
    });
  }
}

/**
 * Save edits to an event. `scope: "series"` updates the recurring parent
 * template + all future children via core updateRecurringSeries (the core
 * helper intentionally does NOT shift child dates — same as web).
 */
export function useUpdateEvent(event: PlannedEvent | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      values,
      scope,
    }: {
      values: EventFormValues;
      scope: EventEditScope;
    }) => {
      if (!event) throw new Error("Missing event");
      if (!user?.id) throw new Error("Not authenticated");
      const locationId = await resolveLocationId(
        user.id,
        event.club_id,
        values.locationName,
        values.locationAddress
      );
      const input = buildUpdateInput(values, locationId, !!event.club_id);
      const recurringParentId = event.recurrence_parent_id ?? event.id;
      if (scope === "series") {
        await updateRecurringSeries(recurringParentId, input);
      } else {
        await updatePlannedEvent(event.id, input);
      }
    },
    onSuccess: () => invalidateEventCaches(queryClient, event?.id),
  });
}

/**
 * Cancel an event (status -> 'cancelled', notifies members) with a preset
 * reason + optional comment; `scope: "series"` cancels the whole series.
 */
export function useCancelEvent(event: PlannedEvent | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reason,
      comment,
      scope,
    }: {
      reason: string;
      comment?: string;
      scope: EventEditScope;
    }) => {
      if (!event) throw new Error("Missing event");
      const recurringParentId = event.recurrence_parent_id ?? event.id;
      if (scope === "series") {
        await cancelRecurringSeries(recurringParentId, reason, comment);
      } else {
        await cancelPlannedEvent(event.id, reason, comment);
      }
    },
    onSuccess: () => invalidateEventCaches(queryClient, event?.id),
  });
}

/** Permanently delete an event. Caller navigates back on success. */
export function useDeleteEvent(eventId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("Missing event id");
      await deletePlannedEvent(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.allUpcoming });
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allEvents });
      queryClient.removeQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
  });
}

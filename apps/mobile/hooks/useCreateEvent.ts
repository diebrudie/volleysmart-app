import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEventTemplate,
  createPlannedEvent,
  getSupabaseClient,
  type CreateEventInput,
  type TemplateConfig,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import type { EventFormValues } from "@/components/events/form/EventFormFields";
import { useAuth } from "./useAuth";

export type CreateEventPayload = {
  values: EventFormValues;
  /** A club UUID or null for a personal (clubless) event. */
  clubId: string | null;
  recurrenceRule: "weekly" | "monthly" | null;
  /** When set, saves the form as a template with this name (non-blocking). */
  saveTemplateName?: string | null;
};

function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Resolve a locations row id from the two-field (name + address) input:
 * reuse a saved location with the same name in the same scope, updating its
 * address if it changed; otherwise insert a new location row.
 * Mirrors the web EventLocationSelector commit logic (without Mapbox).
 */
async function resolveLocationId(
  userId: string,
  clubId: string | null,
  name: string,
  address: string
): Promise<string | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;
  const trimmedAddress = address.trim();
  const supabase = getSupabaseClient();

  let query = supabase.from("locations").select("id, name, address");
  query = clubId
    ? query.eq("club_id", clubId)
    : query.is("club_id", null).eq("created_by", userId);
  const { data: existing, error: fetchError } = await query;
  if (fetchError) throw fetchError;

  const match = (existing ?? []).find(
    (l: { id: string; name: string; address: string | null }) =>
      l.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (match) {
    if (trimmedAddress && trimmedAddress !== (match.address ?? "").trim()) {
      const { error } = await supabase
        .from("locations")
        .update({ address: trimmedAddress })
        .eq("id", match.id);
      if (error) throw error;
    }
    return match.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("locations")
    .insert({
      club_id: clubId,
      name: trimmedName,
      address: trimmedAddress || null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id as string;
}

/**
 * Create-event mutation: resolves the location, creates the planned event
 * (with optional recurrence rule), optionally saves the form as a template,
 * and invalidates the upcoming/club event caches.
 */
export function useCreateEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateEventPayload): Promise<{ id: string }> => {
      const { values, clubId, recurrenceRule, saveTemplateName } = payload;
      if (!user?.id) throw new Error("Not authenticated");
      if (!values.eventType || !values.date || !values.title.trim()) {
        throw new Error("Missing required fields");
      }

      const locationId = await resolveLocationId(
        user.id,
        clubId,
        values.locationName,
        values.locationAddress
      );

      const input: CreateEventInput = {
        title: values.title.trim(),
        event_type: values.eventType,
        event_gender: values.eventGender,
        activity_type: values.isIndoor ? "indoor" : "beach",
        date: toDateString(values.date),
        start_time: values.startTime,
        end_time: values.endTime,
        club_id: clubId,
        location_id: locationId,
        is_public: values.isPublic,
        max_players: values.maxPlayers ?? undefined,
        notes: values.notes.trim() || undefined,
        rsvp_deadline: values.rsvpDeadline
          ? values.rsvpDeadline.toISOString()
          : undefined,
        recurrence_rule: recurrenceRule ?? undefined,
        is_opponent_mode: !!clubId && values.isOpponentMode,
        opponent_team_name:
          !!clubId && values.isOpponentMode
            ? values.opponentTeamName.trim() || undefined
            : undefined,
      };

      const result = await createPlannedEvent(user.id, input);

      // Save as template if requested — non-blocking, mirrors web behavior.
      if (saveTemplateName?.trim()) {
        try {
          const config: TemplateConfig = {
            event_type: input.event_type,
            title: input.title,
            start_time: input.start_time,
            end_time: input.end_time,
            location_id: input.location_id ?? undefined,
            max_players: input.max_players,
            is_public: input.is_public,
            notes: input.notes,
          };
          await createEventTemplate(user.id, {
            name: saveTemplateName.trim(),
            club_id: clubId,
            config,
          });
        } catch {
          console.warn("Failed to save template, event was still created.");
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.allUpcoming });
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allEvents });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.templates(user?.id),
      });
    },
  });
}

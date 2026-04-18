import { supabase } from "./client";

export type EventType =
  | "friendly_game"
  | "social_game"
  | "training"
  | "tournament";

export type EventStatus = "open" | "confirmed" | "cancelled" | "completed";
export type RsvpStatus = "attending" | "declined" | "maybe";

export interface PlannedEvent {
  id: string;
  club_id: string | null;
  created_by: string;
  title: string;
  event_type: EventType;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  location_id: string | null;
  is_public: boolean;
  max_players: number | null;
  min_players: number;
  notes: string | null;
  rsvp_deadline: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  clubs?: { id: string; name: string } | null;
  locations?: { name: string; address?: string | null } | null;
  event_rsvp?: Array<{ status: RsvpStatus; player_id: string }>;
}

/** Fetch all upcoming events across every club the user is an active member of,
 *  plus the user's own clubless events. */
export async function fetchUpcomingEvents(
  userId: string
): Promise<PlannedEvent[]> {
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  const clubIds = (memberships ?? [])
    .map((m) => m.club_id)
    .filter(Boolean) as string[];

  const today = new Date().toISOString().split("T")[0];

  const selectFields = `
    *,
    clubs(id, name),
    locations(name, address),
    event_rsvp(status, player_id)
  `;

  // Club events
  const clubEventsPromise =
    clubIds.length > 0
      ? supabase
          .from("planned_events")
          .select(selectFields)
          .in("club_id", clubIds)
          .in("status", ["open", "confirmed"])
          .gte("date", today)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
      : Promise.resolve({ data: [], error: null });

  // User's own clubless events
  const personalEventsPromise = supabase
    .from("planned_events")
    .select(selectFields)
    .is("club_id", null)
    .eq("created_by", userId)
    .in("status", ["open", "confirmed"])
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const [clubResult, personalResult] = await Promise.all([
    clubEventsPromise,
    personalEventsPromise,
  ]);

  if (clubResult.error) throw clubResult.error;
  if (personalResult.error) throw personalResult.error;

  const all = [
    ...((clubResult.data ?? []) as PlannedEvent[]),
    ...((personalResult.data ?? []) as PlannedEvent[]),
  ];

  // Deduplicate (in case a clubless event was also returned) and sort
  const seen = new Set<string>();
  const unique = all.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  unique.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
  );

  return unique;
}

/** Upsert RSVP (insert or update on conflict). */
export async function upsertRsvp(
  eventId: string,
  playerId: string,
  status: RsvpStatus
): Promise<void> {
  const { error } = await supabase.from("event_rsvp").upsert(
    {
      event_id: eventId,
      player_id: playerId,
      status,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "event_id,player_id" }
  );
  if (error) throw error;
}

export interface CreateEventInput {
  title: string;
  event_type: EventType;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  club_id: string | null;
  location_id?: string | null;
  is_public: boolean;
  max_players?: number;
  min_players?: number;
  notes?: string;
  rsvp_deadline?: string; // ISO timestamp
  extra_club_ids?: string[]; // for tournament multi-club
}

/** Create a planned event with an optional location_id and optional club. */
export async function createPlannedEvent(
  userId: string,
  input: CreateEventInput
): Promise<{ id: string }> {
  const { data: event, error } = await supabase
    .from("planned_events")
    .insert({
      title: input.title,
      event_type: input.event_type,
      date: input.date,
      start_time: `${input.start_time}:00`, // ensure HH:MM:SS
      club_id: input.club_id,
      created_by: userId,
      location_id: input.location_id ?? null,
      is_public: input.is_public,
      max_players: input.max_players ?? null,
      min_players: input.min_players ?? 4,
      notes: input.notes ?? null,
      rsvp_deadline: input.rsvp_deadline ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  // For multi-club tournaments, link additional clubs
  if (input.club_id && input.extra_club_ids?.length && event?.id) {
    const allClubIds = [input.club_id, ...input.extra_club_ids].filter(
      (id, i, arr) => arr.indexOf(id) === i
    );
    await supabase
      .from("event_clubs")
      .insert(allClubIds.map((clubId) => ({ event_id: event.id, club_id: clubId })));
  }

  return event as { id: string };
}

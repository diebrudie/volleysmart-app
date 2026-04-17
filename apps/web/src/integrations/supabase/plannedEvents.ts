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
  locations?: { name: string; city: string | null } | null;
  event_rsvp?: Array<{ status: RsvpStatus; player_id: string }>;
}

/** Fetch all upcoming events across every club the user is an active member of. */
export async function fetchUpcomingEvents(
  userId: string
): Promise<PlannedEvent[]> {
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!memberships?.length) return [];
  const clubIds = memberships
    .map((m) => m.club_id)
    .filter(Boolean) as string[];

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("planned_events")
    .select(
      `
      *,
      clubs(id, name),
      locations(name, city),
      event_rsvp(status, player_id)
    `
    )
    .in("club_id", clubIds)
    .in("status", ["open", "confirmed"])
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PlannedEvent[];
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
  club_id: string;
  location_name?: string;
  is_public: boolean;
  max_players?: number;
  min_players?: number;
  notes?: string;
  rsvp_deadline?: string; // ISO timestamp
  extra_club_ids?: string[]; // for tournament multi-club
}

/** Create a planned event, optionally inserting a location by name. */
export async function createPlannedEvent(
  userId: string,
  input: CreateEventInput
): Promise<{ id: string }> {
  let locationId: string | null = null;

  if (input.location_name?.trim()) {
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .insert({ name: input.location_name.trim(), created_by: userId })
      .select("id")
      .single();
    if (!locErr && loc) locationId = loc.id;
  }

  const { data: event, error } = await supabase
    .from("planned_events")
    .insert({
      title: input.title,
      event_type: input.event_type,
      date: input.date,
      start_time: `${input.start_time}:00`, // ensure HH:MM:SS
      club_id: input.club_id,
      location_id: locationId,
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
  if (input.extra_club_ids?.length && event?.id) {
    const allClubIds = [input.club_id, ...input.extra_club_ids].filter(
      (id, i, arr) => arr.indexOf(id) === i
    );
    await supabase
      .from("event_clubs")
      .insert(allClubIds.map((clubId) => ({ event_id: event.id, club_id: clubId })));
  }

  return event as { id: string };
}

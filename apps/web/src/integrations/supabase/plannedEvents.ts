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
  end_time: string | null; // HH:MM:SS
  location_id: string | null;
  is_public: boolean;
  max_players: number | null;
  min_players: number;
  notes: string | null;
  rsvp_deadline: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  clubs?: { id: string; name: string; image_url?: string | null } | null;
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
    clubs!planned_events_club_id_fkey(id, name, image_url),
    locations!planned_events_location_id_fkey(name, address),
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
      : Promise.resolve({ data: [] as any[], error: null });

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

export interface PastEventRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  club_name: string | null;
  team_a_wins: number;
  team_b_wins: number;
  has_score: boolean;
}

/** Fetch past events with match scores. */
export async function fetchPastEvents(
  userId: string
): Promise<PastEventRow[]> {
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
    id, title, date, start_time,
    clubs!planned_events_club_id_fkey(name)
  `;

  const clubEventsPromise =
    clubIds.length > 0
      ? supabase
          .from("planned_events")
          .select(selectFields)
          .in("club_id", clubIds)
          .lt("date", today)
          .order("date", { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null });

  const personalEventsPromise = supabase
    .from("planned_events")
    .select(selectFields)
    .is("club_id", null)
    .eq("created_by", userId)
    .lt("date", today)
    .order("date", { ascending: false });

  const [clubResult, personalResult] = await Promise.all([
    clubEventsPromise,
    personalEventsPromise,
  ]);

  if (clubResult.error) throw clubResult.error;
  if (personalResult.error) throw personalResult.error;

  const allEvents = [
    ...((clubResult.data ?? []) as any[]),
    ...((personalResult.data ?? []) as any[]),
  ];

  const seen = new Set<string>();
  const uniqueEvents = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // Fetch match scores for these events via match_days
  const eventIds = uniqueEvents.map((e) => e.id);
  let matchScores: Record<string, { a: number; b: number }> = {};

  if (eventIds.length > 0) {
    const { data: matchDays } = await supabase
      .from("match_days")
      .select("planned_event_id, matches(team_a_score, team_b_score)")
      .in("planned_event_id", eventIds);

    for (const md of matchDays ?? []) {
      if (!md.planned_event_id || !md.matches?.length) continue;
      let a = 0;
      let b = 0;
      for (const m of md.matches as any[]) {
        const sa = m.team_a_score ?? 0;
        const sb = m.team_b_score ?? 0;
        if (sa + sb === 0) continue;
        if (sa > sb) a++;
        else if (sb > sa) b++;
      }
      matchScores[md.planned_event_id] = { a, b };
    }
  }

  const rows: PastEventRow[] = uniqueEvents.map((e) => {
    const score = matchScores[e.id];
    return {
      id: e.id,
      title: e.title,
      date: e.date,
      start_time: e.start_time,
      club_name: e.clubs?.name ?? null,
      team_a_wins: score?.a ?? 0,
      team_b_wins: score?.b ?? 0,
      has_score: !!score,
    };
  });

  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
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

/** Fetch a single planned event by ID with full details. */
export async function fetchSingleEvent(
  eventId: string
): Promise<PlannedEvent> {
  const { data, error } = await supabase
    .from("planned_events")
    .select(
      `*, clubs!planned_events_club_id_fkey(id, name, image_url), locations!planned_events_location_id_fkey(name, address), event_rsvp(status, player_id)`
    )
    .eq("id", eventId)
    .single();
  if (error) throw error;
  return data as PlannedEvent;
}

/** Delete a planned event. */
export async function deletePlannedEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from("planned_events")
    .delete()
    .eq("id", eventId);
  if (error) throw error;
}

export interface CreateEventInput {
  title: string;
  event_type: EventType;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
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
      end_time: `${input.end_time}:00`, // ensure HH:MM:SS
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

export interface UpdateEventInput {
  title?: string;
  event_type?: EventType;
  date?: string;
  start_time?: string; // HH:MM
  end_time?: string; // HH:MM
  location_id?: string | null;
  is_public?: boolean;
  max_players?: number | null;
  notes?: string | null;
}

/** Update an existing planned event. */
export async function updatePlannedEvent(
  eventId: string,
  input: UpdateEventInput
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.event_type !== undefined) updates.event_type = input.event_type;
  if (input.date !== undefined) updates.date = input.date;
  if (input.start_time !== undefined)
    updates.start_time = `${input.start_time}:00`;
  if (input.end_time !== undefined) updates.end_time = `${input.end_time}:00`;
  if (input.location_id !== undefined) updates.location_id = input.location_id;
  if (input.is_public !== undefined) updates.is_public = input.is_public;
  if (input.max_players !== undefined) updates.max_players = input.max_players;
  if (input.notes !== undefined) updates.notes = input.notes;

  const { error } = await supabase
    .from("planned_events")
    .update(updates)
    .eq("id", eventId);
  if (error) throw error;
}

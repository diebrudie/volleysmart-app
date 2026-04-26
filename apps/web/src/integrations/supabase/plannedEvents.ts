import { supabase } from "./client";

export type EventType =
  | "friendly_game"
  | "social_game"
  | "training"
  | "tournament";

export type EventStatus = "open" | "confirmed" | "cancelled" | "completed";
export type RsvpStatus = "attending" | "declined";

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
  clubs?: { id: string; name: string; image_url?: string | null; is_club_discoverable?: boolean | null } | null;
  locations?: { name: string; address?: string | null } | null;
  cancellation_reason?: string | null;
  cancellation_comment?: string | null;
  recurrence_rule?: string | null;
  recurrence_parent_id?: string | null;
  recurrence_cancelled_at?: string | null;
  event_rsvp?: Array<{ status: RsvpStatus; player_id: string; responded_at?: string | null }>;
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
    .eq("is_active", true)
    .eq("status", "active");

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

  // Public events the user RSVPed to (so they appear in "my events")
  const { data: playerRow } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let rsvpedEventIds: string[] = [];
  if (playerRow?.id) {
    const { data: rsvps } = await supabase
      .from("event_rsvp")
      .select("event_id")
      .eq("player_id", playerRow.id);
    rsvpedEventIds = (rsvps ?? []).map((r) => r.event_id);
  }

  const rsvpedPublicPromise =
    rsvpedEventIds.length > 0
      ? supabase
          .from("planned_events")
          .select(selectFields)
          .eq("is_public", true)
          .in("status", ["open", "confirmed"])
          .gte("date", today)
          .in("id", rsvpedEventIds)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
      : Promise.resolve({ data: [] as any[], error: null });

  const [clubResult, personalResult, rsvpedPublicResult] = await Promise.all([
    clubEventsPromise,
    personalEventsPromise,
    rsvpedPublicPromise,
  ]);

  if (clubResult.error) throw clubResult.error;
  if (personalResult.error) throw personalResult.error;
  if (rsvpedPublicResult.error) throw rsvpedPublicResult.error;

  const all = [
    ...((clubResult.data ?? []) as PlannedEvent[]),
    ...((personalResult.data ?? []) as PlannedEvent[]),
    ...((rsvpedPublicResult.data ?? []) as PlannedEvent[]),
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

/** Fetch all upcoming public events (for Discover or direct link access). */
export async function fetchPublicEvents(): Promise<PlannedEvent[]> {
  const today = new Date().toISOString().split("T")[0];

  const selectFields = `
    *,
    clubs!planned_events_club_id_fkey(id, name, image_url),
    locations!planned_events_location_id_fkey(name, address),
    event_rsvp(status, player_id)
  `;

  const { data, error } = await supabase
    .from("planned_events")
    .select(selectFields)
    .eq("is_public", true)
    .in("status", ["open", "confirmed"])
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as PlannedEvent[];
}

/** Fetch upcoming public events for a specific club. */
export async function fetchClubPublicEvents(
  clubId: string
): Promise<PlannedEvent[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("planned_events")
    .select(
      `*, clubs!planned_events_club_id_fkey(id, name, image_url), locations!planned_events_location_id_fkey(name, address), event_rsvp(status, player_id)`
    )
    .eq("club_id", clubId)
    .eq("is_public", true)
    .in("status", ["open", "confirmed"])
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as PlannedEvent[];
}

export interface PastEventRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  event_type: string;
  club_name: string | null;
  team_a_wins: number;
  team_b_wins: number;
  has_score: boolean;
  match_day_id: string | null;
  rsvp_status: RsvpStatus | null; // user's own RSVP for this event
}

/** Fetch past events with match scores. */
export async function fetchPastEvents(
  userId: string
): Promise<PastEventRow[]> {
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("status", "active");

  const clubIds = (memberships ?? [])
    .map((m) => m.club_id)
    .filter(Boolean) as string[];

  const today = new Date().toISOString().split("T")[0];

  // Get the user's player_id for RSVP lookup
  const { data: playerRow } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const playerId = playerRow?.id ?? null;

  const selectFields = `
    id, title, date, start_time, event_type,
    clubs!planned_events_club_id_fkey(name),
    event_rsvp(status, player_id)
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
  let matchData: Record<
    string,
    { a: number; b: number; matchDayId: string }
  > = {};

  if (eventIds.length > 0) {
    const { data: matchDays } = await supabase
      .from("match_days")
      .select("id, planned_event_id, matches(team_a_score, team_b_score)")
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
      matchData[md.planned_event_id] = { a, b, matchDayId: md.id };
    }
  }

  const rows: PastEventRow[] = uniqueEvents.map((e) => {
    const md = matchData[e.id];
    const myRsvp = playerId
      ? (e.event_rsvp as any[] | undefined)?.find(
          (r: any) => r.player_id === playerId
        )?.status ?? null
      : null;
    return {
      id: e.id,
      title: e.title,
      date: e.date,
      start_time: e.start_time,
      event_type: e.event_type ?? "friendly_game",
      club_name: e.clubs?.name ?? null,
      team_a_wins: md?.a ?? 0,
      team_b_wins: md?.b ?? 0,
      has_score: !!md,
      match_day_id: md?.matchDayId ?? null,
      rsvp_status: myRsvp as RsvpStatus | null,
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

/** Cancel / withdraw an RSVP entirely. */
export async function deleteRsvp(
  eventId: string,
  playerId: string
): Promise<void> {
  const { error } = await supabase
    .from("event_rsvp")
    .delete()
    .eq("event_id", eventId)
    .eq("player_id", playerId);
  if (error) throw error;
}

/** Fetch a single planned event by ID with full details. */
export async function fetchSingleEvent(
  eventId: string
): Promise<PlannedEvent> {
  const { data, error } = await supabase
    .from("planned_events")
    .select(
      `*, clubs!planned_events_club_id_fkey(id, name, image_url, is_club_discoverable), locations!planned_events_location_id_fkey(name, address), event_rsvp(status, player_id, responded_at)`
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

/** Cancel a planned event (sets status to 'cancelled', triggers notification). */
export async function cancelPlannedEvent(
  eventId: string,
  reason: string,
  comment?: string
): Promise<void> {
  const { error } = await supabase
    .from("planned_events")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancellation_comment: comment || null,
    })
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
  recurrence_rule?: "weekly" | "monthly";
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
      recurrence_rule: input.recurrence_rule ?? null,
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

/** Cancel a recurring series — stop future generation and cancel future instances. */
export async function cancelRecurringSeries(
  parentId: string,
  reason: string,
  comment?: string
): Promise<void> {
  // Mark parent as recurrence-cancelled
  const { error: e1 } = await supabase
    .from("planned_events")
    .update({
      recurrence_cancelled_at: new Date().toISOString(),
      status: "cancelled",
      cancellation_reason: reason,
      cancellation_comment: comment || null,
    })
    .eq("id", parentId);
  if (e1) throw e1;

  // Cancel all future open/confirmed children
  const today = new Date().toISOString().split("T")[0];
  const { error: e2 } = await supabase
    .from("planned_events")
    .update({ status: "cancelled" })
    .eq("recurrence_parent_id", parentId)
    .gte("date", today)
    .in("status", ["open", "confirmed"]);
  if (e2) throw e2;
}

/** Update a recurring series — update parent template + future children. */
export async function updateRecurringSeries(
  parentId: string,
  input: UpdateEventInput
): Promise<void> {
  // Update the parent (template for future generation)
  await updatePlannedEvent(parentId, input);

  // Build updates for children
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.event_type !== undefined) updates.event_type = input.event_type;
  if (input.start_time !== undefined)
    updates.start_time = `${input.start_time}:00`;
  if (input.end_time !== undefined) updates.end_time = `${input.end_time}:00`;
  if (input.location_id !== undefined) updates.location_id = input.location_id;
  if (input.is_public !== undefined) updates.is_public = input.is_public;
  if (input.max_players !== undefined) updates.max_players = input.max_players;
  if (input.notes !== undefined) updates.notes = input.notes;

  if (Object.keys(updates).length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("planned_events")
      .update(updates)
      .eq("recurrence_parent_id", parentId)
      .gte("date", today)
      .in("status", ["open", "confirmed"]);
    if (error) throw error;
  }
}

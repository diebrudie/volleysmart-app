/**
 * Platform-neutral game data layer.
 *
 * Extracted verbatim (same tables, selects, insert shapes and ordering) from
 * the web game pages so the native app never re-implements Supabase queries:
 *   - apps/web/src/pages/Game.tsx      (fetch bundle, inline score edit, add/delete set, delete match, same-teams)
 *   - apps/web/src/pages/NewGame.tsx   (create-game insert sequence)
 *   - apps/web/src/pages/EditGame.tsx  (save-teams path)
 *   - apps/web/src/pages/EventDetail.tsx (createMatchDay + get_game_start_players RPC)
 *
 * PURE DATA ONLY: no React, no DOM, no i18n. UI-facing fallbacks (e.g.
 * "No Position", deleted-player labels) stay in the UI; this layer returns
 * raw rows (`position_played` / `snapshot_name` untranslated).
 */
import { getSupabaseClient } from "./clientHolder";
import { markModifiedBy } from "./matchDays";
import type { Tables } from "./types";

/* ------------------------------------------------------------------ */
/* Result types                                                        */
/* ------------------------------------------------------------------ */

export type TeamName = "team_a" | "team_b";

/** A single set (one `matches` row). */
export interface MatchSet {
  id: string;
  game_number: number;
  team_a_score: number;
  team_b_score: number;
}

/** The live player row joined onto a game_player (null when missing/deleted). */
export interface BundlePlayer {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

/**
 * One roster entry. `position_played` and `snapshot_name` are raw (untranslated);
 * the UI applies its own "No Position" / display-name fallbacks. When `player`
 * is null, render `snapshot_name` (guest / deleted-player fallback).
 */
export interface BundleGamePlayer {
  player_id: string;
  team_name: string;
  position_played: string | null;
  order_index: number | null;
  snapshot_name: string | null;
  player: BundlePlayer | null;
}

/** match_day + its sets + roster, mirroring Game.tsx fetch shape. */
export interface MatchDayBundle {
  id: string;
  date: string;
  notes: string | null;
  club_id: string | null;
  location_id: string | null;
  planned_event_id: string | null;
  is_opponent_mode: boolean;
  opponent_team_name: string | null;
  /** Ordered by game_number ascending. */
  matches: MatchSet[];
  game_players: BundleGamePlayer[];
  clubs: { name: string } | null;
  locations: { id: string; name: string } | null;
}

/** A roster entry to insert when creating a game (NewGame / EventDetail). */
export interface NewGamePlayer {
  player_id: string;
  team_name: TeamName;
  position_played: string | null;
}

export interface CreateMatchDayInput {
  clubId: string;
  /** DATE string ("yyyy-MM-dd"), NOT an ISO datetime. */
  date: string;
  createdBy: string;
  locationId?: string | null;
  plannedEventId?: string | null;
  isOpponentMode?: boolean;
  opponentTeamName?: string | null;
  /** Assigned roster (already run through assignTeams / RPC). */
  gamePlayers: NewGamePlayer[];
}

/** A roster entry to persist from Edit Game (tap-to-move / drag save). */
export interface GamePlayerAssignment {
  player_id: string;
  team_name: TeamName;
  position_played: string | null;
  order_index: number;
}

export interface UpdateGamePlayersOptions {
  /** Written to adjusted_by on every row (EditGame passes user.id). */
  adjustedBy?: string | null;
  /** When provided, also updates match_days.date (write as "yyyy-MM-dd"). */
  date?: string;
  /** When provided, also updates match_days.location_id. */
  locationId?: string | null;
}

/** One row from the get_game_start_players RPC. */
export type GameStartPlayer = {
  player_id: string;
  first_name: string | null;
  user_id: string | null;
  gender: string | null;
  skill_rating: number;
  positions: unknown;
  club_memberships: unknown;
};

/* ------------------------------------------------------------------ */
/* 1. fetchMatchDayBundle — mirrors Game.tsx :175-285                  */
/* ------------------------------------------------------------------ */

export async function fetchMatchDayBundle(
  matchDayId: string
): Promise<MatchDayBundle> {
  if (!matchDayId) throw new Error("Match day ID is required");
  const supabase = getSupabaseClient();

  // match_day + embedded matches/clubs/locations (Game.tsx :187-199)
  const { data: matchDay, error: mdError } = await supabase
    .from("match_days")
    .select(
      `
        id, date, notes, club_id, location_id,
        planned_event_id, is_opponent_mode, opponent_team_name,
        matches ( id, game_number, team_a_score, team_b_score ),
        clubs ( name ),
        locations ( id, name )
      ` as unknown as string
    )
    .eq("id", matchDayId)
    .single();

  if (mdError) throw mdError;

  // Game players with snapshot_name + order_index, with the same fallback
  // Game.tsx :212-237 uses when the columns are unavailable.
  type GPRaw = {
    player_id: string;
    team_name: string;
    position_played: string | null;
    order_index: number | null;
    snapshot_name: string | null;
  };

  let gamePlayersRaw: GPRaw[] = [];
  {
    const { data, error } = await supabase
      .from("game_players")
      .select(
        "player_id, team_name, position_played, order_index, snapshot_name" as unknown as string
      )
      .eq("match_day_id", matchDayId)
      .order("team_name", { ascending: true })
      .order("order_index", { ascending: true, nullsFirst: true });

    if (!error) {
      gamePlayersRaw = (data ?? []) as unknown as GPRaw[];
    } else {
      const { data: d2 } = await supabase
        .from("game_players")
        .select("player_id, team_name, position_played")
        .eq("match_day_id", matchDayId);
      gamePlayersRaw = ((d2 ?? []) as unknown as Array<
        Pick<GPRaw, "player_id" | "team_name" | "position_played">
      >).map((gp) => ({
        ...gp,
        order_index: null,
        snapshot_name: null,
      }));
    }
  }

  // Fetch player details (Game.tsx :240-266)
  let gamePlayers: BundleGamePlayer[] = [];
  if (gamePlayersRaw.length > 0) {
    const playerIds = gamePlayersRaw.map((gp) => gp.player_id);
    const { data: playersData } = await supabase
      .from("players")
      .select("id, user_id, first_name, last_name")
      .in("id", playerIds);

    const players = (playersData ?? []) as BundlePlayer[];
    gamePlayers = gamePlayersRaw.map((gp) => {
      const player = players.find((p) => p.id === gp.player_id) ?? null;
      return {
        player_id: gp.player_id,
        team_name: gp.team_name,
        position_played: gp.position_played,
        order_index: gp.order_index,
        snapshot_name: gp.snapshot_name,
        player,
      };
    });
  }

  const md = matchDay as unknown as {
    id: string;
    date: string;
    notes: string | null;
    club_id: string | null;
    location_id: string | null;
    planned_event_id: string | null;
    is_opponent_mode: boolean | null;
    opponent_team_name: string | null;
    matches: MatchSet[] | null;
    clubs: { name: string } | null;
    locations: { id: string; name: string } | null;
  };

  const matches = [...(md.matches ?? [])].sort(
    (a, b) => a.game_number - b.game_number
  );

  return {
    id: md.id,
    date: md.date,
    notes: md.notes,
    club_id: md.club_id,
    location_id: md.location_id,
    planned_event_id: md.planned_event_id ?? null,
    is_opponent_mode: md.is_opponent_mode ?? false,
    opponent_team_name: md.opponent_team_name ?? null,
    matches,
    game_players: gamePlayers,
    clubs: md.clubs ?? null,
    locations: md.locations ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* 2. updateSetScore — mirrors Game.tsx handleSetScoreUpdate :363-383  */
/* ------------------------------------------------------------------ */

export async function updateSetScore(
  matchId: string,
  teamAScore: number,
  teamBScore: number
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("matches")
    .update({ team_a_score: teamAScore, team_b_score: teamBScore })
    .eq("id", matchId);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* 3. addSet — mirrors Game.tsx handleAddSet :411-427                  */
/* ------------------------------------------------------------------ */

/**
 * Append an extra set. Callers own the "5 base sets + extras, set 5 scored,
 * <= MAX_SETS" gating (Game.tsx :401-409); this inserts unconditionally.
 */
export async function addSet(
  matchDayId: string,
  gameNumber: number
): Promise<MatchSet> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      match_day_id: matchDayId,
      game_number: gameNumber,
      team_a_score: 0,
      team_b_score: 0,
    })
    .select()
    .single();
  if (error) throw error;
  const row = data as Tables<"matches">;
  return {
    id: row.id,
    game_number: row.game_number,
    team_a_score: row.team_a_score,
    team_b_score: row.team_b_score,
  };
}

/* ------------------------------------------------------------------ */
/* 4. deleteSet — mirrors Game.tsx handleDeleteSet :429-439            */
/* ------------------------------------------------------------------ */

/**
 * Delete an extra set only. Mirrors the web guard (`setNumber <= 5` is a
 * no-op) by refusing to delete any of the 5 base sets (game_number <= 5).
 */
export async function deleteSet(matchId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: match, error: fetchError } = await supabase
    .from("matches")
    .select("game_number")
    .eq("id", matchId)
    .single();
  if (fetchError) throw fetchError;
  if (!match || (match as Tables<"matches">).game_number <= 5) {
    // Base sets are never deletable (web guard). No-op, matching the web.
    return;
  }
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* 5. deleteMatchDay — mirrors Game.tsx handleDeleteMatch :443-457     */
/* ------------------------------------------------------------------ */

export async function deleteMatchDay(matchDayId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("match_days")
    .delete()
    .eq("id", matchDayId);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* 6. createMatchDay — mirrors NewGame :406-561 / EventDetail :780-823 */
/* ------------------------------------------------------------------ */

/**
 * Insert sequence: match_day, then 5 base matches (game_number 1-5), then the
 * game_players roster. `original_team_name` mirrors `team_name` and
 * `manually_adjusted` is false at creation (positions come pre-assigned).
 * Returns the inserted match_day row (caller navigates with `.id`).
 */
export async function createMatchDay(
  input: CreateMatchDayInput
): Promise<Tables<"match_days">> {
  const supabase = getSupabaseClient();

  // 1. match_day (NewGame :406-416, EventDetail :784-796)
  const { data: matchDay, error: mdError } = await supabase
    .from("match_days")
    .insert({
      date: input.date,
      created_by: input.createdBy,
      club_id: input.clubId,
      team_generated: true,
      location_id: input.locationId ?? null,
      planned_event_id: input.plannedEventId ?? null,
      ...(input.isOpponentMode
        ? {
            is_opponent_mode: true,
            opponent_team_name: input.opponentTeamName ?? null,
          }
        : {}),
    })
    .select()
    .single();
  if (mdError) throw mdError;
  const md = matchDay as Tables<"match_days">;

  // 2. 5 base sets (NewGame :424-435, EventDetail :800-808)
  const matches = Array.from({ length: 5 }, (_, i) => ({
    match_day_id: md.id,
    game_number: i + 1,
    team_a_score: 0,
    team_b_score: 0,
    added_by_user_id: input.createdBy,
  }));
  const { error: mError } = await supabase
    .from("matches")
    .insert(matches)
    .select();
  if (mError) throw mError;

  // 3. game_players (NewGame :540-561, EventDetail :810-820)
  const allGamePlayers = input.gamePlayers.map((gp) => ({
    match_day_id: md.id,
    player_id: gp.player_id,
    team_name: gp.team_name,
    original_team_name: gp.team_name,
    manually_adjusted: false,
    position_played: gp.position_played,
  }));
  const { error: gpError } = await supabase
    .from("game_players")
    .insert(allGamePlayers);
  if (gpError) throw gpError;

  return md;
}

/* ------------------------------------------------------------------ */
/* 7. createSameTeams — mirrors Game.tsx handleCreateSameTeams :461-506 */
/* ------------------------------------------------------------------ */

/**
 * Create a fresh game (today's date) copying the roster of an existing match
 * day. `createdBy` is the acting user (Game.tsx uses `user.id`).
 */
export async function createSameTeams(
  matchDayId: string,
  createdBy: string
): Promise<Tables<"match_days">> {
  const supabase = getSupabaseClient();

  // Source match_day meta (Game.tsx reads these off matchData)
  const { data: source, error: srcError } = await supabase
    .from("match_days")
    .select(
      "club_id, location_id, is_opponent_mode, opponent_team_name"
    )
    .eq("id", matchDayId)
    .single();
  if (srcError) throw srcError;
  const src = source as Pick<
    Tables<"match_days">,
    "club_id" | "location_id" | "is_opponent_mode" | "opponent_team_name"
  >;

  // Source roster (Game.tsx copies from matchData.game_players)
  const { data: sourcePlayers, error: spError } = await supabase
    .from("game_players")
    .select("player_id, team_name, position_played")
    .eq("match_day_id", matchDayId);
  if (spError) throw spError;
  const roster = (sourcePlayers ?? []) as Array<
    Pick<Tables<"game_players">, "player_id" | "team_name" | "position_played">
  >;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // 1. new match_day (Game.tsx :464-476)
  const { data: matchDay, error: mdError } = await supabase
    .from("match_days")
    .insert({
      date: dateStr,
      created_by: createdBy,
      club_id: src.club_id,
      team_generated: true,
      location_id: src.location_id,
      is_opponent_mode: src.is_opponent_mode,
      opponent_team_name: src.opponent_team_name,
    })
    .select()
    .single();
  if (mdError) throw mdError;
  const md = matchDay as Tables<"match_days">;

  // 2. 5 base sets (Game.tsx :479-487)
  const matches = Array.from({ length: 5 }, (_, i) => ({
    match_day_id: md.id,
    game_number: i + 1,
    team_a_score: 0,
    team_b_score: 0,
    added_by_user_id: createdBy,
  }));
  const { error: mError } = await supabase
    .from("matches")
    .insert(matches)
    .select();
  if (mError) throw mError;

  // 3. copied game_players (Game.tsx :489-497)
  const gamePlayersToInsert = roster.map((gp) => ({
    match_day_id: md.id,
    player_id: gp.player_id,
    team_name: gp.team_name,
    original_team_name: gp.team_name,
    manually_adjusted: false,
    position_played: gp.position_played,
  }));
  const { error: gpError } = await supabase
    .from("game_players")
    .insert(gamePlayersToInsert);
  if (gpError) throw gpError;

  return md;
}

/* ------------------------------------------------------------------ */
/* 8. updateGamePlayers — mirrors EditGame handleSave :812-892         */
/* ------------------------------------------------------------------ */

/**
 * Replace the roster for a match day (delete-all + insert). Every inserted row
 * is `manually_adjusted: true` with adjustment metadata (EditGame semantics).
 * Optionally updates match_days.date/location_id, then flags the match day as
 * modified via the existing markModifiedBy RPC.
 */
export async function updateGamePlayers(
  matchDayId: string,
  assignments: GamePlayerAssignment[],
  opts: UpdateGamePlayersOptions = {}
): Promise<void> {
  const supabase = getSupabaseClient();

  // Delete existing roster (EditGame :827-836)
  const { error: deleteError } = await supabase
    .from("game_players")
    .delete()
    .eq("match_day_id", matchDayId);
  if (deleteError) throw deleteError;

  // Insert updated roster (EditGame :838-877)
  const now = new Date().toISOString();
  const allPlayers = assignments.map((a) => ({
    match_day_id: matchDayId,
    player_id: a.player_id,
    team_name: a.team_name,
    position_played: a.position_played,
    order_index: a.order_index,
    manually_adjusted: true,
    adjusted_by: opts.adjustedBy ?? null,
    adjusted_at: now,
    adjustment_reason: "Manual team edit",
  }));
  const { error: insertError } = await supabase
    .from("game_players")
    .insert(allPlayers);
  if (insertError) throw insertError;

  // Optionally update match day date/location (EditGame :879-892)
  if (opts.date !== undefined || opts.locationId !== undefined) {
    const patch: { date?: string; location_id?: string | null } = {};
    if (opts.date !== undefined) patch.date = opts.date;
    if (opts.locationId !== undefined) patch.location_id = opts.locationId;
    const { error: updateError } = await supabase
      .from("match_days")
      .update(patch)
      .eq("id", matchDayId);
    if (updateError) throw updateError;
  }

  // Flag as modified (EditGame calls markModifiedBy across its save handlers)
  await markModifiedBy(matchDayId);
}

/* ------------------------------------------------------------------ */
/* 9. fetchClubLocations — canonical saved-locations lookup            */
/* ------------------------------------------------------------------ */

/** A saved club location (mirrors the web EventLocationSelector select shape). */
export interface ClubLocation {
  id: string;
  name: string;
  address: string | null;
}

/**
 * Saved locations for a club, ordered by name. Canonical version of the local
 * helper previously in apps/mobile/app/games/new.tsx.
 */
export async function fetchClubLocations(
  clubId: string
): Promise<ClubLocation[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, address")
    .eq("club_id", clubId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ClubLocation[];
}

/* ------------------------------------------------------------------ */
/* 10. updateMatchDayLocation — patch a match day's location           */
/* ------------------------------------------------------------------ */

/**
 * Update a match day's saved location, then flag it as modified via the shared
 * markModifiedBy RPC (same as the other EditGame write paths).
 */
export async function updateMatchDayLocation(
  matchDayId: string,
  locationId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("match_days")
    .update({ location_id: locationId })
    .eq("id", matchDayId);
  if (error) throw error;
  await markModifiedBy(matchDayId);
}

/* ------------------------------------------------------------------ */
/* 11. getGameStartPlayers — wraps RPC (EventDetail :898)              */
/* ------------------------------------------------------------------ */

/**
 * SECURITY DEFINER RPC returning the roster to seed a game from a planned
 * event (attendees + positions + club memberships). Mirrors the inline call
 * in apps/web EventDetail.tsx handleStartGame.
 */
export async function getGameStartPlayers(
  eventId: string
): Promise<GameStartPlayer[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_game_start_players", {
    p_event_id: eventId,
  });
  if (error) throw error;
  return (data ?? []) as GameStartPlayer[];
}

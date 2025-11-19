import { supabase } from "./client";

export interface PlayerData {
  first_name: string;
  last_name: string;
  bio?: string;
  image_url?: string;
  skill_rating?: number;
  primary_position?: string;
  secondary_positions?: string[];
  member_association?: boolean;
  gender?: "male" | "female" | "other" | "diverse";
  birthday?: string | Date; // Updated to allow both string and Date
}

export async function createPlayer(userId: string, playerData: PlayerData) {
  // Format birthday as ISO string if it's a Date object
  const formattedBirthday =
    playerData.birthday instanceof Date
      ? playerData.birthday.toISOString().split("T")[0]
      : playerData.birthday;

  //console. log("userId", userId);
  //console. log("auth.uid", (await supabase.auth.getUser()).data.user?.id);

  // First create the player
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      user_id: userId,
      first_name: playerData.first_name,
      last_name: playerData.last_name,
      bio: playerData.bio,
      image_url: playerData.image_url,
      skill_rating: playerData.skill_rating || 5,
      gender: playerData.gender || "other",
      birthday: formattedBirthday, // Use the formatted birthday
    })
    .select()
    .single();

  if (playerError) {
    console.error("Error creating player:", playerError);
    throw playerError;
  }

  // Add primary position if provided
  if (playerData.primary_position) {
    const { error: primaryPositionError } = await supabase
      .from("player_positions")
      .insert({
        player_id: player.id,
        position_id: playerData.primary_position,
        is_primary: true,
      });

    if (primaryPositionError) {
      console.error("Error adding primary position:", primaryPositionError);
      throw primaryPositionError;
    }
  }

  // Add secondary positions if provided
  if (
    playerData.secondary_positions &&
    playerData.secondary_positions.length > 0
  ) {
    const positionInserts = playerData.secondary_positions.map(
      (positionId) => ({
        player_id: player.id,
        position_id: positionId,
        is_primary: false,
      })
    );

    const { error: secondaryPositionsError } = await supabase
      .from("player_positions")
      .insert(positionInserts);

    if (secondaryPositionsError) {
      console.error(
        "Error adding secondary positions:",
        secondaryPositionsError
      );
      throw secondaryPositionsError;
    }
  }

  return player;
}

export async function getPlayerByUserId(userId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(
      `
      *,
      player_positions (
        id,
        position_id,
        is_primary,
        positions (
          id,
          name
        )
      )
    `
    )
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching player:", error);
    throw error;
  }

  return data;
}

export async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select(`
      *,
      player_positions (
        id,
        position_id,
        is_primary,
        positions (
          id,
          name
        )
      )
    `);

  if (error) {
    console.error("Error fetching players:", error);
    throw error;
  }

  return data;
}

export async function updatePlayer(
  playerId: string,
  playerData: Partial<PlayerData>
) {
  // Format birthday as ISO string if it's a Date object
  const formattedBirthday =
    playerData.birthday instanceof Date
      ? playerData.birthday.toISOString().split("T")[0]
      : playerData.birthday;

  const { data, error } = await supabase
    .from("players")
    .update({
      first_name: playerData.first_name,
      last_name: playerData.last_name,
      bio: playerData.bio,
      image_url: playerData.image_url,
      skill_rating: playerData.skill_rating,
      gender: playerData.gender,
      birthday: formattedBirthday, // Use the formatted birthday
    })
    .eq("id", playerId)
    .select()
    .single();

  if (error) {
    console.error("Error updating player:", error);
    throw error;
  }

  return data;
}

export async function updatePlayerPositions(
  playerId: string,
  primaryPositionId: string,
  secondaryPositionIds: string[]
) {
  // First delete existing positions
  const { error: deleteError } = await supabase
    .from("player_positions")
    .delete()
    .eq("player_id", playerId);

  if (deleteError) {
    console.error("Error deleting player positions:", deleteError);
    throw deleteError;
  }

  // Add primary position
  const { error: primaryError } = await supabase
    .from("player_positions")
    .insert({
      player_id: playerId,
      position_id: primaryPositionId,
      is_primary: true,
    });

  if (primaryError) {
    console.error("Error adding primary position:", primaryError);
    throw primaryError;
  }

  // Add secondary positions
  if (secondaryPositionIds.length > 0) {
    const positionInserts = secondaryPositionIds.map((positionId) => ({
      player_id: playerId,
      position_id: positionId,
      is_primary: false,
    }));

    const { error: secondaryError } = await supabase
      .from("player_positions")
      .insert(positionInserts);

    if (secondaryError) {
      console.error("Error adding secondary positions:", secondaryError);
      throw secondaryError;
    }
  }

  return true;
}

/**
 * =======================
 * Guest helpers (per-club)
 * =======================
 */

/**
 * Minimal shape we need for guests coming from `players`.
 * Intentionally small and decoupled from the full DB row type.
 */
export interface GuestPlayerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Returns a guest Player row for (clubId, firstName, lastName).
 * Reuses existing guest if present; creates a new guests+players pair otherwise.
 *
 * Requirements:
 * - DB has table `guests` and function `create_or_reuse_guest` as defined in migrations.
 */
export async function createOrReuseGuestByName(
  clubId: string,
  firstNameRaw: string,
  lastNameRaw: string
): Promise<GuestPlayerRow> {
  const p_first_name = firstNameRaw.trim();
  const p_last_name = lastNameRaw.trim();

  // 1) Ask the server to create or reuse and give us the players.id
  const { data: playerId, error: rpcErr } = await supabase.rpc(
    "create_or_reuse_guest",
    {
      p_club_id: clubId,
      p_first_name,
      p_last_name,
    }
  );

  if (rpcErr) {
    console.error("create_or_reuse_guest RPC failed:", rpcErr);
    throw rpcErr;
  }

  // 2) Fetch and return the minimal player row we care about
  const { data, error } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .eq("id", playerId as string)
    .single();

  if (error) {
    console.error("Failed to load guest player row:", error);
    throw error;
  }

  return data as GuestPlayerRow;
}

/**
 * Get the last position_played for a player in a given club.
 *
 * Logic:
 *  1) Find all match_days for this club.
 *  2) Look at game_players rows for this player where match_day_id is in that set.
 *  3) Return the position_played from the most recently created row.
 *
 * Returns:
 *  - string (e.g., "setter", "middle") if found
 *  - null if no previous position is recorded
 */
export async function getLastPositionForPlayerInClub(
  clubId: string,
  playerId: string
): Promise<string | null> {
  // 1) Find all match_day ids for this club
  const { data: matchDays, error: mdErr } = await supabase
    .from("match_days")
    .select("id")
    .eq("club_id", clubId);

  if (mdErr) {
    console.error("Failed to load match_days for club:", mdErr);
    return null;
  }

  if (!matchDays || matchDays.length === 0) {
    return null;
  }

  const matchDayIds = matchDays.map((md) => md.id as string);

  // 2) Find the most recent game_players row for this player in those match_days
  const { data: gpRow, error: gpErr } = await supabase
    .from("game_players")
    .select("position_played, created_at")
    .eq("player_id", playerId)
    .in("match_day_id", matchDayIds)
    .not("position_played", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (gpErr) {
    console.error("Failed to load last position for player:", gpErr);
    return null;
  }

  if (!gpRow || !gpRow.position_played) {
    return null;
  }

  return gpRow.position_played as string;
}

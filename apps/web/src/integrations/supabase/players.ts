import { supabase } from "./client";
import type { Database } from "./types";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

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

export type GuestSummary = {
  player_id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  reused_at: string | null;
};

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

// --- Guest helpers ---

/**
 * Create or reuse a guest player for a given club + name.
 * Uses the create_or_reuse_guest RPC, which:
 * - normalizes the name
 * - looks up an existing guests row for (club_id, name)
 * - reuses it if found
 * - otherwise creates a new players + guests row
 */
export async function createOrReuseGuestByName(
  clubId: string,
  firstName: string,
  lastName: string,
  opts?: { skill_rating?: number; gender?: string }
): Promise<PlayerRow> {
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();

  const { data, error } = await supabase
    .rpc("create_or_reuse_guest", {
      p_club_id: clubId,
      p_first_name: trimmedFirst,
      p_last_name: trimmedLast,
      p_skill_rating: opts?.skill_rating ?? 5,
      p_gender: opts?.gender ?? "other",
    })
    .single();

  if (error) {
    console.error("createOrReuseGuestByName RPC error:", error);
    throw error;
  }

  return data as PlayerRow;
}

/**
 * Get the last position this player has played in this club,
 * based on game_players history joined via match_days.club_id.
 */
export async function getLastPositionForPlayerInClub(
  clubId: string,
  playerId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("game_players")
    .select(
      `
      position_played,
      match_days!inner (
        club_id
      )
    `
    )
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(20); // small safety margin

  if (error) {
    console.error("getLastPositionForPlayerInClub error:", error);
    throw error;
  }

  if (!data || !data.length) return null;

  // Filter for this club and keep the first non-null position
  for (const row of data as {
    position_played: string | null;
    match_days: { club_id: string } | null;
  }[]) {
    if (row.match_days?.club_id === clubId && row.position_played) {
      return row.position_played;
    }
  }

  return null;
}

/**
 * Fetch all guests for a given club, joined with their players row.
 * Used for guest autocomplete in NewGame and PlayersEditModal.
 */
export async function getGuestsForClub(
  clubId: string
): Promise<GuestSummary[]> {
  if (!clubId) return [];

  const { data, error } = await supabase
    .from("guests")
    .select(
      `
      player_id,
      created_at,
      reused_at,
      players!inner (
        first_name,
        last_name
      )
    `
    )
    .eq("club_id", clubId)
    .order("reused_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching guests for club:", error);
    throw error;
  }

  const rows = (data ?? []) as {
    player_id: string;
    created_at: string;
    reused_at: string | null;
    players: { first_name: string | null; last_name: string | null };
  }[];

  return rows.map((row) => ({
    player_id: row.player_id,
    first_name: row.players.first_name ?? "Guest",
    last_name: row.players.last_name ?? "Player",
    created_at: row.created_at,
    reused_at: row.reused_at,
  }));
}

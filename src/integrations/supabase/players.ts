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
      member_association: playerData.member_association || false,
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

import { supabase } from "@/integrations/supabase/client";
import { PlayerWithPositions } from "./types";

// Define the raw data structure we get from Supabase
interface RawPlayerData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  skill_rating: number | null;
  height_cm: number | null;
  gender: string;
  is_active: boolean;
  club_id: string | null;
  player_positions: Array<{
    position_id: string;
    is_primary: boolean;
    positions: {
      id: string;
      name: string;
    } | null;
  }> | null;
}

export const getPlayersWithPositions = async (
  clubId: string
): Promise<PlayerWithPositions[]> => {
  const { data, error } = await supabase
    .from("players")
    .select(
      `
      id,
      user_id,
      first_name,
      last_name,
      skill_rating,
      height_cm,
      gender,
      is_active,
      club_id,
      player_positions!inner (
        position_id,
        is_primary,
        positions!inner (
          id,
          name
        )
      )
    `
    )
    .eq("club_id", clubId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching players:", error);
    throw error;
  }

  if (!data) {
    return [];
  }

  // Transform the data to match our interface
  return data
    .map((player) => {
      // Type assertion for the nested data we know exists due to !inner joins
      const typedPlayer = player as unknown as RawPlayerData;
      const positionData = typedPlayer.player_positions || [];
      const primaryPosition = positionData.find(
        (p) => p.is_primary && p.positions
      );
      const secondaryPositions = positionData.filter(
        (p) => !p.is_primary && p.positions
      );

      // Create the transformed player object
      const transformedPlayer: PlayerWithPositions = {
        // Database fields
        id: typedPlayer.id,
        user_id: typedPlayer.user_id,
        first_name: typedPlayer.first_name,
        last_name: typedPlayer.last_name,
        skill_rating: typedPlayer.skill_rating || 5,
        height_cm: typedPlayer.height_cm || undefined,
        gender: typedPlayer.gender as "male" | "female" | "other",
        is_active: typedPlayer.is_active,
        club_id: typedPlayer.club_id || undefined,

        // Position relationships (renamed to avoid conflict)
        playerPositions: positionData
          .filter((p) => p.positions)
          .map((p) => ({
            player_id: typedPlayer.id,
            position_id: p.position_id,
            is_primary: p.is_primary,
            position: p.positions!,
          })),

        primaryPosition: primaryPosition
          ? {
              player_id: typedPlayer.id,
              position_id: primaryPosition.position_id,
              is_primary: true,
              position: primaryPosition.positions!,
            }
          : {
              player_id: typedPlayer.id,
              position_id: "",
              is_primary: true,
              position: { id: "", name: "Unknown" },
            },

        secondaryPositions: secondaryPositions.map((p) => ({
          player_id: typedPlayer.id,
          position_id: p.position_id,
          is_primary: false,
          position: p.positions!,
        })),

        // Compatibility fields for existing components
        name: `${typedPlayer.first_name} ${typedPlayer.last_name}`,
        preferredPosition: primaryPosition?.positions?.name || "Unknown",
        skillRating: typedPlayer.skill_rating || 5,
        availability: typedPlayer.is_active,

        // Mock compatibility fields (string array for existing components)
        email: `${typedPlayer.first_name?.toLowerCase()}.${typedPlayer.last_name?.toLowerCase()}@example.com`,
        positions: primaryPosition ? [primaryPosition.positions.name] : [], // This is string[]
        matchesPlayed: 0,
        isPublic: true,
      };

      return transformedPlayer;
    })
    .filter(
      (player) =>
        player.primaryPosition &&
        player.primaryPosition.position.name !== "Unknown"
    );
};

export const getPositions = async () => {
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching positions:", error);
    throw error;
  }

  return data || [];
};

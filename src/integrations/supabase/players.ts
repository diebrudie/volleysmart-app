
import { supabase } from "./client";

export interface PlayerData {
  first_name: string;
  last_name: string;
  bio?: string;
  image_url?: string;
  skill_rating?: number;
  positions?: string[];
}

export async function createPlayer(userId: string, playerData: PlayerData) {
  // First create the player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      user_id: userId,
      first_name: playerData.first_name,
      last_name: playerData.last_name,
      bio: playerData.bio,
      image_url: playerData.image_url,
      skill_rating: playerData.skill_rating || 5
    })
    .select()
    .single();
    
  if (playerError) {
    console.error("Error creating player:", playerError);
    throw playerError;
  }
  
  // If positions are provided, add them to player_positions
  if (playerData.positions && playerData.positions.length > 0) {
    const positionInserts = playerData.positions.map(positionId => ({
      player_id: player.id,
      position_id: positionId
    }));
    
    const { error: positionsError } = await supabase
      .from('player_positions')
      .insert(positionInserts);
      
    if (positionsError) {
      console.error("Error adding player positions:", positionsError);
      throw positionsError;
    }
  }
  
  return player;
}

export async function getPlayerByUserId(userId: string) {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      player_positions (
        id,
        position_id,
        positions (
          id,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .single();
    
  if (error) {
    console.error("Error fetching player:", error);
    throw error;
  }
  
  return data;
}

export async function getAllPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      player_positions (
        id,
        position_id,
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

export async function updatePlayer(playerId: string, playerData: Partial<PlayerData>) {
  const { data, error } = await supabase
    .from('players')
    .update({
      first_name: playerData.first_name,
      last_name: playerData.last_name,
      bio: playerData.bio,
      image_url: playerData.image_url,
      skill_rating: playerData.skill_rating
    })
    .eq('id', playerId)
    .select()
    .single();
    
  if (error) {
    console.error("Error updating player:", error);
    throw error;
  }
  
  return data;
}

export async function updatePlayerPositions(playerId: string, positionIds: string[]) {
  // First delete existing positions
  const { error: deleteError } = await supabase
    .from('player_positions')
    .delete()
    .eq('player_id', playerId);
    
  if (deleteError) {
    console.error("Error deleting player positions:", deleteError);
    throw deleteError;
  }
  
  // Then add new positions
  if (positionIds.length > 0) {
    const positionInserts = positionIds.map(positionId => ({
      player_id: playerId,
      position_id: positionId
    }));
    
    const { error: insertError } = await supabase
      .from('player_positions')
      .insert(positionInserts);
      
    if (insertError) {
      console.error("Error adding player positions:", insertError);
      throw insertError;
    }
  }
  
  return true;
}

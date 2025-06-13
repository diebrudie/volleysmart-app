
import { supabase } from './client';

export const getPlayersByClub = async (clubId: string) => {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      player_positions (
        is_primary,
        positions (
          id,
          name
        )
      )
    `)
    .eq('club_id', clubId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching players:', error);
    throw error;
  }

  return data;
};

export const createPlayer = async (playerData: {
  first_name: string;
  last_name: string;
  gender: string;
  birthday?: string;
  bio?: string;
  skill_rating?: number;
  member_association: boolean;
  club_id: string;
  user_id: string;
}) => {
  const { data, error } = await supabase
    .from('players')
    .insert(playerData)
    .select()
    .single();

  if (error) {
    console.error('Error creating player:', error);
    throw error;
  }

  return data;
};

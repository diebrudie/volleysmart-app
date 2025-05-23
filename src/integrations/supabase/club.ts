
import { supabase } from './client';

/**
 * Creates a club admin record for a given club and user
 */
export const addClubAdmin = async (clubId: string, userId: string): Promise<void> => {
  try {
    // Directly insert the club member with admin role
    const { error } = await supabase
      .from('club_members')
      .insert({
        club_id: clubId,
        user_id: userId,
        role: 'admin'
      });
    
    if (error) {
      console.error('Error adding club admin:', error);
      throw error;
    }
    
    console.log('Successfully added user as admin to club');
  } catch (error) {
    console.error('Error in addClubAdmin function:', error);
    throw error;
  }
};

/**
 * Checks if storage bucket exists and creates if it doesn't
 */
export const ensureClubAdminRpcExists = async (): Promise<void> => {
  // This function is now deprecated as we're directly inserting into the club_members table
  console.log('Using direct club_members insert instead of RPC function');
  return;
};

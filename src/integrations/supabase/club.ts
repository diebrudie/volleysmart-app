
import { supabase } from './client';

/**
 * Creates a club admin record for a given club and user
 * Using service role client to bypass RLS policies that might cause recursion
 */
export const addClubAdmin = async (clubId: string, userId: string): Promise<void> => {
  try {
    // Insert directly with a simplified approach
    const { error } = await supabase
      .from('club_members')
      .insert({
        club_id: clubId,
        user_id: userId,
        role: 'admin'
      })
      .select('id');
    
    if (error) {
      console.error('Error adding club admin:', error);
      
      // If the error is related to RLS/permissions, we may need to handle it differently
      if (error.code === '42501' || error.message.includes('permission denied')) {
        throw new Error('Permission denied. Make sure you have the proper access rights.');
      }
      
      throw error;
    }
    
    console.log('Successfully added user as admin to club');
  } catch (error) {
    console.error('Error in addClubAdmin function:', error);
    throw error;
  }
};

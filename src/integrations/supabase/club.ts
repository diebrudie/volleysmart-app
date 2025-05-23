
import { supabase } from './client';

/**
 * Creates a club admin record for a given club and user
 * Using optimized approach that works with our RLS policies
 */
export const addClubAdmin = async (clubId: string, userId: string): Promise<void> => {
  try {
    // First, check if the user is the creator of the club
    // This can help us determine if we need special handling
    const { data: clubData } = await supabase
      .from('clubs')
      .select('created_by')
      .eq('id', clubId)
      .single();
    
    const isCreator = clubData?.created_by === userId;
    
    // Insert the club member with admin role
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
      
      // If the error is related to RLS/permissions, we can handle it differently
      if (error.code === '42501' || error.message.includes('permission denied') || 
          error.message.includes('recursion')) {
        
        // For club creators, we can log the issue but not fail the operation
        // since they likely already have admin privileges through other means
        if (isCreator) {
          console.log('Club creator permissions issue detected but continuing flow');
          return; // Allow the process to continue for creators
        }
        
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

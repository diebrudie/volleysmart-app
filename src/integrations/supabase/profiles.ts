
import { supabase } from "./client";
import { User } from "@supabase/supabase-js";
import { UserRole } from "@/types/supabase";

// Function to create a user profile in the user_profiles table
export async function createUserProfile(user: User, role: UserRole = 'user') {
  try {
    // First check if the profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (existingProfile) {
      console.log("Profile already exists for user:", user.id);
      return existingProfile;
    }
    
    // If not, create a new profile
    console.log("Creating new profile for user:", user.id);
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({ 
        id: user.id, 
        role,
        email: user.email 
      })
      .select()
      .single();
      
    if (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in createUserProfile:", error);
    throw error;
  }
}

// Function to get a user profile by user ID
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in getUserProfile:", error);
    throw error;
  }
}

// Function to update a user's role
export async function updateUserRole(userId: string, role: UserRole) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
      
    if (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in updateUserRole:", error);
    throw error;
  }
}

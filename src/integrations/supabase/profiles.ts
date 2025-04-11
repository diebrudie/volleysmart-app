
import { supabase } from "./client";
import { User } from "@supabase/supabase-js";
import { UserRole } from "@/types/supabase";

// Function to create a user profile in the user_profiles table
export async function createUserProfile(user: User, role: UserRole = 'user') {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({ id: user.id, role })
    .select()
    .single();
    
  if (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
  
  return data;
}

// Function to get a user profile by user ID
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
  
  return data;
}

// Function to update a user's role
export async function updateUserRole(userId: string, role: UserRole) {
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
}

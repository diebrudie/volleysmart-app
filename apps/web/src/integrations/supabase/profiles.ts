import { supabase } from "./client";
import { User } from "@supabase/supabase-js";

// Create a user profile (id + email is mirrored by triggers anyway; this is defensive)
export async function createUserProfile(user: User) {
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({ id: user.id }) // role removed
    .select()
    .single();

  if (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
  return data;
}

// Get current user's profile (owner-only SELECT policy)
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
  return data;
}

/**
 * updateUserRole — removed (no global roles in user_profiles)
 * Keeping an exported stub avoids breaking imports, but it will throw if called.
 */
export async function updateUserRole(): Promise<never> {
  throw new Error(
    "Global roles are removed. Use club-scoped roles via club_members."
  );
}

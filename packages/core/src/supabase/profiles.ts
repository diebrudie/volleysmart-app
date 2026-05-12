import { getSupabaseClient } from "./clientHolder";
import { User } from "@supabase/supabase-js";

export async function createUserProfile(user: User) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({ id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
  return data;
}

export async function getUserProfile(userId: string) {
  const supabase = getSupabaseClient();
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

export async function updateUserRole(): Promise<never> {
  throw new Error(
    "Global roles are removed. Use club-scoped roles via club_members."
  );
}

import { supabase } from "./client";

/**
 * Creates a club admin record for a given club and user
 * Now uses the updated RLS policies with security definer functions
 */
export const addClubAdmin = async (
  clubId: string,
  userId: string
): Promise<void> => {
  try {
    //console. log(`Adding user ${userId} as admin to club ${clubId}`);

    // First, check if the user exists in the club_members table
    const { data: existingMember, error: checkError } = await supabase
      .from("club_members")
      .select("id, role")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing membership:", checkError);
      throw checkError;
    }

    if (existingMember) {
      // User is already a member, update their role to admin
      //console. log('User is already a member, updating role to admin');

      const { error: updateError } = await supabase
        .from("club_members")
        .update({ role: "admin" })
        .eq("id", existingMember.id);

      if (updateError) {
        console.error("Error updating role to admin:", updateError);
        throw updateError;
      }

      //console. log('Successfully updated user role to admin');
      return;
    }

    // User is not a member yet, create new admin record
    const { error: insertError } = await supabase.from("club_members").insert({
      club_id: clubId,
      user_id: userId,
      role: "admin",
    });

    if (insertError) {
      console.error("Error adding club admin:", insertError);

      if (insertError.code === "23505") {
        // Unique violation - race condition where member was added in parallel
        //console. log('User was added as member in parallel, updating to admin instead');

        // Try to update instead
        const { error: retryError } = await supabase
          .from("club_members")
          .update({ role: "admin" })
          .eq("club_id", clubId)
          .eq("user_id", userId);

        if (retryError) {
          throw retryError;
        }

        //console. log('Successfully updated parallel-added user to admin role');
        return;
      }

      throw insertError;
    }

    //console. log('Successfully added user as admin to club');
  } catch (error) {
    console.error("Error in addClubAdmin function:", error);
    throw error;
  }
};

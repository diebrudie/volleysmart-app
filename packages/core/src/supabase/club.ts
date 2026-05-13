import { getSupabaseClient } from "./clientHolder";
import { fetchMemberRowBasic } from "./clubMembers";

export const addClubAdmin = async (
  clubId: string,
  userId: string
): Promise<void> => {
  const supabase = getSupabaseClient();
  try {
    const existingMember = await fetchMemberRowBasic(userId, clubId);

    if (existingMember) {
      const { error: updateError } = await supabase
        .from("club_members")
        .update({ role: "admin" })
        .eq("id", existingMember.id);

      if (updateError) {
        console.error("Error updating role to admin:", updateError);
        throw updateError;
      }
      return;
    }

    const { error: insertError } = await supabase.from("club_members").insert({
      club_id: clubId,
      user_id: userId,
      role: "admin",
    });

    if (insertError) {
      console.error("Error adding club admin:", insertError);

      if (insertError.code === "23505") {
        const { error: retryError } = await supabase
          .from("club_members")
          .update({ role: "admin" })
          .eq("club_id", clubId)
          .eq("user_id", userId);

        if (retryError) {
          throw retryError;
        }
        return;
      }

      throw insertError;
    }
  } catch (error) {
    console.error("Error in addClubAdmin function:", error);
    throw error;
  }
};

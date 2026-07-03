import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSupabaseClient,
  ensurePositionsExist,
  addClubAdmin,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

export type CreateClubInput = {
  name: string;
  description?: string;
  city?: string;
  imageUrl?: string | null;
  isDiscoverable: boolean;
};

/** 5-char club slug, same alphabet/length as apps/web NewClub.tsx. */
function generateClubIdentifier(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Creates a club (mirrors apps/web/src/pages/NewClub.tsx onSubmit):
 * ensures default positions exist, inserts the club row, and adds the
 * creator as admin. Resolves with the new club id.
 */
export function useCreateClub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, CreateClubInput>({
    mutationFn: async (input) => {
      if (!user?.id) throw new Error("Not logged in");

      await ensurePositionsExist();

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("clubs")
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          image_url: input.imageUrl ?? null,
          created_by: user.id,
          slug: generateClubIdentifier(),
          city: input.city?.trim() || null,
          country: null,
          country_code: null,
          is_club_discoverable: input.isDiscoverable,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("Failed to create club");

      try {
        await addClubAdmin(data.id, user.id);
      } catch (adminError) {
        // Web does the same: club creation succeeds even if the admin
        // row insert races (creator still owns the club via created_by).
        console.error("Error adding user as admin:", adminError);
      }

      return data.id;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.clubs.mine(user?.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allDiscover }),
      ]);
    },
  });
}

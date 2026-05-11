import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PREMIUM_USER_IDS = [
  "c5e52ccc-1412-4b24-8e42-4f955b007d13",
  "910664da-f822-4c50-bf25-c3af7a5b2de9",
];

export function usePremium(): { isPremium: boolean; isLoading: boolean } {
  const { user } = useAuth();

  const { data: isEarlyAdopter, isLoading } = useQuery({
    queryKey: ["early-adopter", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("players")
        .select("is_early_adopter")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.is_early_adopter === true;
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });

  if (PREMIUM_USER_IDS.includes(user?.id ?? "")) {
    return { isPremium: true, isLoading: false };
  }

  return { isPremium: !!isEarlyAdopter, isLoading };
}

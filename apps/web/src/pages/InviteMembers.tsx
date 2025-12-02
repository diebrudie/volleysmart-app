import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useClub } from "@/contexts/ClubContext";
import CopyableClubId from "@/components/clubs/CopyableClubId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClubInviteSharePanel } from "@/components/clubs/ClubInviteSharePanel";

/**
 * InviteMembers
 *
 * Onboarding step to invite members to a club.
 * This screen now:
 * - Shows a centered Club ID (CopyableClubId) with a title above
 * - Displays share buttons for WhatsApp, Telegram and Messenger
 * - Lets the user skip and go to the dashboard
 */

const InviteMembers = () => {
  const { clubId } = useClub();
  const navigate = useNavigate();

  const { data: clubMeta } = useQuery({
    queryKey: ["clubMeta", clubId],
    queryFn: async () => {
      if (!clubId) return null;
      const { data, error } = await supabase
        .from("clubs")
        .select("name, slug")
        .eq("id", clubId)
        .single();
      if (error) throw error;
      return data as { name: string; slug: string };
    },
    enabled: !!clubId,
  });

  const handleSkip = () => {
    if (clubId) {
      navigate(`/dashboard/${clubId}`);
    } else {
      navigate("/clubs");
    }
  };

  const joinCode = clubMeta?.slug ?? "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">
          Invite your friends to your club
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Share your Club ID with your teammates so they can join your club. You
          can always do this later from the Members page.
        </p>

        <div className="flex justify-center">
          {joinCode ? (
            <ClubInviteSharePanel joinCode={joinCode} />
          ) : (
            <span className="text-sm text-gray-500">Loading your Club ID…</span>
          )}
        </div>

        <div className="flex justify-between mt-10">
          <Button type="button" variant="action" onClick={handleSkip}>
            Skip for now
          </Button>

          <Button type="button" variant="primary" onClick={handleSkip}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InviteMembers;

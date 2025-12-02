import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useClub } from "@/contexts/ClubContext";
import { ClubInviteSharePanel } from "@/components/clubs/ClubInviteSharePanel";

interface ClubMeta {
  name: string;
  slug: string;
}

const InviteMembers = () => {
  const navigate = useNavigate();

  // Read clubId from URL if present, otherwise from context
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const { clubId: contextClubId, setClubId } = useClub();

  const clubId = urlClubId || contextClubId;

  // Keep ClubContext in sync with URL
  useEffect(() => {
    if (urlClubId && urlClubId !== contextClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, contextClubId, setClubId]);

  // Fetch club info to get the joinCode / slug
  const {
    data: clubMeta,
    isLoading: isClubLoading,
    error: clubError,
  } = useQuery<ClubMeta | null>({
    queryKey: ["inviteMembersClubMeta", clubId],
    queryFn: async () => {
      if (!clubId) return null;

      const { data, error } = await supabase
        .from("clubs")
        .select("name, slug")
        .eq("id", clubId)
        .single();

      if (error) {
        // Surface in React Query error boundary + fallback message below
        throw error;
      }

      return data as ClubMeta;
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

  const handleGoToDashboard = () => {
    if (clubId) {
      navigate(`/dashboard/${clubId}`);
    } else {
      navigate("/clubs");
    }
  };

  const renderShareSection = () => {
    if (clubMeta?.slug) {
      return (
        <div className="flex justify-center">
          <ClubInviteSharePanel joinCode={clubMeta.slug} />
        </div>
      );
    }

    if (isClubLoading) {
      return (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Loading your Club ID...
        </p>
      );
    }

    if (clubError || !clubId) {
      return (
        <p className="text-center text-sm text-red-500">
          We couldn&apos;t load your Club ID. Please go to your dashboard and
          try again.
        </p>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900">
      {/* Outer wrapper keeps card + buttons aligned and reduces top padding on mobile */}
      <div className="w-full max-w-2xl flex-1 flex flex-col justify-center px-4 pt-8 pb-10 md:pt-12">
        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">
            Invite your teammates to your club
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Share your Club ID with them so they can join your club.
          </p>

          {renderShareSection()}
        </div>

        {/* Buttons outside the card, aligned with card edges */}
        <div className="flex justify-between mt-6">
          <Button type="button" variant="action" onClick={handleSkip}>
            Skip for now
          </Button>

          <Button type="button" variant="primary" onClick={handleGoToDashboard}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InviteMembers;

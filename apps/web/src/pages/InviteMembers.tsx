import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useClub } from "@/contexts/ClubContext";
import { ClubInviteSharePanel } from "@/components/clubs/ClubInviteSharePanel";

interface ClubMeta {
  name: string;
}

const InviteMembers = () => {
  const { t } = useTranslation("clubs");
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

  // Fetch club info
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
        .select("name")
        .eq("id", clubId)
        .single();

      if (error) throw error;
      return data as ClubMeta;
    },
    enabled: !!clubId,
  });

  const handleGoToClub = () => {
    if (clubId) {
      navigate(`/clubs/${clubId}`, { replace: true });
    } else {
      navigate("/clubs", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-4 pt-8 pb-10 md:pt-12">
        <div className="w-full max-w-md">
          {/* Icon + heading */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {t("invite.heading")}
            </h2>
            <p className="text-muted-foreground">
              {clubMeta?.name
                ? t("invite.descriptionWithName", { name: clubMeta.name })
                : t("invite.descriptionGeneric")}
            </p>
          </div>

          {/* Share panel */}
          <div className="rounded-xl border bg-card p-5">
            {clubId ? (
              <ClubInviteSharePanel clubId={clubId} />
            ) : isClubLoading ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("invite.loadingLink")}
              </p>
            ) : clubError || !clubId ? (
              <p className="text-center text-sm text-destructive">
                {t("invite.loadError")}
              </p>
            ) : null}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 mt-8">
            <Button
              type="button"
              className="w-full"
              onClick={handleGoToClub}
            >
              {t("invite.goToClub")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleGoToClub}
            >
              {t("invite.skipForNow")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteMembers;

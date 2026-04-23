/**
 * JoinByLink — /join/:slug
 *
 * Public invite link handler:
 * - Unauthenticated: saves slug to localStorage, redirects to /signup
 * - Authenticated but not onboarded: saves slug, redirects to /players/onboarding
 * - Authenticated + onboarded: auto-creates pending join request, redirects to /home
 */
import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";

const PENDING_CLUB_JOIN_KEY = "pendingClubJoinSlug";

const JoinByLink = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasRun = useRef(false);

  useEffect(() => {
    if (isLoading || hasRun.current) return;
    if (!slug) {
      navigate("/home", { replace: true });
      return;
    }

    const trimmedSlug = slug.trim().toLowerCase();

    // Not authenticated — save slug and go to signup
    if (!isAuthenticated || !user) {
      localStorage.setItem(PENDING_CLUB_JOIN_KEY, trimmedSlug);
      navigate("/signup", { replace: true });
      return;
    }

    // Authenticated — check if onboarded, then try to join
    hasRun.current = true;

    const attemptJoin = async () => {
      // Check if player profile exists (onboarded)
      const { data: player } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!player) {
        // Not onboarded — save slug and redirect to onboarding
        localStorage.setItem(PENDING_CLUB_JOIN_KEY, trimmedSlug);
        navigate("/players/onboarding", { replace: true });
        return;
      }

      // Onboarded — attempt to join
      try {
        const { error: rpcErr } = await supabase.rpc("request_join_by_slug", {
          p_slug: trimmedSlug,
          p_member_association: false,
        });

        if (rpcErr) {
          const msg = String(rpcErr.message || "").toLowerCase();
          if (
            rpcErr.code === "23505" ||
            msg.includes("club_members_club_id_user_id_key")
          ) {
            toast({
              title: "Already requested",
              description:
                "You already have a pending request or are a member of this club.",
              duration: 2000,
            });
          } else if (msg.includes("club_not_found_or_deleted")) {
            toast({
              title: "Club not found",
              description: "This club doesn't exist or has been removed.",
              variant: "destructive",
              duration: 2000,
            });
          } else {
            toast({
              title: "Couldn't join",
              description: "Something went wrong. Please try again.",
              variant: "destructive",
              duration: 2000,
            });
          }
        } else {
          toast({
            title: "Request sent!",
            description:
              "Your join request was sent to the club admins.",
            duration: 2000,
          });
        }
      } catch {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
          duration: 2000,
        });
      }

      localStorage.removeItem(PENDING_CLUB_JOIN_KEY);
      navigate("/home", { replace: true });
    };

    void attemptJoin();
  }, [isLoading, isAuthenticated, user, slug, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner className="h-8 w-8" />
    </div>
  );
};

export default JoinByLink;

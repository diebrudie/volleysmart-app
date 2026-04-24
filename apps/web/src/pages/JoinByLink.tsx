/**
 * JoinByLink — /join/:slug
 *
 * Public invite link handler:
 * - Unauthenticated: saves slug to localStorage, redirects to /signup
 * - Authenticated but not onboarded: saves slug, redirects to /players/onboarding
 * - Authenticated + onboarded: shows club card with Join / Cancel buttons
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { buildImageUrl } from "@/utils/buildImageUrl";

const PENDING_CLUB_JOIN_KEY = "pendingClubJoinSlug";

interface ClubPreview {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  city: string | null;
  country: string | null;
  member_count: number;
}

const JoinByLink = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasRedirected = useRef(false);
  const [joining, setJoining] = useState(false);

  const trimmedSlug = slug?.trim().toLowerCase() ?? "";

  // Redirect unauthenticated / not-onboarded users
  useEffect(() => {
    if (isLoading || hasRedirected.current) return;
    if (!trimmedSlug) {
      navigate("/home", { replace: true });
      return;
    }

    if (!isAuthenticated || !user) {
      hasRedirected.current = true;
      localStorage.setItem(PENDING_CLUB_JOIN_KEY, trimmedSlug);
      navigate("/signup", { replace: true });
      return;
    }

    // Check if onboarded
    const checkOnboarding = async () => {
      const { data: player } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!player) {
        hasRedirected.current = true;
        localStorage.setItem(PENDING_CLUB_JOIN_KEY, trimmedSlug);
        navigate("/players/onboarding", { replace: true });
      }
    };

    void checkOnboarding();
  }, [isLoading, isAuthenticated, user, trimmedSlug, navigate]);

  // Fetch club preview via SECURITY DEFINER RPC (bypasses RLS)
  const {
    data: club,
    isLoading: clubLoading,
    error: clubError,
  } = useQuery({
    queryKey: ["club-preview-by-slug", trimmedSlug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_club_preview_by_slug", {
        p_slug: trimmedSlug,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as ClubPreview) ?? null;
    },
    enabled: !!trimmedSlug && isAuthenticated && !isLoading,
  });

  const handleJoin = async () => {
    if (!trimmedSlug) return;
    setJoining(true);

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
          description: "Your join request was sent to the club admins.",
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
    navigate("/clubs", { replace: true });
  };

  const handleCancel = () => {
    localStorage.removeItem(PENDING_CLUB_JOIN_KEY);
    toast({
      title: "Cancelled",
      description: "You can join a club anytime from the Clubs page.",
      duration: 2000,
    });
    navigate("/home", { replace: true });
  };

  // Show spinner while auth or club data is loading
  if (isLoading || clubLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Club not found
  if (!club || clubError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center px-4 pt-24 gap-4">
          <p className="text-lg font-semibold">Club not found</p>
          <p className="text-sm text-muted-foreground text-center">
            This invite link is invalid or the club has been removed.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/home", { replace: true })}
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const location = [club.city, club.country].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Content */}
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground mb-4">
          You've been invited to join this club. Send a request to the admins?
        </p>

        {/* Club card — same style as Clubs page */}
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          {/* Image */}
          <div className="aspect-[16/10] w-full bg-muted overflow-hidden">
            {club.image_url ? (
              <img
                src={buildImageUrl(club.image_url, { w: 720 })}
                alt={club.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {club.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <h3 className="text-base font-semibold text-foreground truncate mb-1">
              {club.name}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{location}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0" />
                {club.member_count}{" "}
                {club.member_count === 1 ? "member" : "members"}
              </span>
            </div>

            {/* Action buttons inside card */}
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={joining}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? "Sending..." : "Join Club"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Simple top bar matching ManageRequests style */
function Header() {
  const navigate = useNavigate();

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-center relative h-14 px-4">
          <button
            onClick={() => navigate("/home", { replace: true })}
            className="absolute left-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">Join Club</h1>
        </div>
      </div>
      <div className="h-14" />
    </>
  );
}

export default JoinByLink;

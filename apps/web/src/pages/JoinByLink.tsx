/**
 * JoinByLink — /join/:slug
 *
 * Public invite link handler:
 * - Unauthenticated: saves slug to localStorage, redirects to /signup
 * - Authenticated but not onboarded: saves slug, redirects to /players/onboarding
 * - Authenticated + onboarded: shows club details page with Join / Cancel buttons
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { buildImageUrl } from "@/utils/buildImageUrl";
import { fetchMemberCount } from "@/integrations/supabase/clubMembers";

const PENDING_CLUB_JOIN_KEY = "pendingClubJoinSlug";

interface ClubPreview {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  city: string | null;
  country: string | null;
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

  // Fetch club by slug
  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ["club-by-slug", trimmedSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, description, image_url, city, country")
        .eq("slug", trimmedSlug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as ClubPreview | null;
    },
    enabled: !!trimmedSlug && isAuthenticated && !isLoading,
  });

  // Fetch member count
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["club-member-count", club?.id],
    queryFn: () => fetchMemberCount(club!.id),
    enabled: !!club?.id,
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
  if (!club) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4">
        <p className="text-lg font-semibold">Club not found</p>
        <p className="text-sm text-muted-foreground text-center">
          This invite link is invalid or the club has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate("/home", { replace: true })}>
          Go Home
        </Button>
      </div>
    );
  }

  const location = [club.city, club.country].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="relative h-48 sm:h-56">
        {club.image_url ? (
          <img
            src={buildImageUrl(club.image_url, { w: 1200 })}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-primary/20" />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Club info */}
      <div className="px-4 pt-5 space-y-3 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold">{club.name}</h1>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
        </div>

        {club.description && (
          <p className="text-sm text-muted-foreground">{club.description}</p>
        )}

        <p className="text-sm pt-2">
          You've been invited to join this club. Send a request to the admins?
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <Button className="flex-1" onClick={handleJoin} disabled={joining}>
            {joining ? "Sending..." : "Join Club"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
            disabled={joining}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JoinByLink;

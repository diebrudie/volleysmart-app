/**
 * InvitePage — /invite/:token
 *
 * Token-based invite link handler. Handles 5 user states:
 * 1. Unauthenticated → show club name/image + Sign up / Log in buttons
 * 2. Authenticated, no player profile → redirect to onboarding
 * 3. Authenticated, not a member → accept / decline screen
 * 4. Already active member → redirect to /clubs with toast
 * 5. Already pending → show "request pending" message
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { buildImageUrl } from "@/utils/buildImageUrl";

const PENDING_INVITE_TOKEN_KEY = "pendingInviteToken";

interface ValidationResult {
  valid: boolean;
  club_name: string | null;
  club_image: string | null;
  user_status: string | null; // null (anon), not_member, already_member, already_pending
}

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasRedirected = useRef(false);
  const [accepting, setAccepting] = useState(false);

  const trimmedToken = token?.trim() ?? "";

  // Validate the invitation token (works for anon + authenticated)
  const {
    data: validation,
    isLoading: validating,
    error: validationError,
  } = useQuery({
    queryKey: ["validate-invitation", trimmedToken, isAuthenticated],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "validate_invitation_token",
        { p_token: trimmedToken }
      );
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as ValidationResult) ?? { valid: false, club_name: null, club_image: null, user_status: null };
    },
    enabled: !!trimmedToken && !authLoading,
  });

  // Handle redirects for authenticated users
  useEffect(() => {
    if (authLoading || !validation?.valid || hasRedirected.current) return;
    if (!isAuthenticated || !user) return;

    // Already a member → redirect to /clubs
    if (validation.user_status === "already_member") {
      hasRedirected.current = true;
      toast({
        title: "Already a member",
        description: "You're already a member of this club.",
        duration: 2000,
      });
      navigate("/clubs", { replace: true });
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
        localStorage.setItem(PENDING_INVITE_TOKEN_KEY, trimmedToken);
        navigate("/players/onboarding", { replace: true });
      }
    };

    void checkOnboarding();
  }, [authLoading, isAuthenticated, user, validation, trimmedToken, navigate, toast]);

  // ─── Action handlers ───────────────────────────────────────────────────

  const handleSignUp = () => {
    localStorage.setItem(PENDING_INVITE_TOKEN_KEY, trimmedToken);
    navigate("/signup", { replace: true });
  };

  const handleLogIn = () => {
    localStorage.setItem(PENDING_INVITE_TOKEN_KEY, trimmedToken);
    navigate("/login", { replace: true });
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("accept_invitation", {
        p_token: trimmedToken,
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("invitation_invalid")) {
          toast({
            title: "Invite no longer valid",
            description: "This invite link has expired or been revoked.",
            variant: "destructive",
            duration: 2000,
          });
        } else {
          toast({
            title: "Something went wrong",
            description: "Please try again.",
            variant: "destructive",
            duration: 2000,
          });
        }
        navigate("/home", { replace: true });
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const status = row?.result_status;

      if (status === "already_member") {
        toast({
          title: "Already a member",
          description: "You're already a member of this club.",
          duration: 2000,
        });
      } else if (status === "already_pending") {
        toast({
          title: "Request already pending",
          description: "An admin needs to approve your request.",
          duration: 2000,
        });
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

    localStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
    navigate("/clubs", { replace: true });
  };

  const handleDecline = () => {
    localStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
    navigate("/home", { replace: true });
  };

  // ─── Loading ───────────────────────────────────────────────────────────

  if (authLoading || validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // ─── Invalid token ────────────────────────────────────────────────────

  if (!validation?.valid || validationError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center px-4 pt-24 gap-4">
          <p className="text-lg font-semibold">This invite link is no longer valid</p>
          <p className="text-sm text-muted-foreground text-center">
            The link may have expired, been revoked, or the inviter is no longer a member.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/", { replace: true })}
          >
            Go to VolleySmart
          </Button>
        </div>
      </div>
    );
  }

  const clubName = validation.club_name ?? "Club";

  // ─── State 1: Unauthenticated ─────────────────────────────────────────

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="px-4 pt-6 max-w-lg mx-auto">
          {/* Club card */}
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="aspect-[16/10] w-full bg-muted overflow-hidden">
              {validation.club_image ? (
                <img
                  src={buildImageUrl(validation.club_image, { w: 720 })}
                  alt={clubName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {clubName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="p-4 space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                You've been invited to join {clubName} on VolleySmart
              </h2>
              <p className="text-sm text-muted-foreground">
                Create an account or log in to accept this invitation.
              </p>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={handleSignUp}>
                  Sign up
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleLogIn}>
                  Log in
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── State 5: Already pending ─────────────────────────────────────────

  if (validation.user_status === "already_pending") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="px-4 pt-6 max-w-lg mx-auto">
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="aspect-[16/10] w-full bg-muted overflow-hidden">
              {validation.club_image ? (
                <img
                  src={buildImageUrl(validation.club_image, { w: 720 })}
                  alt={clubName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {clubName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Request pending</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Your request to join {clubName} is waiting for admin approval.
              </p>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => navigate("/clubs", { replace: true })}
              >
                Go to Clubs
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── State 3: Authenticated, not a member → accept / decline ──────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="aspect-[16/10] w-full bg-muted overflow-hidden">
            {validation.club_image ? (
              <img
                src={buildImageUrl(validation.club_image, { w: 720 })}
                alt={clubName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {clubName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="p-4 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{clubName}</h2>
            <p className="text-sm text-muted-foreground">
              Accept this invitation to send a join request to the club admins.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDecline}
                disabled={accepting}
              >
                Decline
              </Button>
              <Button
                className="flex-1"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? "Sending..." : "Accept invitation"}
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
          <h1 className="text-base font-semibold">Club Invitation</h1>
        </div>
      </div>
      <div className="h-14" />
    </>
  );
}

export default InvitePage;

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClub } from "@/contexts/ClubContext";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Club {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

const JoinClub = () => {
  const { user } = useAuth();
  const { setClubId: setGlobalClubId } = useClub();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const PENDING_CLUB_JOIN_KEY = "pendingClubJoinSlug";

  const [clubIdInput, setClubIdInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userCreatedClubs, setUserCreatedClubs] = useState<Club[]>([]);
  const [isAssociationMember, setIsAssociationMember] = useState(false);

  /**
   * Prefill the Club ID input from:
   * 1. URL query param `cid` (if present)
   * 2. Otherwise from localStorage `pendingClubJoinSlug`
   *
   * This allows users to:
   * - Click invite link
   * - Sign up / login / complete onboarding
   * - Then go to /join-club and see the Club ID already filled in.
   */
  useEffect(() => {
    const cidFromUrl = (searchParams.get("cid") ?? "").trim();
    const storedCid = (
      localStorage.getItem(PENDING_CLUB_JOIN_KEY) ?? ""
    ).trim();
    const slug = cidFromUrl || storedCid;

    if (slug) {
      setClubIdInput(slug);
    }

    // We intentionally only run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch clubs created by the current user
  useEffect(() => {
    const fetchUserCreatedClubs = async () => {
      if (!user?.id) return;

      try {
        /**
         * Only show active clubs created by the user.
         * RLS also hides deleted clubs, but we add an explicit filter for clarity.
         */
        const { data: clubs, error } = await supabase
          .from("clubs")
          .select("id, name, slug, created_at, status")
          .eq("created_by", user.id)
          .eq("status", "active");
        if (error) {
          console.error("Error fetching user created clubs:", error);
        } else {
          setUserCreatedClubs(clubs || []);
        }
      } catch (error) {
        console.error("Unexpected error fetching clubs:", error);
      }
    };

    fetchUserCreatedClubs();
  }, [user?.id]);

  const handleBack = () => {
    // Use browser's history to go back to the previous page
    window.history.back();
  };

  /**
   * Join a club by slug with a membership pre-check that respects RLS:
   * - If the current user can read the club by slug (RLS allows this only for creators/members),
   *   we assume they already have access and do NOT call the RPC.
   * - Otherwise we call SECURITY DEFINER RPC `request_join_by_slug`.
   * - Duplicate requests are handled via unique violation (23505).
   * - No club_id is surfaced to the user in any toast.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !clubIdInput.trim()) return;

    setIsLoading(true);
    try {
      const slug = clubIdInput.trim().toLowerCase();

      // Optional: ensure session is valid (useful during debugging)
      await supabase.auth.getUser();

      /**
       * PRE-CHECK: Are we already a creator/member of this active club?
       * Your RLS only allows SELECT on clubs for creators or active members.
       * If this returns a row, we can safely short-circuit and avoid the RPC.
       */
      const { data: visibleClub, error: visibleErr } = await supabase
        .from("clubs")
        .select("id")
        .eq("status", "active")
        .ilike("slug", slug)
        .maybeSingle();

      if (!visibleErr && visibleClub?.id) {
        // Invite has effectively been "used" — clear pending slug.
        localStorage.removeItem(PENDING_CLUB_JOIN_KEY);

        toast({
          title: "Already a member",
          description: "You are already a member of this club.",
          duration: 2500,
        });
        navigate("/clubs");
        return;
      }

      // Not visible -> likely not a member; proceed to RPC
      const { error: rpcErr } = await supabase.rpc("request_join_by_slug", {
        p_slug: slug,
        p_member_association: isAssociationMember,
      });

      if (rpcErr) {
        const err = rpcErr as PostgrestError;
        const msg = String(err.message || "").toLowerCase();

        // Unique violation => an existing row already ties this user to the club (pending or active)
        if (
          err.code === "23505" ||
          msg.includes("club_members_club_id_user_id_key")
        ) {
          toast({
            title: "Request already sent",
            description:
              "You already have a membership request pending or you’re already a member. Please contact an admin if you need access.",
            duration: 3500,
          });
          return;
        }

        if (msg.includes("club_not_found_or_deleted")) {
          toast({
            title: "Club not found",
            description:
              "This club isn’t available (it may have been deleted).",
            variant: "destructive",
            duration: 3000,
          });
          return;
        }

        toast({
          title: "Couldn’t join",
          description: "Join request failed. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Success — keep message generic (no UUIDs)
      // Clear pending invite, since the join request has been created.
      localStorage.removeItem(PENDING_CLUB_JOIN_KEY);

      toast({
        title: "Request sent",
        description:
          "Your request was sent to the club admins. You'll have to wait for approval.",
        duration: 3500,
      });
      navigate("/clubs");
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 p-0 h-auto font-normal text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-transparent dark:hover:bg-transparent"
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-gray-100">
              Join a club
            </h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clubId">Please insert a Club ID</Label>
                <Input
                  id="clubId"
                  type="text"
                  placeholder="AB12C"
                  value={clubIdInput}
                  onChange={(e) => setClubIdInput(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 pt-2 pb-4">
                  <input
                    id="assoc-member"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={isAssociationMember}
                    onChange={(e) => setIsAssociationMember(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    I am a member of this association.
                  </span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                        aria-label="What does member association mean?"
                      >
                        ?
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="center"
                      className="max-w-xs text-sm leading-snug text-gray-800 dark:text-gray-100"
                    >
                      Member Association means you are a paid member of the
                      club. If you are not sure, leave this unchecked.
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Club"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinClub;

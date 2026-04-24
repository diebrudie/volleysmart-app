import { useState, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/spinner";
import { EmptyGameState } from "@/components/common/EmptyGameState";
import { useClub } from "@/contexts/ClubContext";
import {
  fetchUserRole,
  useMemberCount,
} from "@/integrations/supabase/clubMembers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsCompact } from "@/hooks/use-compact";
import { ClubInviteSharePanel } from "@/components/clubs/ClubInviteSharePanel";

/**
 * Dashboard is now a redirect wrapper.
 * - If the club has games, redirect to /game/:latestMatchDayId
 * - Otherwise show the empty game state
 */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckingClub, setIsCheckingClub] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "editor" | "member" | null>(null);
  const isCompact = useIsCompact();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const { setClubId } = useClub();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();

  useEffect(() => {
    if (urlClubId) setClubId(urlClubId);
  }, [urlClubId, setClubId]);

  const userClubId = urlClubId;

  useEffect(() => {
    const checkUserClub = async () => {
      if (!user?.id) return;
      if (userClubId) {
        localStorage.setItem("lastVisitedClub", userClubId);
        const memberRole = await fetchUserRole(user.id, userClubId);
        if (memberRole) {
          setUserRole(memberRole);
          setIsCheckingClub(false);
          return;
        }
        const { data: creatorCheck } = await supabase
          .from("clubs")
          .select("id")
          .eq("id", userClubId)
          .eq("created_by", user.id)
          .maybeSingle();
        if (creatorCheck) {
          setUserRole("admin");
          setIsCheckingClub(false);
          return;
        }
        navigate("/clubs");
        return;
      }
      navigate("/home");
    };
    checkUserClub();
  }, [user, navigate, userClubId]);

  const { data: clubDetails } = useQuery({
    queryKey: ["clubDetails", userClubId],
    queryFn: async () => {
      if (!userClubId) return null;
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, slug")
        .eq("id", userClubId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  const { data: memberCount } = useMemberCount(userClubId, {
    enabled: !!userClubId && !isCheckingClub,
  });

  // Find the latest match_day ID for redirect
  const { data: latestGameId, isLoading } = useQuery({
    queryKey: ["latestGameId", userClubId],
    queryFn: async (): Promise<string | null> => {
      if (!userClubId) return null;

      const { data: allMatchDays } = await supabase
        .from("match_days")
        .select("id")
        .eq("club_id", userClubId)
        .order("created_at", { ascending: false });

      if (!allMatchDays?.length) return null;

      const matchDayIds = allMatchDays.map((md) => md.id);
      const { data: withPlayers } = await supabase
        .from("game_players")
        .select("match_day_id")
        .in("match_day_id", matchDayIds);

      const idsWithPlayers = new Set((withPlayers ?? []).map((r) => r.match_day_id));
      const found = allMatchDays.find((md) => idsWithPlayers.has(md.id));
      return found?.id ?? null;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  if (isCheckingClub || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  // Redirect to the unified game page
  if (latestGameId) {
    return <Navigate to={`/game/${latestGameId}`} replace />;
  }

  // No games — show empty state
  const clubMemberCount = memberCount ?? 0;
  const canGenerateTeams = clubMemberCount >= 4;
  const canInviteMembers = userRole === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow overflow-y-auto p-4 pt-8">
        <EmptyGameState
          clubName={clubDetails?.name}

          memberCount={clubMemberCount}
          canGenerateTeams={canGenerateTeams}
          canInviteMembers={canInviteMembers}
          onInviteMembers={() => setIsInviteOpen(true)}
          onCreateGame={() => navigate(`/new-game/${userClubId}`)}
          variant="dashboard"
        />
      </div>

      {isCompact ? (
        <Drawer open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DrawerContent className="pb-6">
            <DrawerHeader className="text-left">
              <DrawerTitle>Invite your teammates</DrawerTitle>
              <DrawerDescription>
                Share your Club ID with them so they can join this club.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pt-2 pb-2 flex justify-center">
              {clubDetails?.id ? (
                <ClubInviteSharePanel clubId={clubDetails.id} />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                  We could not load your club join code. Please reload the page.
                </p>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="mb-4 mt-4 text-center">
              <DialogTitle>Invite your teammates</DialogTitle>
              <DialogDescription className="mt-1">
                Share your Club ID with them so they can join this club.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              {clubDetails?.id ? (
                <ClubInviteSharePanel clubId={clubDetails.id} />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                  We could not load your club join code. Please reload the page.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Dashboard;

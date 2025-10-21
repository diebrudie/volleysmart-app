import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useClub } from "@/contexts/ClubContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, UserPlus, UsersRound, Edit, Trash } from "lucide-react";
import ClubSettingsDialog from "@/components/clubs/ClubSettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

interface ClubWithDetails {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  created_by: string;
  creator_first_name: string;
  creator_last_name: string;
  role: string;
  description?: string;
  slug: string; // NEW: 5-char Club ID
}

type MemberClubRow = {
  club_id: string;
  role: string;
  clubs: {
    id: string;
    name: string;
    image_url: string | null;
    created_at: string;
    created_by: string;
    description?: string;
    slug: string; // ensure presence
  } | null;
};

type CreatedClubRow = {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  created_by: string;
  description?: string;
  slug: string; // ensure presence
};

type ClubRow = Database["public"]["Tables"]["clubs"]["Row"];
type ClubIdRow = Pick<ClubRow, "id">;

const Clubs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClub, setSelectedClub] = useState<ClubWithDetails | null>(
    null
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clubToDelete, setClubToDelete] = useState<ClubWithDetails | null>(
    null
  );
  const { setClubId } = useClub();

  useEffect(() => {
    const lastClub = localStorage.getItem("lastVisitedClub");
    if (lastClub) {
      setClubId(lastClub);
    }
  }, [setClubId]);

  // Query to fetch all clubs user is a member of
  const { data: userClubs, isLoading } = useQuery({
    queryKey: ["userClubs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get clubs where user is a member
      const { data: memberClubs, error: memberError } = await supabase
        .from("club_members")
        .select(
          `
    club_id,
    role,
    status,
    is_active,
    clubs!inner (
      id,
      name,
      image_url,
      created_at,
      created_by,
      description,
      slug,
      status
    )
  `
        )
        .eq("user_id", user.id)
        .eq("status", "active") // membership is active
        .eq("is_active", true) // your lifecycle flag
        .eq("clubs.status", "active"); // club itself is active

      if (memberError) throw memberError;

      /**
       * Only show active clubs created by the user.
       * RLS also hides deleted clubs, but we add an explicit filter for clarity.
       */
      const { data: createdClubs, error: createdError } = await supabase
        .from("clubs")
        .select(
          `
    id,
    name,
    image_url,
    created_at,
    created_by,
    description,
    slug,
    status
  `
        )
        .eq("created_by", user.id)
        .eq("status", "active");

      if (createdError) throw createdError;

      const memberClubsTyped = (memberClubs ?? []) as MemberClubRow[];
      const createdClubsTyped = (createdClubs ?? []) as CreatedClubRow[];

      // Combine and format results
      const allClubs: ClubWithDetails[] = [];

      // Add member clubs
      memberClubsTyped.forEach((member) => {
        if (member.clubs) {
          allClubs.push({
            id: member.clubs.id,
            name: member.clubs.name,
            image_url: member.clubs.image_url,
            created_at: member.clubs.created_at,
            created_by: member.clubs.created_by,
            creator_first_name: "",
            creator_last_name: "",
            role: member.role,
            description: member.clubs.description,
            slug: member.clubs.slug,
          });
        }
      });

      // Add created clubs (if not already included)
      createdClubsTyped.forEach((club) => {
        if (!allClubs.find((c) => c.id === club.id)) {
          allClubs.push({
            id: club.id,
            name: club.name,
            image_url: club.image_url,
            created_at: club.created_at,
            created_by: club.created_by,
            creator_first_name: "",
            creator_last_name: "",
            role: "admin",
            description: club.description,
            slug: club.slug,
          });
        }
      });

      // Get creator names for all clubs
      const creatorIds = [...new Set(allClubs.map((club) => club.created_by))];
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from("players")
          .select("user_id, first_name, last_name")
          .in("user_id", creatorIds);

        // Map creator names to clubs
        allClubs.forEach((club) => {
          const creator = creators?.find((c) => c.user_id === club.created_by);
          if (creator) {
            club.creator_first_name = creator.first_name;
            club.creator_last_name = creator.last_name;
          }
        });
      }

      return allClubs;
    },
    enabled: !!user?.id,
  });

  const handleCreateClub = () => {
    console.log(
      "[CLUBS]",
      "navigating from",
      location.pathname,
      "to",
      "/new-club",
      "reason: Create a New Club"
    );

    navigate("/new-club");
  };

  const handleJoinClub = () => {
    console.log(
      "[CLUBS]",
      "navigating from",
      location.pathname,
      "to",
      "/join-club",
      "reason: Join an exsiting Club"
    );

    navigate("/join-club");
  };

  const handleClubClick = (clubId: string) => {
    setClubId(clubId); // set it globally
    localStorage.setItem("lastVisitedClub", clubId);
    console.log(
      "[CLUBS]",
      "navigating from",
      location.pathname,
      "to",
      "/dashboard/:clubId",
      "reason: After creating/joining club get redirected to dashboard"
    );

    navigate(`/dashboard/${clubId}`);
  };

  const handleEditClick = (e: React.MouseEvent, club: ClubWithDetails) => {
    e.stopPropagation();
    setSelectedClub(club);
    setIsSettingsOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, club: ClubWithDetails) => {
    e.stopPropagation();
    setClubToDelete(club);
    setShowDeleteDialog(true);
  };

  /**
   * Soft delete handler (type-safe, no row return on UPDATE, verify by refetch)
   */
  const handleConfirmDelete = async () => {
    if (!clubToDelete || !user?.id) return;

    // Optimistically remove from caches that list user's clubs
    const keys = [["userClubs", user.id] as const, ["userClubs"] as const];

    for (const key of keys) {
      queryClient.setQueryData<ClubRow[] | undefined>(key, (prev) =>
        Array.isArray(prev)
          ? prev.filter((c) => c.id !== clubToDelete.id)
          : prev
      );
    }

    try {
      /**
       * IMPORTANT: use returning:'minimal' to avoid PostgREST trying to SELECT
       * the updated row, which RLS hides once status='deleted' → 403 otherwise.
       */
      const { error } = await supabase
        .from("clubs")
        .update({
          status: "deleted" as Database["public"]["Enums"]["club_status"],
        })
        .eq("id", clubToDelete.id)
        .select("id");

      if (error) throw error;

      // Revalidate the authoritative lists
      await Promise.all(
        keys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );

      // Verify: if the club still shows up after refetch, the update did not take effect (RLS / stale id)
      const latest =
        queryClient.getQueryData<ClubRow[] | undefined>([
          "userClubs",
          user.id,
        ]) ?? queryClient.getQueryData<ClubRow[] | undefined>(["userClubs"]);

      const stillVisible = Array.isArray(latest)
        ? latest.some((c) => c.id === clubToDelete.id)
        : false;

      if (stillVisible) {
        throw new Error(
          "Club still visible after update; likely RLS prevented the change."
        );
      }

      // Safety: clear lastVisitedClub if it pointed to this club
      if (localStorage.getItem("lastVisitedClub") === clubToDelete.id) {
        localStorage.removeItem("lastVisitedClub");
      }

      toast({
        title: "Club removed",
        description: "The club is now removed from all members.",
        duration: 1500,
      });
    } catch (err) {
      // Roll back by refetching from server
      await Promise.all(
        keys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );

      console.error("Error soft-deleting club:", err);
      const msg = (err as { message?: string })?.message?.includes("permission")
        ? "You don't have permission to remove this club."
        : "Failed to remove the club.";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setShowDeleteDialog(false);
      setClubToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isClubAdmin = (club: ClubWithDetails) => {
    return club.role === "admin" || club.created_by === user?.id;
  };

  const getCreatorDisplayName = (club: ClubWithDetails) => {
    if (club.created_by === user?.id) {
      return "You";
    }
    return `${club.creator_first_name} ${club.creator_last_name}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with title and buttons */}
          <div className="mb-8">
            {/* Desktop Layout */}
            <div className="hidden sm:flex justify-between items-center">
              <h1 className="text-4xl font-serif text-gray-900 dark:text-gray-100">
                Your clubs
              </h1>
              <div className="flex gap-4">
                <Button
                  variant="action"
                  icon={<UsersRound className="h-4 w-4" />}
                  onClick={handleJoinClub}
                >
                  Join a Club
                </Button>
                <Button
                  variant="secondary"
                  icon={<UserPlus className="h-4 w-4" />}
                  onClick={handleCreateClub}
                >
                  Create a Club
                </Button>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="sm:hidden">
              <h1 className="text-4xl font-serif text-gray-900 dark:text-gray-100 mb-4">
                Your clubs
              </h1>
              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  variant="action"
                  icon={<UsersRound className="h-4 w-4" />}
                  onClick={handleJoinClub}
                  className="flex-1 min-w-[140px] max-w-[200px]"
                >
                  Join a Club
                </Button>
                <Button
                  variant="secondary"
                  icon={<UserPlus className="h-4 w-4" />}
                  onClick={handleCreateClub}
                  className="flex-1 min-w-[140px] max-w-[200px]"
                >
                  Create a Club
                </Button>
              </div>
            </div>
          </div>

          {/* Clubs grid */}
          {userClubs && userClubs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userClubs.map((club) => (
                <Card
                  key={club.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow relative bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  onClick={() => handleClubClick(club.id)}
                >
                  <CardHeader className="p-0">
                    <div className="aspect-video w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                      {club.image_url ? (
                        <img
                          src={club.image_url}
                          alt={club.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">
                            {club.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold flex-1 pr-2 text-gray-900 dark:text-gray-100">
                        {club.name}
                      </h3>
                      {isClubAdmin(club) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Open club menu"
                              className="h-8 w-8 p-0 rounded-md
             text-gray-600 hover:text-gray-900 hover:bg-gray-100
             dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-40 p-2 bg-white border border-gray-200 shadow-md
             dark:bg-gray-800 dark:border-gray-700"
                            align="end"
                          >
                            <div className="flex flex-col space-y-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start
             text-gray-700 hover:text-gray-900 hover:bg-gray-100
             dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-700"
                                onClick={(e) => handleEditClick(e, club)}
                                icon={<Edit className="h-4 w-4" />}
                              >
                                Edit Club
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start
             text-red-600 hover:text-red-700 hover:bg-red-50
             dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                                onClick={(e) => handleDeleteClick(e, club)}
                                icon={<Trash className="h-4 w-4" />}
                              >
                                Delete Club
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Created on: {formatDate(club.created_at)}
                    </p>
                    {/* Club ID shown as plain text (non-clickable) */}
                    {club.slug && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Club ID:{" "}
                        <span className="font-mono font-semibold">
                          {club.slug}
                        </span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                You haven't joined any clubs yet.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="action"
                  icon={<UsersRound className="h-4 w-4" />}
                  onClick={handleJoinClub}
                >
                  Join a Club
                </Button>
                <Button
                  variant="secondary"
                  icon={<UserPlus className="h-4 w-4" />}
                  onClick={handleCreateClub}
                >
                  Create a Club
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Club Settings Dialog */}
      {selectedClub && (
        <ClubSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            setSelectedClub(null);
          }}
          club={selectedClub}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              club "{clubToDelete?.name}" and remove the club from everyone’s
              view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clubs;

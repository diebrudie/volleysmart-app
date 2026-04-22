import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { useIsCompact } from "@/hooks/use-compact";
import { Button } from "@/components/ui/button";
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
import {
  MoreVertical,
  UserPlus,
  UsersRound,
  Edit,
  Trash,
  MapPin,
} from "lucide-react";
import ClubSettingsDialog from "@/components/clubs/ClubSettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { buildImageUrl } from "@/utils/buildImageUrl";
import {
  fetchActiveMemberClubsWithDetails,
  MemberClubWithDetails,
} from "@/integrations/supabase/clubMembers";

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
  slug: string;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  is_club_discoverable?: boolean;
}

type CreatedClubRow = {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  created_by: string;
  description?: string;
  slug: string;
  status?: string;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  is_club_discoverable?: boolean;
};

type ClubRow = Database["public"]["Tables"]["clubs"]["Row"];

const Clubs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCompact = useIsCompact();
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

  // Slider state
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const clubCount = useRef(0);

  useEffect(() => {
    const lastClub = localStorage.getItem("lastVisitedClub");
    if (lastClub) {
      setClubId(lastClub);
    }
  }, [setClubId]);

  // Observe scroll position for dot indicators
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const cardWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth + 12 // gap
        : 1;
      setActiveSlide(Math.round(scrollLeft / cardWidth));
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Query to fetch all clubs user is a member of
  const { data: userClubs, isLoading } = useQuery({
    queryKey: ["userClubs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const memberClubs = await fetchActiveMemberClubsWithDetails(user.id);

      const { data: createdClubs, error: createdError } = await supabase
        .from("clubs")
        .select(
          `id, name, image_url, created_at, created_by, description, slug, status, city, country, country_code, is_club_discoverable`
        )
        .eq("created_by", user.id)
        .eq("status", "active");

      if (createdError) throw createdError;

      const memberClubsTyped = (memberClubs ?? []) as MemberClubWithDetails[];
      const createdClubsTyped = (createdClubs ?? []) as CreatedClubRow[];

      const allClubs: ClubWithDetails[] = [];

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
            city: member.clubs.city ?? null,
            country: member.clubs.country ?? null,
            country_code: member.clubs.country_code ?? null,
            is_club_discoverable: member.clubs.is_club_discoverable ?? false,
          });
        }
      });

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
            city: club.city ?? null,
            country: club.country ?? null,
            country_code: club.country_code ?? null,
            is_club_discoverable: club.is_club_discoverable ?? false,
          });
        }
      });

      const creatorIds = [...new Set(allClubs.map((club) => club.created_by))];
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from("players")
          .select("user_id, first_name, last_name")
          .in("user_id", creatorIds);

        allClubs.forEach((club) => {
          const creator = creators?.find((c) => c.user_id === club.created_by);
          if (creator) {
            club.creator_first_name = creator.first_name;
            club.creator_last_name = creator.last_name;
          }
        });
      }

      clubCount.current = allClubs.length;
      return allClubs;
    },
    enabled: !!user?.id,
  });

  const handleCreateClub = () => navigate("/new-club");
  const handleJoinClub = () => navigate("/join-club");

  const handleClubClick = (clubId: string) => {
    setClubId(clubId);
    localStorage.setItem("lastVisitedClub", clubId);
    navigate(`/clubs/${clubId}`);
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

  const handleConfirmDelete = async () => {
    if (!clubToDelete || !user?.id) return;

    const keys = [["userClubs", user.id] as const, ["userClubs"] as const];

    for (const key of keys) {
      queryClient.setQueryData<ClubRow[] | undefined>(key, (prev) =>
        Array.isArray(prev)
          ? prev.filter((c) => c.id !== clubToDelete.id)
          : prev
      );
    }

    try {
      const { error } = await supabase
        .from("clubs")
        .update({
          status: "deleted" as Database["public"]["Enums"]["club_status"],
        })
        .eq("id", clubToDelete.id)
        .select("id");

      if (error) throw error;

      await Promise.all(
        keys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );

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

      if (localStorage.getItem("lastVisitedClub") === clubToDelete.id) {
        localStorage.removeItem("lastVisitedClub");
      }

      toast({
        title: "Club removed",
        description: "The club is now removed from all members.",
        duration: 1500,
      });
    } catch (err) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {!isCompact && <Navbar />}
        <div className="flex-grow flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isCompact && <Navbar />}
      <main className="flex-grow pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Action buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              variant="outline"
              onClick={handleJoinClub}
              className="flex-1 h-12 justify-center"
            >
              <UsersRound className="mr-2 h-4 w-4" />
              Join a Club
            </Button>
            <Button
              onClick={handleCreateClub}
              className="flex-1 h-12 justify-center"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create a Club
            </Button>
          </div>

          {/* Your Clubs */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Your Clubs</h2>

            {userClubs && userClubs.length > 0 ? (
              <>
                {/* Horizontal slider */}
                <div
                  ref={sliderRef}
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {userClubs.map((club) => (
                    <div
                      key={club.id}
                      className="snap-start shrink-0 w-[85vw] sm:w-[340px] border border-border rounded-xl overflow-hidden bg-card cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleClubClick(club.id)}
                    >
                      {/* Image */}
                      <div className="aspect-[16/10] w-full bg-muted overflow-hidden">
                        {club.image_url ? (
                          <img
                            src={buildImageUrl(club.image_url ?? "", { w: 720 })}
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
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-base font-semibold text-foreground flex-1 pr-2 truncate">
                            {club.name}
                          </h3>
                          {isClubAdmin(club) && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="Club menu"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-40 p-2 bg-popover border border-border shadow-md"
                                align="end"
                              >
                                <div className="flex flex-col space-y-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-foreground hover:bg-muted"
                                    onClick={(e) => handleEditClick(e, club)}
                                    icon={<Edit className="h-4 w-4" />}
                                  >
                                    Edit Club
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
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
                        <p className="text-sm text-muted-foreground">
                          Playing since {formatDate(club.created_at)}
                        </p>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {club.city ? club.city : "Location not set"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dot indicators */}
                {userClubs.length > 1 && (
                  <div className="flex justify-center gap-1.5 pt-3">
                    {userClubs.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          i === activeSlide ? "bg-muted-foreground" : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-base">
                  You haven't joined any clubs yet.
                </p>
              </div>
            )}
          </section>

          {/* Discover */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Discover</h2>
            <div className="h-44 rounded-xl bg-muted/50 border border-border" />
          </section>
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
              club "{clubToDelete?.name}" and remove the club from everyone's
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

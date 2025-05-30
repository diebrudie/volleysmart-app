import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
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
import { MoreVertical, UserPlus, UsersRound } from "lucide-react";
import ClubSettingsDialog from "@/components/clubs/ClubSettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
}

const Clubs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClub, setSelectedClub] = useState<ClubWithDetails | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clubToDelete, setClubToDelete] = useState<ClubWithDetails | null>(null);

  // Query to fetch all clubs user is a member of
  const { data: userClubs, isLoading } = useQuery({
    queryKey: ['userClubs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get clubs where user is a member
      const { data: memberClubs, error: memberError } = await supabase
        .from('club_members')
        .select(`
          club_id,
          role,
          clubs (
            id,
            name,
            image_url,
            created_at,
            created_by,
            description
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Get clubs created by user
      const { data: createdClubs, error: createdError } = await supabase
        .from('clubs')
        .select(`
          id,
          name,
          image_url,
          created_at,
          created_by,
          description
        `)
        .eq('created_by', user.id);

      if (createdError) throw createdError;

      // Combine and format results
      const allClubs: ClubWithDetails[] = [];

      // Add member clubs
      memberClubs?.forEach(member => {
        if (member.clubs) {
          allClubs.push({
            id: member.clubs.id,
            name: member.clubs.name,
            image_url: member.clubs.image_url,
            created_at: member.clubs.created_at,
            created_by: member.clubs.created_by,
            creator_first_name: '',
            creator_last_name: '',
            role: member.role,
            description: member.clubs.description
          });
        }
      });

      // Add created clubs (if not already included)
      createdClubs?.forEach(club => {
        if (!allClubs.find(c => c.id === club.id)) {
          allClubs.push({
            id: club.id,
            name: club.name,
            image_url: club.image_url,
            created_at: club.created_at,
            created_by: club.created_by,
            creator_first_name: '',
            creator_last_name: '',
            role: 'admin', // Creator is always admin
            description: club.description
          });
        }
      });

      // Get creator names for all clubs
      const creatorIds = [...new Set(allClubs.map(club => club.created_by))];
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('players')
          .select('user_id, first_name, last_name')
          .in('user_id', creatorIds);

        // Map creator names to clubs
        allClubs.forEach(club => {
          const creator = creators?.find(c => c.user_id === club.created_by);
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
    navigate('/new-club');
  };

  const handleJoinClub = () => {
    navigate('/join-club');
  };

  const handleClubClick = (clubId: string) => {
    localStorage.setItem('lastVisitedClub', clubId);
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

  const handleConfirmDelete = async () => {
    if (!clubToDelete || !user?.id) return;
    
    try {
      // Delete club (this will cascade delete members, matches, etc.)
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Club deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['userClubs'] });
      setShowDeleteDialog(false);
      setClubToDelete(null);
    } catch (error) {
      console.error('Error deleting club:', error);
      toast({
        title: "Error",
        description: "Failed to delete club",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isClubAdmin = (club: ClubWithDetails) => {
    return club.role === 'admin' || club.created_by === user?.id;
  };

  const getCreatorDisplayName = (club: ClubWithDetails) => {
    if (club.created_by === user?.id) {
      return "You";
    }
    return `${club.creator_first_name} ${club.creator_last_name}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-serif">Your clubs</h1>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={handleJoinClub}
              >
                <UsersRound className="mr-2 h-4 w-4" />
                Join a Club
              </Button>
              <Button 
                onClick={handleCreateClub}
                className="bg-volleyball-secondary text-black hover:bg-volleyball-secondary/90"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create a Club
              </Button>
            </div>
          </div>

          {/* Clubs grid */}
          {userClubs && userClubs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userClubs.map((club) => (
                <Card 
                  key={club.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow relative"
                  onClick={() => handleClubClick(club.id)}
                >
                  <CardHeader className="p-0">
                    <div className="aspect-video w-full bg-gray-200 rounded-t-lg overflow-hidden">
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
                      <h3 className="text-lg font-semibold flex-1 pr-2">{club.name}</h3>
                      {isClubAdmin(club) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-2" align="end">
                            <div className="flex flex-col space-y-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={(e) => handleEditClick(e, club)}
                              >
                                Edit Club
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-destructive hover:text-destructive"
                                onClick={(e) => handleDeleteClick(e, club)}
                              >
                                Delete Club
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Created on: {formatDate(club.created_at)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Created by: {getCreatorDisplayName(club)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-6">You haven't joined any clubs yet.</p>
              <div className="flex gap-4 justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleJoinClub}
                >
                  <UsersRound className="mr-2 h-4 w-4" />
                  Join a Club
                </Button>
                <Button 
                  onClick={handleCreateClub}
                  className="bg-volleyball-secondary text-black hover:bg-volleyball-secondary/90"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
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
              This action cannot be undone. This will permanently delete the club
              "{clubToDelete?.name}" and all associated data including matches, teams, and member records.
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

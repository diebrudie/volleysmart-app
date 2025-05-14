
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, UsersRound } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Navbar from "@/components/layout/Navbar";

const Club = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');
  const [clubCode, setClubCode] = useState('');

  const handleCreateClub = async () => {
    if (!clubName.trim()) {
      toast({
        title: "Error",
        description: "Club name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Create the club
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .insert({
          name: clubName.trim(),
          description: clubDescription.trim() || null,
          created_by: user.id,
          // Generate a unique slug from the club name
          slug: clubName.trim().toLowerCase().replace(/\s+/g, '-')
        })
        .select()
        .single();
        
      if (clubError) throw clubError;
      
      // Add the current user as an admin to the club
      const { error: memberError } = await supabase
        .from('club_members')
        .insert({
          club_id: clubData.id,
          user_id: user.id,
          role: 'admin'
        });
      
      if (memberError) throw memberError;
      
      // Update the user's player record to associate with the club
      const { error: playerError } = await supabase
        .from('players')
        .update({ club_id: clubData.id })
        .eq('user_id', user.id);
      
      if (playerError) throw playerError;
      
      toast({
        title: "Success",
        description: `Your club "${clubData.name}" has been created!`,
      });
      
      // Close dialog and navigate to dashboard
      setIsCreating(false);
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error creating club:', error);
      toast({
        title: "Error",
        description: "Failed to create club",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinClub = async () => {
    if (!clubCode.trim()) {
      toast({
        title: "Error",
        description: "Club code is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Find the club by code/slug
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('slug', clubCode.trim().toLowerCase())
        .single();
      
      if (clubError) {
        if (clubError.code === 'PGRST116') {
          toast({
            title: "Error",
            description: "Club not found with that code",
            variant: "destructive"
          });
        } else {
          throw clubError;
        }
        setIsLoading(false);
        return;
      }
      
      // Check if the user is already a member of the club
      const { data: existingMember, error: checkError } = await supabase
        .from('club_members')
        .select('id')
        .eq('club_id', clubData.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingMember) {
        toast({
          title: "Info",
          description: "You're already a member of this club",
        });
        setIsJoining(false);
        navigate('/dashboard');
        return;
      }
      
      // Add the user as a member to the club
      const { error: memberError } = await supabase
        .from('club_members')
        .insert({
          club_id: clubData.id,
          user_id: user.id,
          role: 'member'
        });
      
      if (memberError) throw memberError;
      
      // Update the user's player record to associate with the club
      const { error: playerError } = await supabase
        .from('players')
        .update({ club_id: clubData.id })
        .eq('user_id', user.id);
      
      if (playerError) throw playerError;
      
      toast({
        title: "Success",
        description: `You've joined "${clubData.name}"!`,
      });
      
      // Close dialog and navigate to dashboard
      setIsJoining(false);
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error joining club:', error);
      toast({
        title: "Error",
        description: "Failed to join club",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-semibold text-center mb-6">
            Club Management
          </h1>
          <div className="grid grid-cols-1 gap-6 mt-8">
            <Button 
              onClick={() => setIsCreating(true)} 
              className="h-16 text-lg"
              size="lg"
            >
              <UserPlus className="mr-2 h-6 w-6" />
              Create a Club
            </Button>
            <Button 
              onClick={() => setIsJoining(true)} 
              className="h-16 text-lg"
              variant="outline"
              size="lg"
            >
              <UsersRound className="mr-2 h-6 w-6" />
              Join a Club
            </Button>
          </div>
        </div>
      </div>
      
      {/* Create Club Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a New Club</DialogTitle>
            <DialogDescription>
              Start your own volleyball club to organize matches and players
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="club-name" className="text-sm font-medium">Club Name *</label>
              <Input 
                id="club-name" 
                value={clubName} 
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Enter club name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="club-description" className="text-sm font-medium">Description (optional)</label>
              <Input 
                id="club-description" 
                value={clubDescription} 
                onChange={(e) => setClubDescription(e.target.value)}
                placeholder="Describe your club"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreating(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClub}
              disabled={isLoading || !clubName.trim()}
            >
              {isLoading ? "Creating..." : "Create Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Join Club Dialog */}
      <Dialog open={isJoining} onOpenChange={setIsJoining}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Join an Existing Club</DialogTitle>
            <DialogDescription>
              Enter the invite code provided by the club administrator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="club-code" className="text-sm font-medium">Club Code *</label>
              <Input 
                id="club-code" 
                value={clubCode} 
                onChange={(e) => setClubCode(e.target.value)}
                placeholder="Enter club code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsJoining(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleJoinClub}
              disabled={isLoading || !clubCode.trim()}
            >
              {isLoading ? "Joining..." : "Join Club"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Club;

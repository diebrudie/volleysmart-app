
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface JoinClubDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinClubDialog = ({ isOpen, onOpenChange }: JoinClubDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [clubCode, setClubCode] = useState('');

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
        onOpenChange(false);
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
      onOpenChange(false);
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
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
  );
};

export default JoinClubDialog;


import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateClubDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateClubDialog = ({ isOpen, onOpenChange }: CreateClubDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [clubName, setClubName] = useState('');
  const [clubDescription, setClubDescription] = useState('');

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
      onOpenChange(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
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
  );
};

export default CreateClubDialog;

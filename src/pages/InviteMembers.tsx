
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Spinner } from '@/components/ui/spinner';

interface MemberInvite {
  name: string;
  email: string;
}

const InviteMembers = () => {
  const [invites, setInvites] = useState<MemberInvite[]>([{ name: '', email: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { clubId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAddInvite = () => {
    if (invites.length < 6) {
      setInvites([...invites, { name: '', email: '' }]);
    } else {
      toast({
        title: "Maximum reached",
        description: "You can invite up to 6 members at once"
      });
    }
  };

  const handleRemoveInvite = (index: number) => {
    if (invites.length > 1) {
      const newInvites = [...invites];
      newInvites.splice(index, 1);
      setInvites(newInvites);
    }
  };

  const handleInputChange = (index: number, field: keyof MemberInvite, value: string) => {
    const newInvites = [...invites];
    newInvites[index][field] = value;
    setInvites(newInvites);
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty invites
    const validInvites = invites.filter(invite => invite.name.trim() && invite.email.trim());
    
    if (validInvites.length === 0) {
      // If no valid invites, just skip
      handleSkip();
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get club information to include in the invitation
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('name, slug')
        .eq('id', clubId)
        .single();
      
      if (clubError) throw clubError;
      
      // Call our edge function to send invitation emails
      const response = await fetch(`${window.location.origin}/api/functions/v1/send-club-invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          invites: validInvites,
          clubInfo: {
            id: clubId,
            name: clubData.name,
            joinCode: clubData.slug
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitations');
      }
      
      toast({
        title: "Invitations sent!",
        description: `Invitations have been sent to ${validInvites.length} members.`
      });
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-2">Great! Now Invite your club members</h1>
        <p className="text-center text-gray-600 mb-6">
          You can skip this step and invite your members later
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-[2fr_3fr_auto] gap-3 mb-4">
            <div className="font-medium">Name</div>
            <div className="font-medium">Email</div>
            <div></div>
            
            {invites.map((invite, index) => (
              <div key={index} className="contents">
                <div>
                  <Input
                    placeholder="Member name"
                    value={invite.name}
                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="member@email.com"
                    value={invite.email}
                    onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                  />
                </div>
                <div className="flex items-center">
                  {index === 0 && invites.length < 6 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleAddInvite}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleRemoveInvite(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Sending Invitations...
                </>
              ) : (
                'Invite Members'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMembers;

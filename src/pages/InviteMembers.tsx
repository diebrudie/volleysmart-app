import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Spinner } from "@/components/ui/spinner";
import { useClub } from "@/contexts/ClubContext";
import CopyableClubId from "@/components/clubs/CopyableClubId";
import { useQuery } from "@tanstack/react-query";

interface MemberInvite {
  email: string;
}

const InviteMembers = () => {
  const [invites, setInvites] = useState<MemberInvite[]>([{ email: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { clubId, setClubId } = useClub();
  const navigate = useNavigate();

  // Fetch club info for the CopyableClubId display
  const { data: clubMeta } = useQuery({
    queryKey: ["clubMeta", clubId],
    queryFn: async () => {
      if (!clubId) return null;
      const { data, error } = await supabase
        .from("clubs")
        .select("name, slug")
        .eq("id", clubId)
        .single();
      if (error) throw error;
      return data as { name: string; slug: string };
    },
    enabled: !!clubId,
  });

  const handleAddInvite = () => {
    if (invites.length < 6) {
      setInvites([...invites, { email: "" }]);
    } else {
      toast({
        title: "Maximum reached",
        description: "You can invite up to 6 members at once",
        duration: 2000,
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

  const handleInputChange = (index: number, value: string) => {
    const newInvites = [...invites];
    newInvites[index].email = value;
    setInvites(newInvites);
  };

  const handleSkip = () => {
    if (clubId) {
      navigate(`/dashboard/${clubId}`);
    } else {
      navigate("/clubs"); // fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty invites
    const validInvites = invites.filter((invite) => invite.email.trim());

    if (validInvites.length === 0) {
      // If no valid invites, just skip
      handleSkip();
      return;
    }

    setIsSubmitting(true);

    try {
      // Get club information to include in the invitation
      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .select("name, slug")
        .eq("id", clubId)
        .single();

      if (clubError) throw clubError;

      // For the API call, we'll send invites with just email
      // The API can extract the name from the email if needed, or use a default
      const invitesToSend = validInvites.map((invite) => ({
        name: invite.email.split("@")[0], // Use email prefix as name
        email: invite.email,
      }));

      // Call our edge function to send invitation emails
      const response = await fetch(
        `https://hdorkmnfwpegvlxygfwv.supabase.co/functions/v1/send-club-invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
          },
          body: JSON.stringify({
            invites: invitesToSend,
            clubInfo: {
              id: clubId,
              name: clubData.name,
              joinCode: clubData.slug,
            },
          }),
        }
      );

      if (!response.ok) {
        // Handle non-JSON responses
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send invitations");
        } else {
          throw new Error(
            `Failed to send invitations: ${response.status} ${response.statusText}`
          );
        }
      }

      toast({
        title: "Invitations sent!",
        description: `Invitations have been sent to ${validInvites.length} members.`,
        duration: 2000,
      });

      // Navigate to dashboard
      if (clubId) {
        navigate(`/dashboard/${clubId}`);
      } else {
        navigate("/clubs"); // fallback
      }
    } catch (error: unknown) {
      console.error("Error sending invitations:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send invitations. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">
          Great! Now Invite your club members
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          You can skip this step and invite your members later
        </p>
        {clubMeta?.slug && (
          <div className="flex justify-end mb-4">
            <CopyableClubId slug={clubMeta.slug} compact />
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 mb-6">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Email Addresses
            </div>

            {invites.map((invite, index) => (
              <div key={index} className="flex gap-3">
                <Input
                  type="email"
                  placeholder="member@email.com"
                  value={invite.email}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    if (index === 0 && invites.length < 6) {
                      handleAddInvite();
                    } else {
                      handleRemoveInvite(index);
                    }
                  }}
                >
                  {index === 0 && invites.length < 6 ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <Button type="button" variant="action" onClick={handleSkip}>
              Skip for now
            </Button>

            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Sending Invitations...
                </>
              ) : (
                "Invite Members"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMembers;

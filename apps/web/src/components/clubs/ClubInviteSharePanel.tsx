import { useState, useEffect } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

/**
 * ClubInviteSharePanel
 *
 * Reusable component that:
 * - Generates a token-based invite link via `generate_invitation` RPC
 * - Displays a copyable invite URL
 * - Shows "Share via" + three clickable app logos (WhatsApp, Telegram, Messenger)
 * - Allows regenerating the link (revokes old, creates new)
 */

type ClubInviteSharePanelProps = {
  clubId: string;
};

export const ClubInviteSharePanel = ({
  clubId,
}: ClubInviteSharePanelProps) => {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrCreateInvite = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("generate_invitation", {
        p_club_id: clubId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setToken(row.token);
        setInvitationId(row.invitation_id);
      }
    } catch (err) {
      console.error("Failed to generate invitation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrCreateInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const handleRegenerate = async () => {
    if (!invitationId) return;
    setRegenerating(true);
    try {
      // Revoke old
      await supabase.rpc("revoke_invitation", {
        p_invitation_id: invitationId,
      });
      // Generate new
      const { data, error } = await supabase.rpc("generate_invitation", {
        p_club_id: clubId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setToken(row.token);
        setInvitationId(row.invitation_id);
      }
      toast({
        title: "Link regenerated",
        description: "The old link has been revoked.",
        duration: 2000,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to regenerate link.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setRegenerating(false);
    }
  };

  const clubLink = token
    ? `https://volleysmart.app/invite/${token}`
    : "";

  const handleCopy = async () => {
    if (!clubLink) return;
    try {
      await navigator.clipboard.writeText(clubLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const inviteMessage = [
    "Hey, let's play Volleyball Smartly together.",
    " ",
    "Register for free and join my Club with this link:",
    clubLink,
  ].join("\n");

  const encodedMessage = encodeURIComponent(inviteMessage);
  const encodedClubLink = encodeURIComponent(clubLink);

  const openShareUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareWhatsApp = () => {
    openShareUrl(`https://wa.me/?text=${encodedMessage}`);
  };

  const handleShareTelegram = () => {
    openShareUrl(
      `https://t.me/share/url?url=${encodedClubLink}&text=${encodedMessage}`
    );
  };

  const handleShareMessenger = () => {
    openShareUrl(`fb-messenger://share?link=${encodedClubLink}`);
  };

  const iconBaseClasses =
    "flex flex-col items-center gap-1 text-xs text-gray-700 dark:text-gray-200";
  const imgClasses = "h-12 w-12 rounded-full shadow-sm";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Could not generate an invite link. Please try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Invite link block */}
      <div className="w-full max-w-sm space-y-2">
        <p className="text-sm font-medium text-muted-foreground text-left">
          Invite link
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
            {clubLink}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            aria-label="Copy invite link"
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Anyone with this link can request to join. Admins must approve.
          </p>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-2"
            aria-label="Regenerate invite link"
          >
            <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
            <span>New link</span>
          </button>
        </div>
      </div>

      {/* Share logos */}
      <div className="w-full max-w-sm text-left">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Share via:
        </p>
        <div className="flex flex-row gap-6">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className={iconBaseClasses}
            aria-label="Share via WhatsApp"
          >
            <img
              src="/logo-whatsapp.svg"
              alt="WhatsApp"
              className={imgClasses}
            />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleShareTelegram}
            className={iconBaseClasses}
            aria-label="Share via Telegram"
          >
            <img
              src="/logo-telegram.webp"
              alt="Telegram"
              className={imgClasses}
            />
            <span>Telegram</span>
          </button>

          <button
            type="button"
            onClick={handleShareMessenger}
            className={iconBaseClasses}
            aria-label="Share via Messenger"
          >
            <img
              src="/logo-facebookmessenger.png"
              alt="Messenger"
              className={imgClasses}
            />
            <span className="text-xs">Messenger</span>
          </button>
        </div>
      </div>
    </div>
  );
};

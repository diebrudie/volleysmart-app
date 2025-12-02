/**
 * ClubInviteSharePanel
 *
 * Reusable component that:
 * - Displays the Club ID in a copyable pill
 * - Shows "Share via" + social share buttons (WhatsApp, Telegram, Messenger)
 *
 * Usage:
 *   <ClubInviteSharePanel joinCode={clubMeta.slug} />
 */

import { Button } from "@/components/ui/button";
import CopyableClubId from "@/components/clubs/CopyableClubId";

type ClubInviteSharePanelProps = {
  joinCode: string;
};

export const ClubInviteSharePanel = ({
  joinCode,
}: ClubInviteSharePanelProps) => {
  const clubLink = `https://volleysmart.app/?ci=${encodeURIComponent(
    joinCode
  )}`;

  const inviteMessage = [
    "Hey, let's play Volleyball Smartly together. Register for free, and join my Club using this Club ID",
    `*${joinCode}*`,
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
    // Works when Messenger is installed / registered for this protocol
    openShareUrl(`fb-messenger://share?link=${encodedClubLink}`);
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Club ID block */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.16em] uppercase text-gray-500">
          Club ID
        </p>
        {/* Copyable pill */}
        <CopyableClubId slug={joinCode} />
      </div>

      {/* Share buttons */}
      <div className="space-y-3 w-full">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-[0.16em]">
          Share via
        </p>
        <div className="flex flex-row justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-16 px-0 text-xs font-semibold"
            onClick={handleShareWhatsApp}
          >
            WSP
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-16 px-0 text-xs font-semibold"
            onClick={handleShareTelegram}
          >
            TLGM
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-16 px-0 text-xs font-semibold"
            onClick={handleShareMessenger}
          >
            MSN
          </Button>
        </div>
      </div>
    </div>
  );
};

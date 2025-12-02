import CopyableClubId from "@/components/clubs/CopyableClubId";

/**
 * ClubInviteSharePanel
 *
 * Reusable component that:
 * - Displays a copyable Club ID with label rendered on top
 * - Shows "Share via" + three clickable app logos (WhatsApp, Telegram, Messenger)
 */

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
    openShareUrl(`fb-messenger://share?link=${encodedClubLink}`);
  };

  const iconBaseClasses =
    "flex flex-col items-center gap-1 text-xs text-gray-700 dark:text-gray-200";
  const imgClasses = "h-12 w-12 rounded-full shadow-sm";

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      {/* Club ID block (label handled by component, on top) */}
      <CopyableClubId
        slug={joinCode}
        label="Club ID"
        labelPosition="top"
        className="gap-2"
      />

      {/* Share logos */}
      <div className="w-full max-w-sm text-left">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
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
            <span>Messenger</span>
          </button>
        </div>
      </div>
    </div>
  );
};

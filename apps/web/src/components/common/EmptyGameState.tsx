/**
 * Reusable "no games" empty state used in Dashboard and Games pages
 */

import { EmptyTeamsState } from "@/components/team-generator/EmptyTeamsState";
import CopyableClubId from "@/components/clubs/CopyableClubId";

interface EmptyGameStateProps {
  clubName?: string | null;
  clubSlug?: string | null;
  memberCount: number;
  canGenerateTeams: boolean;
  canInviteMembers: boolean;
  onInviteMembers: () => void;
  onCreateGame: () => void;
  variant?: "dashboard" | "archive"; // Optional: controls title/text
}

export const EmptyGameState = ({
  clubName,
  clubSlug,
  memberCount,
  canGenerateTeams,
  canInviteMembers,
  onInviteMembers,
  onCreateGame,
  variant = "dashboard",
}: EmptyGameStateProps) => {
  const title =
    variant === "archive"
      ? "No games have been played yet."
      : "You haven't played any games yet.";

  const subtitle = canInviteMembers
    ? variant === "archive"
      ? "Start by creating your first game or inviting more members:"
      : "Proceed with inviting other members to your club or creating a game:"
    : "Wait for the club admin to invite more members or create a game:";

  return (
    <div className="max-w-lg w-full mx-auto text-center min-h-[80vh] flex flex-col items-center justify-center">
      {clubName && (
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
          Welcome to <span className="font-semibold">{clubName}</span>!
        </p>
      )}
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        {title}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">{subtitle}</p>
      <EmptyTeamsState
        canGenerateTeams={canGenerateTeams}
        onGenerateTeams={onCreateGame}
        onInviteMembers={onInviteMembers}
        canInviteMembers={canInviteMembers}
        memberCount={memberCount}
      />
      {clubSlug && (
        <div className="mt-10 mb-10 flex justify-end w-full">
          <CopyableClubId slug={clubSlug} />
        </div>
      )}
    </div>
  );
};

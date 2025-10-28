import { Button } from "@/components/ui/button";
import { Shuffle, Users } from "lucide-react";

/**
 * Empty state shown when there are no games yet.
 * Title/subtitle are derived from the current member count.
 */
interface EmptyTeamsStateProps {
  canGenerateTeams: boolean;
  onGenerateTeams: () => void;
  onInviteMembers: () => void;
  canInviteMembers?: boolean;
  memberCount: number; // number of members in the club
}

export const EmptyTeamsState = ({
  canGenerateTeams,
  onGenerateTeams,
  onInviteMembers,
  canInviteMembers = true,
  memberCount,
}: EmptyTeamsStateProps) => {
  // < 4  → "You need more members in your club."
  // ≥ 4  → "Enough members to start a Game"
  const title =
    memberCount < 4
      ? "You need more members in your club."
      : "Enough members to start a Game";

  // Keep the subtitle helpful and consistent with the title.
  const subtitle =
    memberCount < 4
      ? canInviteMembers
        ? "Invite more members (min. 4) to create your first Game"
        : "Min. 4 members required to create a game. Contact your admin to invite more members"
      : canInviteMembers
      ? "You're ready to create your first Game."
      : "You're ready to create your first Game. If needed, coordinate with your admin.";

  return (
    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 p-12">
      <div className="text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          {canInviteMembers && (
            <Button
              variant="outline"
              className="bg-amber-400 hover:bg-amber-500 border-amber-400 text-black"
              onClick={onInviteMembers}
            >
              Invite Members
            </Button>
          )}

          <Button
            disabled={!canGenerateTeams}
            onClick={onGenerateTeams}
            className="bg-volleyball-primary hover:bg-volleyball-primary/90"
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Create Game
          </Button>
        </div>
      </div>
    </div>
  );
};


import { Button } from "@/components/ui/button";
import { Shuffle, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyTeamsStateProps {
  canGenerateTeams: boolean;
  onGenerateTeams: () => void;
  onInviteMembers: () => void;
}

export const EmptyTeamsState = ({ 
  canGenerateTeams, 
  onGenerateTeams, 
  onInviteMembers 
}: EmptyTeamsStateProps) => {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 p-12">
      <div className="text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No members in your club</h3>
        <p className="mt-1 text-sm text-gray-500">
          Invite at least 6 members to create your first Game
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="outline" 
            className="bg-amber-400 hover:bg-amber-500 border-amber-400 text-black"
            onClick={onInviteMembers}
          >
            Invite Members
          </Button>
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

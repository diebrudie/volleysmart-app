
import { Button } from "@/components/ui/button";
import { Shuffle, Users } from "lucide-react";

interface EmptyTeamsStateProps {
  canGenerateTeams: boolean;
  onGenerateTeams: () => void;
}

export const EmptyTeamsState = ({ canGenerateTeams, onGenerateTeams }: EmptyTeamsStateProps) => {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 p-12">
      <div className="text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No teams generated yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select at least 6 players from the list and click "Generate Teams"
        </p>
        <div className="mt-6">
          <Button
            disabled={!canGenerateTeams}
            onClick={onGenerateTeams}
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Generate Teams
          </Button>
        </div>
      </div>
    </div>
  );
};

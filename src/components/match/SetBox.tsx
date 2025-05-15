
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SetBoxProps {
  setNumber: number;
  teamAScore: number | null;
  teamBScore: number | null;
  onScoreUpdate: (setNumber: number, teamAScore: number | null, teamBScore: number | null) => void;
  isLarge?: boolean;
}

const SetBox = ({
  setNumber,
  teamAScore: initialTeamAScore,
  teamBScore: initialTeamBScore,
  onScoreUpdate,
  isLarge = false,
}: SetBoxProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localTeamAScore, setLocalTeamAScore] = useState<number | null>(initialTeamAScore);
  const [localTeamBScore, setLocalTeamBScore] = useState<number | null>(initialTeamBScore);

  // Update local state when props change (e.g., after a successful update)
  useEffect(() => {
    setLocalTeamAScore(initialTeamAScore);
    setLocalTeamBScore(initialTeamBScore);
  }, [initialTeamAScore, initialTeamBScore]);

  const handleSubmit = () => {
    onScoreUpdate(setNumber, localTeamAScore, localTeamBScore);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset to initial values
    setLocalTeamAScore(initialTeamAScore);
    setLocalTeamBScore(initialTeamBScore);
    setIsEditing(false);
  };

  const getScoreColor = (scoreA: number | null, scoreB: number | null) => {
    if (scoreA === null || scoreB === null) return "";
    return scoreA > scoreB ? "text-volleyball-primary font-medium" : "text-volleyball-accent font-medium";
  };

  const getSubtitle = () => {
    if (initialTeamAScore === null || initialTeamBScore === null) {
      return "Not played yet";
    }
    return initialTeamAScore > initialTeamBScore ? "Team A won" : "Team B won";
  };

  return (
    <>
      <div 
        className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors ${
          isLarge ? "h-full" : ""
        }`}
      >
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h3 className="font-medium text-gray-700">Set {setNumber}</h3>
        </div>
        <div className="p-4">
          <div className="flex justify-between mb-2">
            <div className="text-sm text-gray-500">{getSubtitle()}</div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs h-7 px-2"
            >
              {initialTeamAScore === null && initialTeamBScore === null ? "Add Score" : "Edit"}
            </Button>
          </div>
          
          <div className="flex justify-center items-center space-x-4 py-2">
            <div className={`text-2xl ${getScoreColor(initialTeamAScore, initialTeamBScore)}`}>
              {initialTeamAScore ?? "-"}
            </div>
            <div className="text-xl text-gray-400">:</div>
            <div className={`text-2xl ${getScoreColor(initialTeamBScore, initialTeamAScore)}`}>
              {initialTeamBScore ?? "-"}
            </div>
          </div>
          
          <div className="flex justify-between mt-2">
            <div className="text-xs text-gray-500">Team A</div>
            <div className="text-xs text-gray-500">Team B</div>
          </div>
        </div>
      </div>
      
      <Dialog open={isEditing} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Set {setNumber} Score</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="teamAScore" className="text-sm">
                Team A Score
              </label>
              <Input
                id="teamAScore"
                type="number"
                min="0"
                value={localTeamAScore === null ? "" : localTeamAScore}
                onChange={(e) => setLocalTeamAScore(
                  e.target.value === "" ? null : Number(e.target.value)
                )}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="teamBScore" className="text-sm">
                Team B Score
              </label>
              <Input
                id="teamBScore"
                type="number"
                min="0"
                value={localTeamBScore === null ? "" : localTeamBScore}
                onChange={(e) => setLocalTeamBScore(
                  e.target.value === "" ? null : Number(e.target.value)
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SetBox;

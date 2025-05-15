
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

  // Calculate gradient percentage based on set number
  const getGradientPercentage = () => {
    switch (setNumber) {
      case 1: return '30%';
      case 2: return '45%';
      case 3: return '60%';
      case 4: return '75%';
      case 5: return '90%';
      default: return '50%';
    }
  };

  // Determine background color based on whether scores are set
  const getBgColor = () => {
    // If scores are not set, use grey color
    if (initialTeamAScore === null || initialTeamBScore === null) {
      return `bg-[#D8D6D3]`;
    }
    
    // If scores are set, use yellow with gradient
    return `bg-[#FBBE24]`;
  };

  return (
    <>
      <div 
        className={`rounded-lg overflow-hidden ${getBgColor()} ${isLarge ? "h-full" : ""}`}
        style={{ 
          backgroundImage: initialTeamAScore !== null && initialTeamBScore !== null ?
            `linear-gradient(to right, #FBBE24, #FBBE24 ${getGradientPercentage()}, #FBBE24)` : 
            'none' 
        }}
      >
        <div className="px-4 py-3 border-b border-gray-300">
          <h3 className="font-medium text-black text-xl">SET {setNumber}</h3>
        </div>
        <div className="p-6">
          <div className="flex justify-between mb-4">
            <div className="text-sm text-gray-700">
              {initialTeamAScore === null && initialTeamBScore === null 
                ? "Not played yet" 
                : initialTeamAScore! > initialTeamBScore! ? "Team A won" : "Team B won"}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs h-7 px-2 bg-white border-gray-300"
            >
              {initialTeamAScore === null && initialTeamBScore === null ? "Add Score" : "Edit"}
            </Button>
          </div>
          
          <div className="flex justify-center items-center space-x-6 py-4">
            <div className={`text-5xl font-bold ${initialTeamAScore !== null && initialTeamBScore !== null && initialTeamAScore > initialTeamBScore ? "text-black" : "text-gray-800"}`}>
              {initialTeamAScore ?? "0"}
            </div>
            <div className="text-4xl text-black font-bold">-</div>
            <div className={`text-5xl font-bold ${initialTeamAScore !== null && initialTeamBScore !== null && initialTeamBScore > initialTeamAScore ? "text-black" : "text-gray-800"}`}>
              {initialTeamBScore ?? "0"}
            </div>
          </div>
          
          <div className="flex justify-between mt-4">
            <div className="text-sm text-gray-700">Team A</div>
            <div className="text-sm text-gray-700">Team B</div>
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


import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
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

  // Get background color based on whether scores are set
  const getBackgroundStyle = () => {
    // If scores are not set, use grey color
    if (initialTeamAScore === null || initialTeamBScore === null) {
      return {
        backgroundColor: '#D8D6D3',
        backgroundImage: 'none'
      };
    }
    
    // If scores are set, use yellow with gradient based on set number
    return {
      backgroundColor: '#FBBE24',
      backgroundImage: `linear-gradient(to right, #FBBE24, #FBBE24 ${getGradientPercentage()}, #FBBE24)`
    };
  };

  return (
    <>
      <div 
        className={`rounded-lg overflow-hidden ${isLarge ? "h-full" : ""}`}
        style={getBackgroundStyle()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-300">
          <h3 className="font-medium text-black text-xl">SET {setNumber}</h3>
          <button 
            className="text-black"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex justify-center items-center py-6">
            <div className="text-6xl font-bold text-black">
              {initialTeamAScore ?? "0"}
            </div>
            <div className="text-6xl font-bold text-black mx-6">-</div>
            <div className="text-6xl font-bold text-black">
              {initialTeamBScore ?? "0"}
            </div>
          </div>
          
          <div className="text-center mt-2 text-sm">
            Team A vs. Team B
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


import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SetBoxProps {
  setNumber: number;
  teamAScore: number | null;
  teamBScore: number | null;
  onScoreUpdate: (setNumber: number, teamAScore: number | null, teamBScore: number | null) => void;
  isLarge?: boolean;
}

const SetBox = ({ setNumber, teamAScore, teamBScore, onScoreUpdate, isLarge = false }: SetBoxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localTeamAScore, setLocalTeamAScore] = useState<number | null>(teamAScore);
  const [localTeamBScore, setLocalTeamBScore] = useState<number | null>(teamBScore);

  // Update local state when props change
  useEffect(() => {
    setLocalTeamAScore(teamAScore);
    setLocalTeamBScore(teamBScore);
  }, [teamAScore, teamBScore]);

  const handleTeamAScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === "" ? null : parseInt(e.target.value, 10);
    setLocalTeamAScore(isNaN(value as number) ? null : value);
  };

  const handleTeamBScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === "" ? null : parseInt(e.target.value, 10);
    setLocalTeamBScore(isNaN(value as number) ? null : value);
  };

  const handleSubmit = () => {
    if (onScoreUpdate) {
      console.log('SetBox - Submitting score update:', {
        setNumber,
        teamAScore: localTeamAScore,
        teamBScore: localTeamBScore
      });
      
      onScoreUpdate(setNumber, localTeamAScore, localTeamBScore);
      setIsOpen(false);
    }
  };

  return (
    <div className="h-full">
      <div 
        className={`border border-gray-200 rounded-lg flex flex-col bg-white shadow-sm h-full cursor-pointer`}
        onClick={() => setIsOpen(true)}
      >
        <div className="bg-volleyball-primary text-white py-2 px-4 rounded-t-lg">
          <h3 className="font-medium text-center">Set {setNumber}</h3>
        </div>
        <div className={`flex-grow flex items-center justify-center p-4 ${isLarge ? 'py-12' : 'py-6'}`}>
          {teamAScore === null || teamBScore === null ? (
            <span className="text-gray-400">Not played</span>
          ) : (
            <div className={`flex items-center gap-2 ${isLarge ? 'text-4xl' : 'text-2xl'} font-bold`}>
              <span className="text-red-500">{teamAScore}</span>
              <span className="text-gray-400">-</span>
              <span className="text-emerald-500">{teamBScore}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dialog for score input */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Update Set {setNumber} Score</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="teamAScore" className="block text-sm font-medium text-gray-700 mb-1">
                  Team A Score
                </label>
                <Input
                  id="teamAScore"
                  type="number"
                  value={localTeamAScore === null ? '' : localTeamAScore}
                  onChange={handleTeamAScoreChange}
                  min={0}
                  className="w-full"
                />
              </div>
              
              <div>
                <label htmlFor="teamBScore" className="block text-sm font-medium text-gray-700 mb-1">
                  Team B Score
                </label>
                <Input
                  id="teamBScore"
                  type="number"
                  value={localTeamBScore === null ? '' : localTeamBScore}
                  onChange={handleTeamBScoreChange}
                  min={0}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SetBox;

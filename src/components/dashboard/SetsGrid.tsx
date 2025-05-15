
import SetBox from "@/components/match/SetBox";
import { MatchScore } from "@/hooks/use-club-data";

interface SetsGridProps {
  scores: MatchScore[];
  onScoreUpdate: (setNumber: number, teamAScore: number | null, teamBScore: number | null) => void;
}

const SetsGrid = ({ scores, onScoreUpdate }: SetsGridProps) => {
  // Function to find the score for a specific set
  const getSetScore = (setNumber: number) => {
    return scores.find(score => score.setNumber === setNumber);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {/* Set 1 - Larger box on the left spanning two rows */}
      <div className="md:col-span-1 md:row-span-2">
        <SetBox
          key={1}
          setNumber={1}
          teamAScore={getSetScore(1)?.teamAScore}
          teamBScore={getSetScore(1)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
          isLarge={true}
        />
      </div>

      {/* Top right section: Sets 2 and 4 */}
      <div>
        <SetBox
          key={2}
          setNumber={2}
          teamAScore={getSetScore(2)?.teamAScore}
          teamBScore={getSetScore(2)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
        />
      </div>
      <div>
        <SetBox
          key={4}
          setNumber={4}
          teamAScore={getSetScore(4)?.teamAScore}
          teamBScore={getSetScore(4)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
        />
      </div>

      {/* Bottom right section: Sets 3 and 5 */}
      <div>
        <SetBox
          key={3}
          setNumber={3}
          teamAScore={getSetScore(3)?.teamAScore}
          teamBScore={getSetScore(3)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
        />
      </div>
      <div>
        <SetBox
          key={5}
          setNumber={5}
          teamAScore={getSetScore(5)?.teamAScore}
          teamBScore={getSetScore(5)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
        />
      </div>
    </div>
  );
};

export default SetsGrid;

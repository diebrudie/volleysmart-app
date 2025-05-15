
import SetBox from "@/components/match/SetBox";
import { MatchScore } from "@/hooks/use-club-data";

interface SetsGridProps {
  scores: MatchScore[];
  onScoreUpdate: (setNumber: number, teamAScore: number | null, teamBScore: number | null) => void;
}

const SetsGrid = ({ scores, onScoreUpdate }: SetsGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Set 1 - Larger box on the left spanning two rows */}
      <div className="md:row-span-2">
        <SetBox
          key={1}
          setNumber={1}
          teamAScore={scores.find(score => score.setNumber === 1)?.teamAScore}
          teamBScore={scores.find(score => score.setNumber === 1)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
          isLarge={true}
        />
      </div>

      {/* Column 2 top row: Set 2 */}
      <div>
        <SetBox
          key={2}
          setNumber={2}
          teamAScore={scores.find(score => score.setNumber === 2)?.teamAScore}
          teamBScore={scores.find(score => score.setNumber === 2)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
        />
      </div>

      {/* Column 3 top row: Set 4 */}
      <div>
        <SetBox
          key={4}
          setNumber={4}
          teamAScore={scores.find(score => score.setNumber === 4)?.teamAScore}
          teamBScore={scores.find(score => score.setNumber === 4)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
        />
      </div>

      {/* Column 2 bottom row: Set 3 */}
      <div>
        <SetBox
          key={3}
          setNumber={3}
          teamAScore={scores.find(score => score.setNumber === 3)?.teamAScore}
          teamBScore={scores.find(score => score.setNumber === 3)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
        />
      </div>

      {/* Column 3 bottom row: Set 5 */}
      <div>
        <SetBox
          key={5}
          setNumber={5}
          teamAScore={scores.find(score => score.setNumber === 5)?.teamAScore}
          teamBScore={scores.find(score => score.setNumber === 5)?.teamBScore}
          onScoreUpdate={onScoreUpdate}
        />
      </div>
    </div>
  );
};

export default SetsGrid;

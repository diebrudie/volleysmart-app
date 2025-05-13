
interface ScoreOverviewProps {
  winner: string;
  teamAWins: number;
  teamBWins: number;
  hasPlayedAnySet: boolean;
}

const ScoreOverview = ({ winner, teamAWins, teamBWins, hasPlayedAnySet }: ScoreOverviewProps) => {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 h-full flex flex-col">
      <div className="bg-volleyball-primary text-white p-4 text-center">
        <h2 className="text-2xl font-bold">SCORE</h2>
      </div>
      <div className="bg-white p-6 text-center flex-grow flex flex-col justify-center">
        <h3 className="text-3xl font-bold mb-4">
          {hasPlayedAnySet ? winner : "TBD"}
        </h3>
        <div className="text-5xl font-bold">
          <span className="text-red-500">{teamAWins}</span> - <span className="text-emerald-500">{teamBWins}</span>
        </div>
      </div>
    </div>
  );
};

export default ScoreOverview;

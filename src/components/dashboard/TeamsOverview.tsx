
import { TeamData } from "@/hooks/use-club-data";

interface TeamsOverviewProps {
  teamA: TeamData;
  teamB: TeamData;
}

const TeamsOverview = ({ teamA, teamB }: TeamsOverviewProps) => {
  return (
    <div className="flex h-full rounded-lg overflow-hidden border border-gray-200">
      {/* Team A Card */}
      <div className="w-1/2 bg-white p-0">
        <h3 className="bg-red-500 text-white py-1 px-2 text-center">{teamA.name}</h3>
        <ul className="space-y-0.5 p-4">
          {teamA.players.map((player, index) => (
            <li key={player.id} className="text-sm">
              <span className="font-medium">{index + 1}. {player.name}</span> - <span className="text-gray-600">{player.position}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Team B Card */}
      <div className="w-1/2 bg-white p-0">
        <h3 className="bg-emerald-500 text-white py-1 px-2 text-center">{teamB.name}</h3>
        <ul className="space-y-0.5 p-4">
          {teamB.players.map((player, index) => (
            <li key={player.id} className="text-sm">
              <span className="font-medium">{index + 1}. {player.name}</span> - <span className="text-gray-600">{player.position}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TeamsOverview;

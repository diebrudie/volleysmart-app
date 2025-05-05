
import React from 'react';
import { Player } from "@/types/supabase";

interface TeamTableProps {
  team: Player[];
  teamLetter: string;
  colorClass: string;
}

export const TeamTable = ({ team, teamLetter, colorClass }: TeamTableProps) => {
  // Group players by position to show them in organized way
  const positionOrder = ["Setter", "Outside Hitter", "Middle Blocker", "Opposite Hitter", "Libero"];
  
  // Count genders
  const males = team.filter(p => p.gender === 'male').length;
  const females = team.filter(p => p.gender === 'female').length;
  
  const sortedTeam = [...team].sort((a, b) => {
    const aIndex = positionOrder.indexOf(a.preferredPosition);
    const bIndex = positionOrder.indexOf(b.preferredPosition);
    return aIndex - bIndex;
  });

  return (
    <div className="p-6 border-t md:border-t-0 md:border-l">
      <h3 className={`font-medium text-lg mb-4 flex items-center gap-2`}>
        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full bg-${colorClass} text-white text-xs font-bold`}>
          {teamLetter}
        </span>
        <span>Team {teamLetter}</span>
        <span className="text-sm text-gray-500 ml-auto">
          {males} M / {females} F
        </span>
      </h3>

      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Player
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Position
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Level
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedTeam.map(player => (
            <tr key={player.id}>
              <td className="px-4 py-2">
                <div className="flex items-center">
                  <div>
                    <div className="font-medium text-gray-900">{player.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{player.gender}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2 text-sm text-gray-500">
                {player.preferredPosition}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center justify-center">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-800 text-xs">
                    {player.skillRating}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

import React from "react";
import { Player } from "@/types/supabase";
import { formatShortName } from "@/lib/formatName";
import { normalizeRole, CANONICAL_ORDER } from "../../features/teams/positions";

interface TeamTableProps {
  team: Player[];
  teamLetter: string;
  colorClass: string;
}

export const TeamTable = ({ team, teamLetter, colorClass }: TeamTableProps) => {
  // Count genders
  const males = team.filter((p) => p.gender === "male").length;
  const females = team.filter((p) => p.gender === "female").length;

  // Sort players using the canonical volleyball order
  const sortedTeam = [...team].sort((a, b) => {
    const ar = normalizeRole(a.preferredPosition);
    const br = normalizeRole(b.preferredPosition);
    return CANONICAL_ORDER.indexOf(ar) - CANONICAL_ORDER.indexOf(br);
  });

  // Helper to format names safely using formatShortName
  const safeShortName = (p: Player): string => {
    // Prefer explicit fields if they exist
    const first = (p as { first_name?: string }).first_name ?? "";
    const last = (p as { last_name?: string }).last_name ?? "";

    if (first || last) return formatShortName(first, last);

    // Fallback to deriving from full name if only `name` exists
    const full = (p as { name?: string }).name ?? "";
    const parts = full.trim().split(/\s+/);
    const firstToken = parts[0] ?? "";
    const lastInitial =
      parts.length > 1 ? `${parts[parts.length - 1][0]?.toUpperCase()}.` : "";
    return [firstToken, lastInitial].filter(Boolean).join(" ").trim();
  };

  return (
    <div className="p-6 border-t md:border-t-0 md:border-l">
      <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center justify-center h-6 w-6 rounded-full bg-${colorClass} text-white text-xs font-bold`}
        >
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
          {sortedTeam.map((player) => (
            <tr key={player.id}>
              <td className="px-4 py-2">
                <div className="flex items-center">
                  <div>
                    <div className="font-medium text-gray-900">
                      {safeShortName(player)}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {player.gender}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2 text-sm text-gray-500">
                {normalizeRole(player.preferredPosition)}
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

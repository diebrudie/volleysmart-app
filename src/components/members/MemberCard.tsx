import { useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { buildImageUrl } from "@/utils/buildImageUrl";

interface MemberCardProps {
  member: {
    id: string;
    user_id?: string;
    role?: string; // 'admin' | 'member' | ...
    first_name: string;
    last_name: string;
    image_url?: string | null;
    member_association?: boolean;
    player_positions: Array<{
      is_primary: boolean | null;
      positions: {
        name: string;
      };
    }>;
  };
  /**
   * Viewer is admin (shows checkbox; we hide the Admin chip for admins).
   */
  isAdmin?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (checked: boolean) => void;
}

export const MemberCard = ({
  member,
  isAdmin = false,
  isSelected = false,
  onSelectionChange,
}: MemberCardProps) => {
  // Find the primary position
  const primaryPosition =
    member.player_positions?.find((pos) => pos.is_primary)?.positions.name ||
    "No position";

  // Local image fallback flags (avoid DOM mutation in onError)
  const [avatarErrored, setAvatarErrored] = useState(false);
  const [volleyballErrored, setVolleyballErrored] = useState(false);

  // Get first letter of last name
  const lastNameInitial = member.last_name
    ? member.last_name.charAt(0).toUpperCase()
    : "";

  return (
    <div className="relative">
      {isAdmin && (
        <div className="absolute top-2 right-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionChange}
            className="bg-white border-2 border-gray-300 shadow-sm w-5 h-5"
          />
        </div>
      )}
      <Card className="hover:shadow-lg transition-shadow h-full overflow-hidden">
        {/* Image Section - Full width (no badge here anymore) */}
        <div className="aspect-[4/3] w-full bg-gray-200 overflow-hidden">
          {member.image_url ? (
            <img
              src={buildImageUrl(member.image_url, {
                w: 800,
                q: 75,
                format: "webp",
              })}
              alt={`${member.first_name} ${member.last_name}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <img
              src="/avatar-placeholder.svg"
              alt={`${member.first_name} ${member.last_name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if SVG doesn't load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.parentElement!.innerHTML = `
                  <div class="w-full h-full bg-gray-300 flex items-center justify-center">
                    <svg class="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                    </svg>
                  </div>
                `;
              }}
            />
          )}
        </div>

        {/* Content Section - Left aligned with relative positioning for badge */}
        <CardContent className="p-4 relative">
          <div className="text-left space-y-1">
            <h3 className="font-semibold text-lg">
              {member.first_name} {lastNameInitial}.
            </h3>
            <p className="text-gray-600 text-sm font-medium">
              {primaryPosition}
            </p>
          </div>

          {/* Volleyball Badge - moved to bottom right of content area */}
          {member.member_association && (
            <div className="absolute bottom-4 right-4 w-5 h-5">
              <img
                src="/volleyball.svg"
                alt="Club member"
                className="w-full h-full"
                onError={(e) => {
                  // Fallback if volleyball SVG doesn't load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML = `
                    <div class="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-xs font-bold">V</span>
                    </div>
                  `;
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

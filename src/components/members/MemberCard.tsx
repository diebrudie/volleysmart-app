
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

interface MemberCardProps {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    image_url?: string;
    player_positions: Array<{
      is_primary: boolean;
      positions: {
        name: string;
      };
    }>;
  };
}

export const MemberCard = ({ member }: MemberCardProps) => {
  // Find the primary position
  const primaryPosition = member.player_positions?.find(
    (pos) => pos.is_primary
  )?.positions.name || "No position";

  return (
    <Link to={`/players/${member.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Profile Picture */}
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {member.image_url ? (
                <img
                  src={member.image_url}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            
            {/* Name */}
            <div>
              <h3 className="font-semibold text-lg">
                {member.first_name} {member.last_name}
              </h3>
              <p className="text-gray-600 text-sm">
                Main Position: {primaryPosition}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};


import { useEffect } from 'react';
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import Logo from "@/components/common/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { clubId, setClubId } = useClub();
  const navigate = useNavigate();
  const params = useParams();

  // Update clubId from URL params when available
  useEffect(() => {
    if (params.clubId && params.clubId !== clubId) {
      setClubId(params.clubId);
    }
  }, [params.clubId, clubId, setClubId]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDashboardClick = () => {
    if (clubId) {
      navigate(`/dashboard/${clubId}`);
    }
  };

  const handleArchiveClick = () => {
    if (clubId) {
      navigate(`/matches/${clubId}`);
    }
  };

  const handleMembersClick = () => {
    if (clubId) {
      navigate(`/members/${clubId}`);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleClubsClick = () => {
    navigate('/clubs');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo on the left */}
          <div className="flex items-center">
            <Logo size="md" />
          </div>

          {/* Three buttons in the middle */}
          {user && clubId && (
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleDashboardClick}
                className="text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={handleArchiveClick}
                className="text-gray-700 hover:text-gray-900"
              >
                Archive
              </Button>
              <Button
                variant="ghost"
                onClick={handleMembersClick}
                className="text-gray-700 hover:text-gray-900"
              >
                Members
              </Button>
            </div>
          )}

          {/* Profile circle on the right */}
          <div className="flex items-center">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleProfileClick}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClubsClick}>
                    Clubs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

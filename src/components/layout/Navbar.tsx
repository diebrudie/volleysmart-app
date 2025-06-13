
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, ChevronDown, Settings, Users } from "lucide-react";
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

  const handleCreateGameClick = () => {
    navigate('/new-game');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleClubsClick = () => {
    navigate('/clubs');
  };

  const handleSettingsClick = () => {
    // Navigate to settings page when implemented
    console.log('Settings clicked');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo on the left */}
          <div className="flex items-center">
            <Logo size="md" />
          </div>

          {/* Navigation buttons in the center */}
          <div className="flex items-center space-x-8">
            {user && clubId && (
              <>
                <Button
                  variant="ghost"
                  onClick={handleDashboardClick}
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleArchiveClick}
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Archive
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleMembersClick}
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Members
                </Button>
              </>
            )}
          </div>

          {/* Right side with Create Game button and Profile dropdown */}
          <div className="flex items-center space-x-4">
            {user && clubId && (
              <Button
                onClick={handleCreateGameClick}
                className="bg-[#243F8D] hover:bg-[#1e3575] text-white px-4 py-2 rounded-md font-medium"
              >
                Create Game
              </Button>
            )}
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1 text-gray-700">
                    <span className="font-medium">N</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClubsClick}>
                    <Users className="mr-2 h-4 w-4" />
                    Clubs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
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

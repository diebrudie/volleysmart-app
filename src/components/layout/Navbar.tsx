
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Users, Calendar } from "lucide-react";
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

  const handleMembersClick = () => {
    if (clubId) {
      navigate(`/members/${clubId}`);
    }
  };

  const handleMatchesClick = () => {
    navigate('/matches');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Logo size="md" />
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Button
                  variant="ghost"
                  onClick={handleMembersClick}
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Members</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleMatchesClick}
                  className="flex items-center space-x-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Matches</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <span className="font-medium">{user.name}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

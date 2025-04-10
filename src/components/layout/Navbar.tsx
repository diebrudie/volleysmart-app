
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Volleyball } from "lucide-react";

interface NavbarProps {
  isAuthenticated?: boolean;
  userRole?: 'admin' | 'editor' | 'user';
  onLogout?: () => void;
}

const Navbar = ({ isAuthenticated = false, userRole = 'user', onLogout }: NavbarProps) => {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-4 flex items-center justify-between border-b border-gray-200 lg:border-none">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Volleyball className="h-8 w-8 text-volleyball-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">VolleyTeam</span>
            </Link>
            <div className="ml-10 space-x-8 hidden md:block">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="text-base font-medium text-gray-700 hover:text-volleyball-primary">
                    Dashboard
                  </Link>
                  <Link to="/matches" className="text-base font-medium text-gray-700 hover:text-volleyball-primary">
                    Match Days
                  </Link>
                  <Link to="/players" className="text-base font-medium text-gray-700 hover:text-volleyball-primary">
                    Players
                  </Link>
                  {(userRole === 'admin' || userRole === 'editor') && (
                    <Link to="/generate-teams" className="text-base font-medium text-gray-700 hover:text-volleyball-primary">
                      Team Generator
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/#features" className="text-base font-medium text-gray-700 hover:text-volleyball-primary">
                    Features
                  </Link>
                  <Link to="/#about" className="text-base font-medium text-gray-700 hover:text-volleyball-primary">
                    About
                  </Link>
                  <Link to="/#contact" className="text-base font-medium text-gray-700 hover:text-volleyball-primary">
                    Contact
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="space-x-4 flex">
            {isAuthenticated ? (
              <Button variant="outline" onClick={onLogout}>Log out</Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="default">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;

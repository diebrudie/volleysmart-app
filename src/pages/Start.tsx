import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, UserPlus, UsersRound } from "lucide-react";
// AuthContext hook per CLAUDE.md patterns
import { useAuth } from "@/contexts/AuthContext";

const Start = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleCreateClub = () => {
    /*console.log(
      "[START]",
      "navigating from",
      location.pathname,
      "to",
      "/new-club",
      "reason: Create a New Club after onboarding"
    );*/

    navigate("/new-club");
  };

  const handleJoinClub = () => {
    /*console.log(
      "[START]",
      "navigating from",
      location.pathname,
      "to",
      "/join-club",
      "reason: Joining a Club after onboarding"
    );*/
    navigate("/join-club");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Top-right Logout control */}
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-900 dark:text-gray-100">
          What would you like to do next?
        </h1>
        <div className="grid grid-cols-1 gap-6 mt-8">
          <Button
            variant="primary"
            onClick={handleCreateClub}
            className="h-16 text-lg"
            size="lg"
            icon={<UserPlus className="h-6 w-6" />}
          >
            Create a Club
          </Button>
          <Button
            variant="action"
            onClick={handleJoinClub}
            className="h-16 text-lg"
            size="lg"
            icon={<UsersRound className="h-6 w-6" />}
          >
            Join a Club
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Start;

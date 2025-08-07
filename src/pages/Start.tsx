import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, UsersRound } from "lucide-react";

const Start = () => {
  const navigate = useNavigate();

  const handleCreateClub = () => {
    navigate("/new-club");
  };

  const handleJoinClub = () => {
    navigate("/join-club");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
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

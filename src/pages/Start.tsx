
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserPlus, UsersRound } from 'lucide-react';

const Start = () => {
  const navigate = useNavigate();

  const handleCreateClub = () => {
    navigate('/new-club');
  };

  const handleJoinClub = () => {
    // For now, navigate to the matches page
    navigate('/matches');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">
          What would you like to do next?
        </h1>
        <div className="grid grid-cols-1 gap-6 mt-8">
          <Button 
            onClick={handleCreateClub} 
            className="h-16 text-lg"
            size="lg"
          >
            <UserPlus className="mr-2 h-6 w-6" />
            Create a Club
          </Button>
          <Button 
            onClick={handleJoinClub} 
            className="h-16 text-lg"
            variant="outline"
            size="lg"
          >
            <UsersRound className="mr-2 h-6 w-6" />
            Join a Club
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Start;

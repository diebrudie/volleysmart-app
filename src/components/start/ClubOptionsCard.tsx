
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, UsersRound } from 'lucide-react';

interface ClubOptionsCardProps {
  onCreateClub: () => void;
  onJoinClub: () => void;
}

const ClubOptionsCard = ({ onCreateClub, onJoinClub }: ClubOptionsCardProps) => {
  return (
    <Card className="w-full max-w-lg bg-white rounded-lg shadow-md">
      <CardContent className="p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">
          What would you like to do next?
        </h1>
        <div className="grid grid-cols-1 gap-6 mt-8">
          <Button 
            onClick={onCreateClub} 
            className="h-16 text-lg"
            size="lg"
          >
            <UserPlus className="mr-2 h-6 w-6" />
            Create a Club
          </Button>
          <Button 
            onClick={onJoinClub} 
            className="h-16 text-lg"
            variant="outline"
            size="lg"
          >
            <UsersRound className="mr-2 h-6 w-6" />
            Join a Club
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClubOptionsCard;

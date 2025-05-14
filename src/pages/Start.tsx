
import { useState } from 'react';
import CreateClubDialog from '@/components/start/CreateClubDialog';
import JoinClubDialog from '@/components/start/JoinClubDialog';
import ClubOptionsCard from '@/components/start/ClubOptionsCard';

const Start = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <ClubOptionsCard 
        onCreateClub={() => setIsCreating(true)} 
        onJoinClub={() => setIsJoining(true)} 
      />
      
      <CreateClubDialog 
        isOpen={isCreating} 
        onOpenChange={setIsCreating} 
      />
      
      <JoinClubDialog 
        isOpen={isJoining} 
        onOpenChange={setIsJoining} 
      />
    </div>
  );
};

export default Start;


import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const NoClubMessage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <CardTitle>Join or Create a Club</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">You're not in a club yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              You need to join or create a club to see match history and player data.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate("/start")}
              className="w-full"
            >
              Create or Join a Club
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoClubMessage;

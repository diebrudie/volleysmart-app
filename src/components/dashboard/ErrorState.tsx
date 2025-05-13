
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ErrorState = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardContent className="text-center p-8">
          <h3 className="text-xl font-medium text-red-600 mb-4">Something went wrong</h3>
          <p className="text-gray-600 mb-6">
            We're having trouble connecting to our servers. Please try again later.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorState;

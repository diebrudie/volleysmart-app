
import { Spinner } from "@/components/ui/spinner";

const LoadingState = () => {
  return (
    <div className="flex-grow flex items-center justify-center">
      <Spinner className="h-8 w-8 text-volleyball-primary mr-2" />
      <span>Loading dashboard...</span>
    </div>
  );
};

export default LoadingState;

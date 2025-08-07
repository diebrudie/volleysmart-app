import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleReturnHome = () => {
    if (isAuthenticated) {
      const lastVisitedClub = localStorage.getItem("lastVisitedClub");
      if (lastVisitedClub) {
        navigate(`/dashboard/${lastVisitedClub}`);
      } else {
        navigate("/clubs");
      }
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          404
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
          Oops! Page not found
        </p>
        <Button variant="primary" onClick={handleReturnHome}>
          Return Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

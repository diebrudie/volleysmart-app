
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";

const HeroSection = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-gradient-to-br from-volleyball-primary to-volleyball-primary/80 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex flex-col lg:flex-row items-center">
        <div className="lg:w-1/2 lg:pr-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Fair & Fun Volleyball Team Generator
          </h1>
          <p className="mt-4 text-lg md:text-xl opacity-90">
            Create balanced teams, track match history, and manage your players - all in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="lg" className="w-full sm:w-auto bg-volleyball-secondary text-volleyball-primary hover:bg-volleyball-secondary/90">
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto bg-volleyball-secondary text-volleyball-primary hover:bg-volleyball-secondary/90">Sign up for free</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 text-white border-white hover:bg-white/20">Log in</Button>
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="lg:w-1/2 mt-12 lg:mt-0">
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80" 
              alt="Happy people playing volleyball" 
              className="rounded-lg shadow-xl max-w-full mx-auto" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

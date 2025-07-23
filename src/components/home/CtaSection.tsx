import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import TestimonialCard from "./TestimonialCard";

const CtaSection = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section id="contact" className="bg-volleyball-primary">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:py-20 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Ready to transform your volleyball matches?
            </h2>
            <p className="mt-3 max-w-3xl text-lg text-blue-100">
              Join other volleyball enthusiasts who are already using our
              platform to organize fair and fun matches.
            </p>
            <div className="mt-8">
              <div className="inline-flex rounded-md shadow">
                {isAuthenticated ? (
                  <Link to="/login">
                    <Button
                      size="lg"
                      className="bg-volleyball-secondary text-volleyball-primary hover:bg-volleyball-secondary/90"
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="bg-volleyball-secondary text-volleyball-primary hover:bg-volleyball-secondary/90"
                    >
                      Get Started for Free
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="mt-8 lg:mt-0">
            <TestimonialCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;

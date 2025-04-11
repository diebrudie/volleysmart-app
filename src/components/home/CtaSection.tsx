
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

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
              Join other volleyball enthusiasts who are already using our platform to organize fair and fun matches.
            </p>
            <div className="mt-8">
              <div className="inline-flex rounded-md shadow">
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button size="lg" className="bg-volleyball-secondary text-volleyball-primary hover:bg-volleyball-secondary/90">
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link to="/signup">
                    <Button size="lg" className="bg-volleyball-secondary text-volleyball-primary hover:bg-volleyball-secondary/90">
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

const TestimonialCard = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-medium text-gray-900">What our users say</h3>
      <div className="mt-4 text-gray-600">
        <p className="italic">
          "This app has made organizing our weekly volleyball matches so much easier. The teams are always balanced and everyone gets to play positions they're comfortable with."
        </p>
        <div className="mt-3 flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-volleyball-secondary flex items-center justify-center text-volleyball-primary font-bold">
              JD
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">John Doe</p>
            <p className="text-sm text-gray-500">Volleyball Club Captain</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CtaSection;

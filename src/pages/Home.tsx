
import { Link } from "react-router-dom";
import { CheckCircle, Users, Calendar, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={isAuthenticated} onLogout={logout} />
      
      {/* Hero Section */}
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
      
      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Features designed for volleyball enthusiasts
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-3xl mx-auto">
              Everything you need to organize your volleyball matches efficiently and fairly.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="h-12 w-12 bg-volleyball-primary/10 rounded-lg flex items-center justify-center mb-5">
                <Users className="h-6 w-6 text-volleyball-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Fair Team Generator</h3>
              <p className="mt-2 text-gray-500">
                Create balanced teams automatically based on player positions and skill levels.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="h-12 w-12 bg-volleyball-primary/10 rounded-lg flex items-center justify-center mb-5">
                <Calendar className="h-6 w-6 text-volleyball-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Match History</h3>
              <p className="mt-2 text-gray-500">
                Keep track of all match results, team compositions, and player statistics.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="h-12 w-12 bg-volleyball-primary/10 rounded-lg flex items-center justify-center mb-5">
                <Award className="h-6 w-6 text-volleyball-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Player Profiles</h3>
              <p className="mt-2 text-gray-500">
                Track player positions, attendance, and performance over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-3xl mx-auto">
              Simple steps to get your volleyball team organized
            </p>
          </div>

          <div className="mt-16 max-w-4xl mx-auto">
            <ul className="space-y-10">
              <li className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-volleyball-primary text-white text-xl font-bold">
                    1
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-medium text-gray-900">Register Your Players</h3>
                  <p className="mt-2 text-gray-500">
                    Add your players and their preferred positions to the system.
                  </p>
                </div>
              </li>

              <li className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-volleyball-primary text-white text-xl font-bold">
                    2
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-medium text-gray-900">Generate Balanced Teams</h3>
                  <p className="mt-2 text-gray-500">
                    Select which players are available and let our algorithm create fair teams.
                  </p>
                </div>
              </li>

              <li className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-volleyball-primary text-white text-xl font-bold">
                    3
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-medium text-gray-900">Track Match Results</h3>
                  <p className="mt-2 text-gray-500">
                    Record game scores and keep a history of all matches played.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;

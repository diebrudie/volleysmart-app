import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const HeroSection = () => {
  const { isAuthenticated } = useAuth();

  const handleWatchDemo = () => {
    // Scroll to demo section (you can add this later)
    const demoSection = document.getElementById("demo-section");
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 sm:pt-20 bg-gradient-hero">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80"
          alt="Happy people playing volleyball"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-white">
            {isAuthenticated ? (
              <>
                Welcome Back to{" "}
                <span className="text-gradient">VolleyMatch</span>
              </>
            ) : (
              <>
                Elevate Your <span className="text-gradient">Volleyball</span>{" "}
                Game
              </>
            )}
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {isAuthenticated
              ? "Create balanced teams, track match history, and manage your players - all in one place."
              : "Smart team creation, real-time scoring, and comprehensive player management. The all-in-one platform that transforms how you organize and play volleyball."}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="hero" size="hero" className="hover-lift">
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup">
                  <Button variant="hero" size="hero" className="hover-lift">
                    Start Your Free Game
                  </Button>
                </Link>
                <Button
                  variant="glass"
                  size="lg"
                  className="hover-lift text-white"
                  onClick={handleWatchDemo}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
            {[
              { number: "10K+", label: "Active Players" },
              { number: "500+", label: "Clubs Created" },
              { number: "25K+", label: "Games Played" },
            ].map((stat, index) => (
              <div key={index} className="glass rounded-xl p-6 hover-lift">
                <div className="text-3xl font-bold text-gradient">
                  {stat.number}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

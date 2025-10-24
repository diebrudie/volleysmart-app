/**
 * Bright two-column hero with responsive inversion and absolute-cover image on md+
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const HeroSection = () => {
  const { isAuthenticated } = useAuth();

  const handleWatchDemo = () => {
    const demoSection = document.getElementById("demo-section");
    if (demoSection) demoSection.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="bg-[#F9FAFB] py-20 md:py-32">
      <div className="container mx-auto px-6 md:px-12 lg:px-16 flex flex-col md:flex-row items-center gap-12">
        {/* Left: content (stack first on mobile) */}
        <div className="flex-1 text-center md:text-left space-y-6 order-2 md:order-1">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
            Elevate Your{" "}
            <span className="whitespace-nowrap">
              <span className="text-volleyball-primary">Volleyball</span>
              &nbsp;Games
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto md:mx-0 leading-relaxed">
            Smart team creation, score tracking, and comprehensive player
            management. The all-in-one platform that transforms how you organize
            and play volleyball.
          </p>

          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-4">
            <Link to={isAuthenticated ? "/clubs" : "/signup"}>
              <Button size="lg" className="w-full sm:w-auto">
                Join today
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={handleWatchDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Right: image (shows second on mobile; absolute-cover on md+) */}
        <div className="flex-1 order-1 md:order-2 w-full">
          {/* Desktop/Tablet: absolute-cover, vertical-ish crop */}
          <div className="relative hidden md:block w-full h-[520px] rounded-2xl overflow-hidden shadow-lg">
            <img
              src="/img-volleyball-team-v2.png"
              alt="Volleyball team cheering"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
          </div>

          {/* Mobile: standard responsive image */}
          <img
            src="/img-volleyball-team-v2.png"
            alt="Volleyball team cheering"
            className="md:hidden w-full h-auto rounded-2xl shadow-lg object-cover"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

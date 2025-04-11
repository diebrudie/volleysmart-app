
import { Users, Calendar, Award } from "lucide-react";
import FeatureCard from "./FeatureCard";

const FeaturesSection = () => {
  return (
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
          <FeatureCard 
            icon={Users} 
            title="Fair Team Generator" 
            description="Create balanced teams automatically based on player positions and skill levels."
          />
          <FeatureCard 
            icon={Calendar} 
            title="Match History" 
            description="Keep track of all match results, team compositions, and player statistics."
          />
          <FeatureCard 
            icon={Award} 
            title="Player Profiles" 
            description="Track player positions, attendance, and performance over time."
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

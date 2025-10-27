/**
 * Refactored FeaturesSection to use images instead of icons.
 * Each feature now displays an image, title, and description.
 * Layout is responsive (stacked on mobile, grid on desktop).
 */

import React from "react";

interface Feature {
  title: string;
  description: string;
  image: string;
  alt: string;
}

const FeaturesSection: React.FC = () => {
  const features: Feature[] = [
    {
      title: "Smart Team Generation",
      description:
        "Create balanced teams automatically based on player positions and skill levels.",
      image: "/img-home-teamCelebrating-v2.png",
      alt: "Players celebrating after volleyball match",
    },
    {
      title: "Game & Score Tracking",
      description:
        "Real-time scoring system with detailed match analytics, set-by-set breakdowns, and comprehensive game history.",
      image: "/img-home-scoreboard-v1.png",
      alt: "Scoreboard tracking live volleyball game",
    },
    {
      title: "Players & Clubs Management",
      description:
        "Create as many Volleyball Clubs as you want, invite friends, and seamless member management in one intuitive platform.",
      image: "/img-home-manageClubs-v1.png",
      alt: "Dashboard for managing volleyball clubs and members",
    },
  ];

  return (
    <section className="py-24 relative bg-[#DCE0E4]">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to <span className="text-gradient">Play</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Organize your volleyball games efficiently and fairly. Designed for
            volleyball enthusiasts.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-left space-y-6"
            >
              <div className="w-full overflow-hidden rounded-2xl shadow-lg aspect-[4/3]">
                <img
                  src={feature.image}
                  alt={feature.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

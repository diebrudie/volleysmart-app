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
        "Balanced teams in one tap. The algorithm considers skill ratings, preferred positions, and team size to create fair matchups every time.",
      image: "/img-home-teamCelebrating-v2.png",
      alt: "Players celebrating after volleyball match",
    },
    {
      title: "Live Score Tracking",
      description:
        "Track set-by-set scores in real time — any team player can add or edit scores. Browse your full game archive with complete results.",
      image: "/img-home-scoreboard-v1.png",
      alt: "Scoreboard tracking live volleyball game",
    },
    {
      title: "Clubs, Events & RSVP",
      description:
        "Create clubs, plan events with RSVP deadlines, manage members, and handle join requests. Real-time notifications keep everyone in the loop.",
      image: "/img-home-manageClubs-v1.png",
      alt: "Dashboard for managing volleyball clubs and members",
    },
  ];

  return (
    <section id="features" className="py-24 relative bg-[#DCE0E4]">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            Everything You Need to <span className="text-gradient">Play</span>
          </h2>
          <p className="text-xl text-gray-500">
            From planning events to tracking scores — everything your volleyball
            community needs, in one place.
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
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
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

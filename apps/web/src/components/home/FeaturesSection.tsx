/**
 * Refactored FeaturesSection to use images instead of icons.
 * Each feature now displays an image, title, and description.
 * Layout is responsive (stacked on mobile, grid on desktop).
 */

import React from "react";
import { useTranslation } from "react-i18next";

interface Feature {
  titleKey: string;
  descriptionKey: string;
  image: string;
  alt: string;
}

const FeaturesSection: React.FC = () => {
  const { t } = useTranslation("home");

  const features: Feature[] = [
    {
      titleKey: "features.smartTeams.title",
      descriptionKey: "features.smartTeams.description",
      image: "/img-home-teamCelebrating-v2.png",
      alt: "Players celebrating after volleyball match",
    },
    {
      titleKey: "features.liveScore.title",
      descriptionKey: "features.liveScore.description",
      image: "/img-home-scoreboard-v1.png",
      alt: "Scoreboard tracking live volleyball game",
    },
    {
      titleKey: "features.clubs.title",
      descriptionKey: "features.clubs.description",
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
            {t("features.heading")} <span className="text-gradient">{t("features.headingHighlight")}</span>
          </h2>
          <p className="text-xl text-gray-500">
            {t("features.subheading")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((feature) => (
            <div
              key={feature.titleKey}
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
                  {t(feature.titleKey)}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {t(feature.descriptionKey)}
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

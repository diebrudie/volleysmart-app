import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PricingSection: React.FC = () => {
  const { t } = useTranslation("home");

  const freeFeatures = [
    t("pricing.free.features.clubs"),
    t("pricing.free.features.events"),
    t("pricing.free.features.games"),
    t("pricing.free.features.liveScore"),
    t("pricing.free.features.notifications"),
  ];

  const premiumFeatures = [
    t("pricing.premium.features.personal"),
    t("pricing.premium.features.club"),
    t("pricing.premium.features.city"),
    t("pricing.premium.features.teams"),
    t("pricing.premium.features.export"),
    t("pricing.premium.features.more"),
  ];

  return (
    <section id="pricing" className="bg-[#DCE0E4] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t("pricing.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </div>

        {/* Cards wrapper with early adopter badge overlapping */}
        <div className="relative max-w-4xl mx-auto">
          {/* Early adopter badge — centered, overlaps the cards */}
          <div className="flex justify-center mb-[-18px] relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border-2 border-amber-300 px-5 py-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">
                {t("pricing.earlyAdopter")}
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Card */}
            <div className="rounded-2xl bg-white p-8 pt-7 shadow-sm border border-gray-200 flex flex-col">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {t("pricing.free.name")}
              </h3>
              <p className="text-gray-500 mb-6">
                {t("pricing.free.price")}
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/signup">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-gray-900 text-gray-900 hover:bg-gray-100"
                >
                  {t("pricing.free.cta")}
                </Button>
              </Link>
            </div>

            {/* Premium Card */}
            <div className="rounded-2xl bg-[hsl(var(--primary))] p-8 pt-7 shadow-lg border border-[hsl(var(--primary))] flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full">
                  {t("pricing.premium.badge")}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-1">
                {t("pricing.premium.name")}
              </h3>
              <p className="text-white/70 mb-6">
                {t("pricing.premium.price")}
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="text-sm font-medium text-white/70 mb-1">
                  {t("pricing.premium.features.free")}
                </li>
                {premiumFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-white/90 mt-0.5 shrink-0" />
                    <span className="text-white/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                size="lg"
                disabled
                className="w-full border-white/30 text-white bg-white/10 hover:bg-white/20 cursor-not-allowed"
              >
                {t("pricing.premium.cta")}
              </Button>
            </div>
          </div>

          {/* Early adopter description — tucked below */}
          <p className="text-center text-sm text-gray-500 mt-5 max-w-lg mx-auto">
            {t("pricing.earlyAdopterDesc")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

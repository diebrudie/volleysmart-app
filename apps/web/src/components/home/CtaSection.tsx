import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * CTA Section (forced light section, accessible)
 * - White section background to match new homepage style
 * - High-contrast brand gradient card using Tailwind tokens (bg-gradient-primary)
 * - White text on the card; button is white with primary text for contrast
 * - Content unchanged (tag, headline, paragraph, button, subtext)
 */
const CTA = () => {
  const { t } = useTranslation("home");

  return (
    <section className="bg-white text-gray-900 pb-24">
      <div className="container mx-auto px-6">
        {/* Gradient card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-primary px-8 py-14 md:px-16 text-center shadow-lg">
          {/* Decorative speckles (subtle, do not reduce contrast) */}
          <div className="pointer-events-none absolute top-20 left-10 h-3 w-3 rounded-full bg-white/25 animate-pulse" />
          <div className="pointer-events-none absolute bottom-8 right-8 h-2 w-2 rounded-full bg-white/20 animate-pulse delay-1000" />
          <div className="pointer-events-none absolute top-1/2 left-8 h-4 w-4 rounded-full bg-white/20 animate-pulse delay-500" />

          <div className="relative z-10 mx-auto max-w-3xl">
            {/* Tag pill */}
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">
                  {t("cta.heading")}
                </span>
              </div>
            </div>

            <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
              {t("cta.highlight")}
            </h2>

            <p className="mb-10 text-xl leading-relaxed text-white/90">
              {t("cta.description")}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60"
                >
                  {t("cta.button")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;

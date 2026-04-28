import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Users,
  Volleyball,
  TrendingUp,
  LucideIcon,
} from "lucide-react";

/**
 * HowItWorksSection
 * - White background, dark text
 * - Left column: Heading, subheading, primary CTA (/signup)
 * - Right column: Vertical stepper with gradient numbered circles
 * - Mobile: stacks; Desktop: two columns
 */

type Step = {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
};

const STEPS: Step[] = [
  {
    icon: Users,
    titleKey: "howItWorks.step1.title",
    descriptionKey: "howItWorks.step1.description",
  },
  {
    icon: UserPlus,
    titleKey: "howItWorks.step2.title",
    descriptionKey: "howItWorks.step2.description",
  },
  {
    icon: Volleyball,
    titleKey: "howItWorks.step3.title",
    descriptionKey: "howItWorks.step3.description",
  },
  {
    icon: TrendingUp,
    titleKey: "howItWorks.step4.title",
    descriptionKey: "howItWorks.step4.description",
  },
];

/** Numbered gradient circle (reuses brand primary gradient) */
function StepNumberCircle({ index }: { index: number }) {
  return (
    <div
      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white font-semibold flex items-center justify-center shadow-lg"
      aria-hidden="true"
    >
      {index + 1}
    </div>
  );
}

export default function HowItWorksSection() {
  const { t } = useTranslation("home");

  return (
    <section id="how-it-works" className="bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: heading, subheading, CTA */}
          <div className="max-w-xl">
            <h2 className="text-5xl sm:text-4xl font-bold tracking-tight">
              {t("howItWorks.heading")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("howItWorks.subheading")}
            </p>
            <div className="mt-8">
              <Link to="/signup">
                <Button size="lg">{t("howItWorks.cta")}</Button>
              </Link>
            </div>
          </div>

          {/* Right: steps */}
          <div className="relative">
            {/* Vertical guideline (desktop only) */}
            <div className="absolute left-5 top-0 bottom-0 hidden lg:block">
              <div className="w-px h-full bg-muted" />
            </div>

            <ol className="space-y-16">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <li key={step.titleKey} className="relative flex gap-4">
                    <div className="shrink-0">
                      <StepNumberCircle index={idx} />
                    </div>

                    <div className="pt-1 pl-2">
                      <h3 className="text-xl font-semibold leading-none flex items-center gap-2">
                        <Icon
                          className="h-5 w-5 text-primary"
                          aria-hidden="true"
                        />
                        {t(step.titleKey)}
                      </h3>
                      <p className="mt-2 text-lg text-gray-600 leading-8">
                        {t(step.descriptionKey)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Demo Video Section — commented out until a real demo video is ready
        <div className="text-center pt-20 mt-7" id="demo-section">
          <h3 className="text-3xl font-bold mb-9">See It In Action</h3>
          <div className="sm:glass sm:rounded-2xl mx-1 sm:p-0 max-w-4xl sm:mx-auto -mx-4">
            <div className="relative aspect-video bg-amber-300 rounded-xl overflow-hidden">
              TODO: Replace with real demo video embed
            </div>
          </div>
        </div>
        */}
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
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
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: Users,
    title: "Start a Club",
    description:
      "Create your volleyball club in seconds. Share your Club ID so players can request to join — no app download required.",
  },
  {
    icon: UserPlus,
    title: "Plan Events & RSVP",
    description:
      "Schedule practices, friendly matches, or league games. Players RSVP with a tap, and you can set deadlines to lock attendance.",
  },
  {
    icon: Volleyball,
    title: "Generate Fair Teams",
    description:
      "One tap creates balanced teams based on skill ratings and preferred positions. Edit teams or add guest players on the fly.",
  },
  {
    icon: TrendingUp,
    title: "Track Scores & History",
    description:
      "Record set-by-set scores in real time. Any team player can add scores. Browse your full game archive anytime.",
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
  return (
    <section id="how-it-works" className="bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: heading, subheading, CTA */}
          <div className="max-w-xl">
            <h2 className="text-5xl sm:text-4xl font-bold tracking-tight">
              How&nbsp;It&nbsp;Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get started in minutes with our simple, intuitive process.
            </p>
            <div className="mt-8">
              <Link to="/signup">
                <Button size="lg">Join today</Button>
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
                  <li key={step.title} className="relative flex gap-4">
                    {/* Number circle */}
                    <div className="shrink-0">
                      <StepNumberCircle index={idx} />
                    </div>

                    {/* Title (icon inline) + description */}
                    <div className="pt-1 pl-2">
                      <h3 className="text-xl font-semibold leading-none flex items-center gap-2">
                        <Icon
                          className="h-5 w-5 text-primary"
                          aria-hidden="true"
                        />
                        {step.title}
                      </h3>
                      <p className="mt-2 text-lg text-gray-600 leading-8">
                        {step.description}
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

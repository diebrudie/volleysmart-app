import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Users,
  Volleyball,
  TrendingUp,
  LucideIcon,
  Play,
} from "lucide-react";
import type { SVGProps } from "react";
import { useState, useCallback } from "react";

/**
 * HowItWorksSection
 * - White background, dark text
 * - Left column: Heading, subheading, primary CTA (/signup)
 * - Right column: Vertical stepper with gradient numbered circles
 * - Mobile: stacks; Desktop: two columns
 */

type IconType = (props: SVGProps<SVGSVGElement>) => JSX.Element;

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
      "Set up your volleyball club in less than 20 seconds. A name and a picture is all you need.",
  },
  {
    icon: UserPlus,
    title: "Invite Players",
    description:
      "Invite players to your Club via Email or users can actively join a Club — no downloads required.",
  },
  {
    icon: Volleyball,
    title: "Generate Fair Teams",
    description:
      "Create balanced teams automatically with one tap and jump right in.",
  },
  {
    icon: TrendingUp,
    title: "Track Games & Stats",
    description:
      "Record scores and attendance to keep things fair and transparent.",
  },
];

/** Numbered gradient circle (reuses brand primary gradient) */
function StepNumberCircle({ index }: { index: number }) {
  return (
    <div
      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white font-semibold flex items-center justify-center shadow-lg"
      aria-hidden="true"
    >
      {index + 1}
    </div>
  );
}

export default function HowItWorksSection() {
  // Local state to control Vimeo mount/unmount
  const [isPlaying, setIsPlaying] = useState(false);
  const handleToggle = useCallback(() => setIsPlaying((p) => !p), []);
  return (
    <section id="how-it-works" className="bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: heading, subheading, CTA */}
          <div className="max-w-xl">
            <h2 className="text-5xl sm:text-4xl font-bold tracking-tight">
              How&nbsp;It&nbsp;Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
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
                      <p className="mt-2 text-lg text-muted-foreground leading-8">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Divider line */}
        {/* <div className="flex justify-center pt-16">
            <div className="h-px bg-[#F1F5F9] w-[85%] lg:w-[75%]" />
          </div> */}

        {/* Video Section */}
        <div className="text-center pt-20 mt-7" id="demo-section">
          <h3 className="text-3xl font-bold mb-9">See It In Action</h3>

          <div className="sm:glass sm:rounded-2xl mx-1 sm:p-0 max-w-4xl sm:mx-auto -mx-4">
            <div className="relative aspect-video bg-amber-300 rounded-xl overflow-hidden border border-transparent transition-colors hover:border-white/40">
              {/* Poster with high-contrast CTA */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/25 to-secondary-glow/40 flex items-center justify-center">
                  {/* Background placeholder image */}
                  {/* <img
                    src="/img-appScreen-dashboard-GameAndScoreTracking.png"
                    alt="App dashboard preview"
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                  /> */}
                  <Button
                    size="lg"
                    className="backdrop-blur-sm text-white border border-white/40 hover:bg-black/20"
                    onClick={() => setIsPlaying(true)}
                  >
                    <Play className="w-6 h-6 mr-2 text-white" />
                    Watch Demo Video
                  </Button>

                  {/* Subtle animated speckles */}
                  <div className="hidden sm:block absolute top-15 left-5 w-3 h-3 rounded-full bg-white/30 animate-pulse" />
                  <div className="hidden sm:block absolute top-8 right-8 w-2 h-2 rounded-full bg-white/20 animate-pulse delay-1000" />
                  <div className="hidden sm:block absolute top-20 right-25 w-4 h-4 rounded-full bg-white/40 animate-pulse delay-1000" />
                  <div className="hidden sm:block absolute bottom-6 left-11 w-4 h-4 rounded-full bg-white/25 animate-pulse delay-500" />
                  <div className="hidden sm:block absolute bottom-14 right-9 w-3 h-3 rounded-full bg-white/40 animate-pulse delay-1000" />
                </div>
              )}

              {/* Vimeo iframe is mounted only while playing; click anywhere to stop */}
              {isPlaying && (
                <>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src="https://player.vimeo.com/video/734358851?autoplay=1&muted=0&playsinline=1&title=0&byline=0&portrait=0"
                    title="VolleySmart Demo"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                  <button
                    aria-label="Stop video"
                    className="absolute inset-0"
                    onClick={handleToggle}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

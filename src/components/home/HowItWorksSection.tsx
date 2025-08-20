import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Users,
  UserCheck,
  Volleyball,
  TrendingUp,
  Play,
} from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Users,
      title: "Start a Club",
      description: "Set up your volleyball club in less than 20 seconds.",
    },
    {
      icon: UserCheck,
      title: "Invite Your Crew",
      description:
        "Send an invite so friends and teammates can join your Club easily.",
    },
    {
      icon: Volleyball,
      title: "Create Games",
      description:
        "Select the players, add a date, and the app will generate fair, balanced teams for you.",
    },
    {
      icon: TrendingUp,
      title: "Play & Track",
      description:
        "Record set scores, save match history, and watch your stats grow over time.",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Get started in minutes with our simple, intuitive process.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Step Number & Icon */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-xl glass-primary flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-primary text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 group-hover:text-gradient transition-all">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector Line (hidden on mobile, last item) */}
              {/*index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-glass-border to-transparent -translate-x-1/2 z-0" />
              )*/}
            </div>
          ))}
        </div>

        {/* Video Section */}
        <div className="text-center pt-20" id="demo-section">
          <h3 className="text-2xl font-bold mb-8">See It In Action</h3>
          <div className="glass rounded-2xl p-8 max-w-4xl mx-auto hover-lift">
            <div className="aspect-video bg-gradient-primary rounded-xl flex items-center justify-center relative overflow-hidden">
              {/* Placeholder Video Area */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary-glow/30 flex items-center justify-center">
                <Button variant="glass" size="lg" className="backdrop-blur-sm">
                  <Play className="w-6 h-6 mr-2" />
                  Watch Demo Video
                </Button>
              </div>

              {/* Animated Background Elements */}
              <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-white/30 animate-pulse" />
              <div className="absolute top-8 right-8 w-2 h-2 rounded-full bg-white/20 animate-pulse delay-1000" />
              <div className="absolute bottom-6 left-8 w-4 h-4 rounded-full bg-white/25 animate-pulse delay-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

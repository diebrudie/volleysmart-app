import { Users, Trophy, Settings } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Users,
      title: "Smart Team Generation",
      description:
        "Create balanced teams automatically based on player positions and skill levels.",
    },
    {
      icon: Trophy,
      title: "Game & Score Tracking",
      description:
        "Real-time scoring system with detailed match analytics, set-by-set breakdowns, and comprehensive game history.",
    },
    {
      icon: Settings,
      title: "Players & Clubs Management",
      description:
        "Create as many Volleyball Clubs as you want, invite friends, and seamless member management in one intuitive platform.",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to <span className="text-gradient">Play</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Organize your volleyball games efficiently and fairly. Designed for
            volleyball enthusiasts.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="glass rounded-xl p-8 group">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 transition-all">
                  {feature.title}
                </h3>
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

export default Features;

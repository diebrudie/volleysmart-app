import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="glass-primary rounded-2xl p-12 md:p-16 text-center relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          <div className="absolute bottom-8 right-8 w-6 h-6 rounded-full bg-white/15 animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-8 w-4 h-4 rounded-full bg-white/20 animate-pulse delay-500" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  Ready to Get Started?
                </span>
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Join Thousands of Players Using{" "}
              <span className="text-primary-glow">VolleyMatch</span>
            </h2>

            <p className="text-xl text-white/80 mb-10 leading-relaxed">
              Start organizing better games today. Create balanced teams, track
              scores, and build your volleyball community - all for free.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/signup">
                <Button
                  variant="hero"
                  size="hero"
                  className="bg-white text-primary hover:bg-white/90"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            <p className="text-sm text-white/60 mt-6">
              No credit card required • Free forever • Setup in 2 minutes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;

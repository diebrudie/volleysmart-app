import { Navigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Fragment, useEffect } from "react";
import { useLocation } from "react-router-dom";

// Import the new component files
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FaqsSection from "@/components/home/FaqsSection";
import CtaSection from "@/components/home/CtaSection";

const Home = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location.hash]);

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/clubs" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FaqsSection />
      <CtaSection />

      <Footer />
    </div>
  );
};

export default Home;


import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/auth";
import { Spinner } from "@/components/ui/spinner";

// Import the component files
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CtaSection from "@/components/home/CtaSection";

const Home = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // If we're still checking authentication status, show loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Spinner className="h-8 w-8 text-volleyball-primary mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    console.log("User is authenticated, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Only show the public home page for non-authenticated users
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />

      <Footer />
    </div>
  );
};

export default Home;

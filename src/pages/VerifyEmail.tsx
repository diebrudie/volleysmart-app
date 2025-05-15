
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(15);
  const email = location.state?.email || "your email";

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 w-full">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500"/>
        </div>
        <CardTitle className="text-2xl font-bold text-center">Check Your Email</CardTitle>
        <CardDescription className="text-center mt-2">
          We sent a verification link to <span className="font-medium">{email}</span>
        </CardDescription>
        
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Please click the link in your email to verify your account. If you don't see it, check your spam folder.
          </p>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Redirecting to login in {countdown} seconds...
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <Button onClick={() => navigate('/login')} variant="outline">
                Go to Login
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="default"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;

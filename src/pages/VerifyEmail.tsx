
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
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
      <Card className="border-0 shadow-none">
        <CardHeader className="space-y-1 px-0 pt-0">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500"/>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Check Your Email</CardTitle>
          <CardDescription className="text-center">
            We sent a verification link to <span className="font-medium">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
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
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default VerifyEmail;

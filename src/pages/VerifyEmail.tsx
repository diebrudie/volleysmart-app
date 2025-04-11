
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(15);

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="p-4">
        <Link to="/" className="flex items-center text-gray-700 hover:text-volleyball-primary transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="flex items-center justify-center flex-grow px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Check Your Email</CardTitle>
            <CardDescription className="text-center">
              Thank you for signing up! Just one last step, please check your inbox to verify your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500 text-center">
              If you didn't receive an email, please check your spam folder or contact us for assistance.
            </p>
            
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Redirecting to login in {countdown} seconds...
              </p>
              <Button 
                onClick={() => navigate('/login')} 
                variant="outline" 
                className="mt-2"
              >
                Go to Login Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;

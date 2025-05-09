
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(60);
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
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <MailCheck className="h-16 w-16 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4 text-center">
            Almost there! Check your inbox to confirm your email
          </h1>
          
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">
              To complete your registration, please verify your email address.
            </p>
            <p className="text-gray-600 mb-4">
              We've just sent a confirmation link to <span className="font-medium">{email}</span>.
              If you don't see it within a few minutes, check your spam or promotions folder.
            </p>
            <p className="text-gray-600">
              Once verified, you'll be automatically redirected to log in page.
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <Button 
              onClick={() => navigate('/login')} 
              variant="default"
            >
              Go to Login
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Automatically redirecting to login in {countdown} seconds...
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;

import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
      <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 w-full">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-500 dark:text-green-400" />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
          Check Your Email
        </h1>

        <p className="text-center mt-2 text-gray-600 dark:text-gray-400 mb-6">
          We sent a verification link to{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {email}
          </span>
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Please click the link in your email to verify your account. If you
            don't see it, check your spam folder.
          </p>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Redirecting to login in {countdown} seconds...
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
              <Button variant="action" onClick={() => navigate("/login")}>
                Go to Login
              </Button>
              <Button variant="primary" onClick={() => navigate("/")}>
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

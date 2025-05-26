import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { Spinner } from "@/components/ui/spinner";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  // Get the intended destination from location state, or default to dashboard
  const from = location.state?.from?.pathname || "/dashboard";

  // Redirect if already authenticated, check if user needs onboarding first
  useEffect(() => {
    if (isAuthenticated && !authLoading && user) {
      setIsCheckingProfile(true);
      
      // Check if user has completed player profile (onboarding)
      const checkUserProfile = async () => {
        try {
          const { data: player, error } = await supabase
            .from('players')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (error || !player) {
            // User hasn't completed onboarding, redirect to onboarding
            navigate('/players/onboarding', { replace: true });
          } else {
            // User has completed onboarding, check club membership count
            const { data: clubMembers, error: clubError } = await supabase
              .from('club_members')
              .select('club_id')
              .eq('user_id', user.id);

            if (clubError) {
              console.error('Error checking club membership:', clubError);
              // Default to start page on error
              navigate('/start', { replace: true });
              return;
            }

            if (!clubMembers || clubMembers.length === 0) {
              // User doesn't belong to any club, redirect to start page
              navigate('/start', { replace: true });
            } else if (clubMembers.length === 1) {
              // User belongs to exactly one club, redirect to that club's dashboard
              navigate(`/dashboard/${clubMembers[0].club_id}`, { replace: true });
            } else {
              // User belongs to multiple clubs, redirect to clubs overview page
              navigate('/clubs', { replace: true });
            }
          }
        } catch (error) {
          console.error('Error checking user profile:', error);
          // Default to onboarding on error to be safe
          navigate('/players/onboarding', { replace: true });
        } finally {
          setIsCheckingProfile(false);
        }
      };
      
      checkUserProfile();
    }
  }, [isAuthenticated, authLoading, navigate, from, user]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      // The redirection will happen automatically in the useEffect hook
    } catch (error) {
      console.error("Login error:", error);
      // Toast is already shown in the login function
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking profile
  if (isCheckingProfile) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center p-8">
          <Spinner className="h-8 w-8" />
          <span className="ml-2">Checking profile...</span>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 w-full">
        <h2 className="text-2xl font-semibold mb-6">Login</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Link 
                to="/forgot-password" 
                className="text-sm text-volleyball-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-sm text-gray-600 text-center">
          Don't have an account?{" "}
          <Link to="/signup" className="text-volleyball-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;

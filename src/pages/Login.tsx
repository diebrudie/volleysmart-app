
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle redirect when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      console.log('User is authenticated, redirecting...', user);
      
      const handleRedirect = async () => {
        try {
          // Check if user has completed player profile (onboarding)
          const { data: player, error } = await supabase
            .from('players')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Database error checking player profile:', error);
            navigate('/start', { replace: true });
            return;
          }

          if (!player) {
            // User hasn't completed onboarding
            navigate('/players/onboarding', { replace: true });
            return;
          }

          // Check club membership
          const { data: clubMembers, error: clubError } = await supabase
            .from('club_members')
            .select('club_id')
            .eq('user_id', user.id);

          if (clubError) {
            console.error('Error checking club membership:', clubError);
            navigate('/start', { replace: true });
            return;
          }

          if (!clubMembers || clubMembers.length === 0) {
            navigate('/start', { replace: true });
          } else if (clubMembers.length === 1) {
            navigate(`/dashboard/${clubMembers[0].club_id}`, { replace: true });
          } else {
            const lastVisitedClubId = localStorage.getItem('lastVisitedClub');
            const isLastClubValid = lastVisitedClubId && 
              clubMembers.some(member => member.club_id === lastVisitedClubId);
            
            if (isLastClubValid) {
              navigate(`/dashboard/${lastVisitedClubId}`, { replace: true });
            } else {
              navigate('/clubs', { replace: true });
            }
          }
        } catch (error) {
          console.error('Error during redirect:', error);
          navigate('/start', { replace: true });
        }
      };

      handleRedirect();
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('Attempting login for:', data.email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (error) throw error;

      console.log('Login successful');
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to log in. Please check your credentials.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Show loading state during authentication or redirect
  if (isAuthenticated && user) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center p-8">
          <Spinner className="h-8 w-8" />
          <span className="ml-2">Redirecting...</span>
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
              disabled={isLoading || authLoading}
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

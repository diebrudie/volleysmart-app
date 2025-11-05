import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { Spinner } from "@/components/ui/spinner";
import { fetchUserClubIds } from "@/integrations/supabase/clubMembers";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
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
  const from = location.state?.from?.pathname as string | undefined;

  /**
   * Normalize the "from" target. We never "return to" onboarding or bare dashboard/login.
   * This prevents bouncing back to /players/onboarding after a successful login.
   */
  const normalizedFrom =
    from && !["/login", "/dashboard", "/players/onboarding"].includes(from)
      ? from
      : undefined;

  // Only redirect if we're actually ON the login page and user becomes authenticated
  useEffect(() => {
    if (
      !isAuthenticated ||
      authLoading ||
      !user ||
      location.pathname !== "/login"
    )
      return;

    setIsCheckingProfile(true);

    const routeAfterLogin = async () => {
      // 1) Fast path: return to the protected page we came from
      if (normalizedFrom) {
        /* console.log(
          "[NAV] navigating from /login to",
          normalizedFrom,
          "reason: return to 'from'"
        );*/
        navigate(normalizedFrom, { replace: true });
        setIsCheckingProfile(false);
        return;
      }

      /**
       * Must have players.profile_completed === true to leave onboarding.
       * If row is missing OR profile_completed is not true -> go to onboarding.
       */
      try {
        const { data: player, error } = await supabase
          .from("players")
          .select("profile_completed")
          .eq("user_id", user.id)
          .single();

        if (error || player?.profile_completed !== true) {
          navigate("/players/onboarding", { replace: true });
          return;
        }

        try {
          const clubIds = await fetchUserClubIds(user.id);

          if (clubIds.length === 0) {
            navigate("/start", { replace: true });
          } else if (clubIds.length === 1) {
            navigate(`/dashboard/${clubIds[0]}`, { replace: true });
          } else {
            const lastVisitedClubId = localStorage.getItem("lastVisitedClub");
            const isLastClubValid =
              !!lastVisitedClubId && clubIds.includes(lastVisitedClubId);

            if (isLastClubValid) {
              navigate(`/dashboard/${lastVisitedClubId}`, { replace: true });
            } else {
              navigate("/clubs", { replace: true });
            }
          }
        } catch (clubError) {
          console.error("Error checking club membership:", clubError);
          navigate("/start", { replace: true });
          return;
        }
      } catch (err) {
        console.error("Error checking user profile:", err);
        navigate("/players/onboarding", { replace: true });
      } finally {
        setIsCheckingProfile(false);
      }
    };

    routeAfterLogin();
  }, [
    isAuthenticated,
    authLoading,
    user,
    location.pathname,
    normalizedFrom,
    navigate,
  ]);
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
          <span className="ml-2 text-gray-900 dark:text-gray-100">
            Checking profile...
          </span>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 lg:gap-x-12 bg-gray-100">
        {/* Left: Logo + Headline + Form */}
        <div className="flex items-center">
          <div className="w-full max-w-[500px] px-6 sm:px-8 md:px-12 lg:px-12 lg:ml-auto lg:mr-12">
            <Link to="/" className="inline-block">
              <img
                src="/volleyball.svg"
                alt="VolleySmart"
                className="h-10 w-auto"
                loading="eager"
              />
            </Link>

            <h1 className="mt-10 text-3xl font-semibold tracking-tight">
              Sign in to VolleySmart
            </h1>

            <div className="mt-8">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            {...field}
                          />
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
                          <Input
                            type="password"
                            autoComplete="current-password"
                            placeholder="Your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>
            </div>

            <p className="mt-6 text-sm text-slate-600">
              Forgot your password?{" "}
              <Link
                to="/forgot-password"
                className="text-blue-600 hover:underline"
              >
                Reset it here
              </Link>
              .
            </p>
            <p className="mt-2 text-sm text-slate-600">
              New to VolleySmart?{" "}
              <Link to="/signup" className="text-blue-600 hover:underline">
                Create an account
              </Link>{" "}
              instead
            </p>
          </div>
        </div>

        {/* Right: Image (desktop only) */}
        <div className="relative hidden items-center justify-center p-8 lg:flex">
          <div className="h-[560px] w-full max-w-[520px] overflow-hidden rounded-2xl">
            <img
              src="/img-volleyball-ball-login-screen.jpg"
              alt="Volleyball"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;

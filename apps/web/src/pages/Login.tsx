import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
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
// uncomment to force a repaint at the right moments on the login screen
// import { useIosPwaKeyboardRepaint } from "@/hooks/use-ios-pwa-keyboard-repaint";

function createLoginSchema(t: TFunction) {
  return z.object({
    email: z.string().email({ message: t("validation:email.invalid") }),
    password: z
      .string()
      .min(6, { message: t("validation:password.tooShort", { min: 6 }) }),
  });
}

type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

const Login = () => {
  const { login, signInWithOAuth, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { t } = useTranslation("auth");
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  // Only need this on login-like screens with text/email/password inputs
  // uncomment to force a repaint at the right moments on the login screen
  //useIosPwaKeyboardRepaint(true);

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
        navigate(normalizedFrom, { replace: true });
        setIsCheckingProfile(false);
        return;
      }

      // 1b) If a pending invite token exists, redirect to /invite/:token
      const pendingToken = localStorage.getItem("pendingInviteToken");
      if (pendingToken) {
        navigate(`/invite/${encodeURIComponent(pendingToken)}`, { replace: true });
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
            navigate("/home", { replace: true });
          } else {
            navigate("/home", { replace: true });
          }
        } catch (clubError) {
          console.error("Error checking club membership:", clubError);
          navigate("/home", { replace: true });
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
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
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

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
      // Browser navigates to provider — no further action needed here.
    } catch {
      setOauthLoading(null);
    }
  };

  // Show loading state while checking profile
  if (isCheckingProfile) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center p-8">
          <Spinner className="h-8 w-8" />
          <span className="ml-2 text-gray-900 dark:text-gray-100">
            {t("common:checkingProfile")}
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
              {t("login.title")}
            </h1>

            <div className="mt-8 space-y-4">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={!!oauthLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {oauthLoading === "google" ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {t("login.continueWithGoogle")}
                </button>

              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gray-100 px-3 text-gray-500">{t("login.orContinueWithEmail")}</span>
                </div>
              </div>

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
                        <FormLabel>{t("login.email")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder={t("login.emailPlaceholder")}
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
                        <FormLabel>{t("login.password")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="current-password"
                            placeholder={t("login.passwordPlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t("login.submitting") : t("login.submit")}
                  </Button>
                </form>
              </Form>
            </div>

            <p className="mt-6 text-sm text-slate-600">
              {t("login.forgotPassword")}{" "}
              <Link
                to="/forgot-password"
                className="text-blue-600 hover:underline"
              >
                {t("login.resetItHere")}
              </Link>
              .
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {t("login.newToVolleySmart")}{" "}
              <Link to="/signup" className="text-blue-600 hover:underline">
                {t("login.createAccount")}
              </Link>{" "}
              {t("login.instead")}
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

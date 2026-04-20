import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext"; // 🆕 Import ThemeProvider
import { useEffect, useState } from "react";
import { ClubProvider } from "@/contexts/ClubContext";
import AppRoutes from "@/routes/AppRoutes";
import AppLiveRefresh from "@/components/common/AppLiveRefresh";
import RoutePersistence from "@/components/routing/RoutePersistence";
import MobileChrome from "@/components/nav/MobileChrome";
import MobileBottomSpacer from "@/components/nav/MobileBottomSpacer";
import ScrollToTop from "@/components/common/ScrollToTop";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 20_000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => {
  useEffect(() => {
    // Intercept bucket creation attempts — the "club-images" bucket must be
    // pre-created in the Supabase dashboard. Until then, block the POST so
    // the SDK doesn't spam the console with 409/permission errors on every
    // app load. All other fetch calls are passed through unmodified.
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;

      if (url.includes("/storage/v1/bucket") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            name: "club-images",
            id: "club-images",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AuthAwareThemeWrapper>
              <ClubProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  {/* Global realtime + focus/online refresh (PWA-friendly) */}
                  <AppLiveRefresh />
                  <BootGate>
                    <MobileChrome />
                    <ScrollToTop />
                    <AppRoutes />
                    <MobileBottomSpacer />
                  </BootGate>
                </TooltipProvider>
              </ClubProvider>
            </AuthAwareThemeWrapper>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

// Component to bridge auth status with theme
const AuthAwareThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  // Public / pre-auth routes must ignore theme and stay light
  const enforceLightOnRoutes: Array<string | RegExp> = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/players/onboarding",
    "/start",
    "/faqs",
  ];

  return (
    <ThemeProvider
      isAuthenticated={isAuthenticated}
      enforceLightOnRoutes={enforceLightOnRoutes}
      enforceLightAlwaysRoutes={["/players/onboarding", "/start"]}
    >
      {children}
    </ThemeProvider>
  );
};

/**
 * BootGate (render-only):
 * - While auth is unresolved, render a lightweight splash (no public Home flash).
 * - If authenticated and currently on "/", redirect to a resolved target,
 *   but do it in a post-render effect (no navigation during render).
 * - While the effect is performing the redirect, keep the splash on screen.
 */
const BootGate = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Local state to keep the splash visible for the single frame we schedule a redirect.
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading) return; // still booting; render splash below

    // Only decide redirects when we're on "/" AND authenticated.
    if (isAuthenticated && location.pathname === "/") {
      const lastPrivatePath = localStorage.getItem("lastPrivatePath");
      const lastVisitedClub = localStorage.getItem("lastVisitedClub");

      const target =
        lastPrivatePath && lastPrivatePath !== "/"
          ? lastPrivatePath
          : lastVisitedClub
          ? `/clubs/${lastVisitedClub}`
          : "/clubs";

      if (target !== location.pathname) {
        setRedirecting(true);
        // Navigate after paint; this runs outside of render.
        navigate(target, { replace: true });
      }
      return;
    }

    // If we get here, either not on "/" or not authenticated: stop any pending 'redirecting' state.
    if (redirecting) setRedirecting(false);
  }, [isLoading, isAuthenticated, location.pathname, navigate, redirecting]);

  // 1) While auth is booting OR an effect-driven redirect is pending → render splash
  if (isLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  // 2) Normal render + route persistence when inside app.
  return (
    <>
      <RoutePersistence />
      {children}
    </>
  );
};

export default App;

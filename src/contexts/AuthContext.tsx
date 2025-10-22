import {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useEffect,
} from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { UserRole } from "@/types/supabase";

interface AuthUser {
  id: string;
  email: string | undefined;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  userProfile: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const hasFetchedProfile = useRef(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  //console.log("🏐 AuthContext rendering, user:", user);

  // Initialize auth state
  useEffect(() => {
    // 1) Set up a minimal listener first: only handle definitive sign-out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      /*console.log(
        "[Auth] event:",
        event,
        "| hasSession:",
        !!session,
        "| before setUser:",
        { hasFetchedProfile: hasFetchedProfile.current }
      );*/

      if (event === "SIGNED_OUT") {
        // Definitive guest
        hasFetchedProfile.current = false;
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Handle interactive login (SIGNED_IN) and silent refresh (TOKEN_REFRESHED)
      // if (
      //   session?.user &&
      //   (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      // ) {
      //   setSession(session);

      //   // For an explicit, interactive SIGNED_IN, own the loading while we fetch profile.
      //   if (event === "SIGNED_IN") {
      //     setIsLoading(true);
      //     hasFetchedProfile.current = true;
      //     try {
      //       await getUserProfile(session.user); // getUserProfile does NOT toggle loading
      //     } catch (e) {
      //       console.error("Error in onAuthStateChange -> getUserProfile:", e);
      //     } finally {
      //       setIsLoading(false);
      //     }
      //     return; // done for SIGNED_IN
      //   }

      //   // For TOKEN_REFRESHED, only fetch if we somehow don't have a profile yet, but don't flicker loading.
      //   if (!hasFetchedProfile.current || !user) {
      //     hasFetchedProfile.current = true;
      //     try {
      //       await getUserProfile(session.user);
      //     } catch (e) {
      //       console.error(
      //         "Error in onAuthStateChange (refresh) -> getUserProfile:",
      //         e
      //       );
      //     }
      //   }
      // }
    });

    // 2) Initial session resolution — the ONLY place that controls isLoading during boot
    (async () => {
      setIsLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      /*
      console.log("[Auth] getSession() result:", {
        hasSession: !!session,
        error,
      });
      */

      if (error) {
        console.error("Session error:", error);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);

        setIsLoading(false); // definitive guest
        return;
      }

      setSession(session ?? null);

      if (!session?.user) {
        // No session → guest
        hasFetchedProfile.current = false;
        setUser(null);

        setIsLoading(false);
        return;
      }

      // We have a session → fetch profile, then end loading
      try {
        if (!hasFetchedProfile.current) {
          hasFetchedProfile.current = true;
        }
        await getUserProfile(session.user);
      } catch (e) {
        // Even if profile fetch fails, ensure the app is usable with a fallback user
        console.error("Profile load failed in init:", e);
        // getUserProfile already sets a fallback user on error
      } finally {
        setIsLoading(false); // user is set (or fallback), safe to render
      }
    })();

    return () => subscription.unsubscribe();
  }, []);

  // Function to get user profile data
  const getUserProfile = async (authUser: User) => {
    try {
      // Do NOT set isLoading here; outer flows own it.

      // Try to fetch user profile ...
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        // Continue with fallback below
      }

      const userWithProfile: AuthUser = {
        id: authUser.id,
        email: authUser.email,
        name:
          profile?.email?.split("@")[0] ||
          authUser.email?.split("@")[0] ||
          "User",
        role: (profile?.role as UserRole) || "user",
      };

      setUser(userWithProfile);
    } catch (error) {
      console.error("Error getting user profile:", error);
      // Always set user even if profile fetch fails
      const fallbackUser: AuthUser = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.email?.split("@")[0] || "User",
        role: "user",
      };
      setUser(fallbackUser);
    } finally {
      // no isLoading toggles here
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Resolve current session and set profile deterministically
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        hasFetchedProfile.current = true;
        await getUserProfile(session.user);
      } else {
        // Defensive: no session -> clear state
        hasFetchedProfile.current = false;
        setUser(null);
      }

      toast({
        title: "Success",
        description: "You have successfully logged in",
        duration: 1500,
      });

      return Promise.resolve();
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to log in. Please check your credentials.",
        variant: "destructive",
        duration: 2000,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || "",
            last_name: lastName || "",
          },
        },
      });
      if (error) throw error;

      // Ensure we have a session and a user profile immediately after signup
      let sessionUser = data.session?.user ?? null;

      // If Supabase didn't create a session on sign-up (depends on email confirmation settings),
      // perform a one-time sign-in to establish the session.
      if (!sessionUser) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        const { data: sessionData } = await supabase.auth.getSession();
        sessionUser = sessionData.session?.user ?? null;
      }

      if (sessionUser) {
        // Mark that we've loaded the profile at least once and set user
        hasFetchedProfile.current = true;
        await getUserProfile(sessionUser);
      } else {
        // Defensive: no session available
        hasFetchedProfile.current = false;
        setUser(null);
      }

      toast({
        title: "Success",
        description:
          "Account created successfully. You'll be redirected to complete your profile.",
        duration: 1500,
      });
    } catch (error: unknown) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create account. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password reset email sent. Please check your inbox.",
      });
    } catch (error: unknown) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send password reset email.",
        variant: "destructive",
        duration: 2000,
      });
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
        duration: 1500,
      });
    } catch (error: unknown) {
      console.error("Update password error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update password.",
        variant: "destructive",
        duration: 2000,
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear user state immediately to prevent confusion
      setUser(null);
      setSession(null);

      await supabase.auth.signOut();

      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
        duration: 1500,
      });

      // Redirect to home page instead of /start
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile: user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

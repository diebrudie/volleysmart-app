import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Menu } from "lucide-react";
import MobileMenuDrawer from "./MobileMenuDrawer";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** Thin top bar with profile picture, page title, and action icons. */
const MobileTopBar: React.FC = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const iconColor =
    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-900";

  // Fetch player profile for avatar
  const [profile, setProfile] = React.useState<{
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  } | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase
      .from("players")
      .select("first_name, last_name, image_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setProfile(data);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const initials = profile
    ? [profile.first_name?.[0], profile.last_name?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase()
    : "";

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70
                   border-b flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0px)]"
      >
        {/* Profile avatar */}
        <button
          type="button"
          onClick={() => user?.id && navigate(`/user/${user.id}`)}
          className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0"
          aria-label="Profile"
        >
          {profile?.image_url ? (
            <img
              src={profile.image_url}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-xs font-semibold">{initials || "?"}</span>
          )}
        </button>

        {/* Centered title */}
        <span className="absolute left-1/2 -translate-x-1/2 text-base font-semibold">
          Home
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Chats"
            onClick={() => navigate("/chats")}
            className="text-foreground hover:bg-muted"
          >
            <MessageSquare className={`h-5 w-5 ${iconColor}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            onClick={() => navigate("/notifications")}
            className="text-foreground hover:bg-muted"
          >
            <Bell className={`h-5 w-5 ${iconColor}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="text-foreground hover:bg-muted"
          >
            <Menu className={`h-5 w-5 ${iconColor}`} />
          </Button>
        </div>
      </header>

      {/* Push page content below top bar */}
      <div className="h-14" aria-hidden="true" />
      <MobileMenuDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
};

export default MobileTopBar;

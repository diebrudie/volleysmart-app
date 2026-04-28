import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Menu } from "lucide-react";
import MobileMenuDrawer from "./MobileMenuDrawer";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnreadCount } from "@/integrations/supabase/notifications";

/** Route-to-title mapping for the top bar. */
function getPageTitleKey(pathname: string): string {
  if (/^\/clubs(\/|$)/.test(pathname)) return "nav.clubs";
  if (/^\/events(\/|$)/.test(pathname)) return "nav.events";
  if (/^\/members(\/|$)/.test(pathname)) return "nav.members";
  if (/^\/games(\/|$)/.test(pathname)) return "nav.games";
  if (pathname === "/discover-events") return "nav.discoverEvents";
  return "nav.home";
}

/** Thin top bar with profile picture, page title, and action icons. */
const MobileTopBar: React.FC = () => {
  const { t } = useTranslation("common");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const iconColor =
    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-900";

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unreadNotificationCount", user?.id],
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

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
          {t(getPageTitleKey(pathname))}
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Chats (coming soon)"
            disabled
            className="text-muted-foreground opacity-40 cursor-not-allowed"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            onClick={() => navigate("/notifications")}
            className="text-foreground hover:bg-muted"
          >
            <span className="relative shrink-0">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </span>
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

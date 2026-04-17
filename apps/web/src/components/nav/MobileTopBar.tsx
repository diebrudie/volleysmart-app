import * as React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Menu } from "lucide-react";
import MobileMenuDrawer from "./MobileMenuDrawer";
import { useTheme } from "@/contexts/ThemeContext";

/** Thin top bar with logo, notification/chat shortcuts, and hamburger menu. */
const MobileTopBar: React.FC = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const iconColor =
    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-900";

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70
                   border-b flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0px)]"
      >
        <Logo size="sm" linkTo="/home" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            onClick={() => navigate("/notifications")}
            className="text-foreground hover:bg-muted focus:bg-muted active:bg-muted hover:text-foreground focus-visible:text-foreground active:text-foreground dark:text-foreground dark:hover:text-foreground dark:focus-visible:text-foreground dark:active:text-foreground"
          >
            <Bell className={`h-5 w-5 ${iconColor}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Chats"
            onClick={() => navigate("/chats")}
            className="text-foreground hover:bg-muted focus:bg-muted active:bg-muted hover:text-foreground focus-visible:text-foreground active:text-foreground dark:text-foreground dark:hover:text-foreground dark:focus-visible:text-foreground dark:active:text-foreground"
          >
            <MessageSquare className={`h-5 w-5 ${iconColor}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="text-foreground hover:bg-muted focus:bg-muted active:bg-muted hover:text-foreground focus-visible:text-foreground active:text-foreground dark:text-foreground dark:hover:text-foreground dark:focus-visible:text-foreground dark:active:text-foreground"
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

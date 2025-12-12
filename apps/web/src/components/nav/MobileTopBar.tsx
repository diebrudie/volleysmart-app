import * as React from "react";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import MobileMenuDrawer from "./MobileMenuDrawer";
import { useTheme } from "@/contexts/ThemeContext";

/** Thin top bar that mimics native PWA chrome. Renders only on compact screens (parent wrapper controls). */
const MobileTopBar: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const iconColor =
    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-900";

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70
                   border-b flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0px)]"
      >
        <Logo size="sm" linkTo="/dashboard" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="text-foreground hover:bg-muted focus:bg-muted active:bg-muted hover:text-foreground focus-visible:text-foreground active:text-foreground dark:text-foreground dark:hover:text-foreground dark:focus-visible:text-foreground dark:active:text-foreground"
        >
          <Menu className={`h-5 w-5 ${iconColor}`} />
        </Button>
      </header>
      {/* Push page content below top bar height; bottom nav adds padding itself */}
      <div className="h-14" aria-hidden="true" />
      <MobileMenuDrawer open={open} onOpenChange={setOpen} />
    </>
  );
};

export default MobileTopBar;

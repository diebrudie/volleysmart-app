import * as React from "react";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import MobileMenuDrawer from "./MobileMenuDrawer";

/** Thin top bar that mimics native PWA chrome. Renders only on compact screens (parent wrapper controls). */
const MobileTopBar: React.FC = () => {
  const [open, setOpen] = React.useState(false);

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
          className="text-foreground hover:bg-muted focus:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>
      {/* Push page content below top bar height; bottom nav adds padding itself */}
      <div className="h-14" aria-hidden="true" />
      <MobileMenuDrawer open={open} onOpenChange={setOpen} />
    </>
  );
};

export default MobileTopBar;

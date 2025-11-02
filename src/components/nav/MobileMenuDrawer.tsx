import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  User,
  MoonStar,
  Settings,
  Binoculars,
  Trophy,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ThemePicker from "./ThemePicker";

/**
 * Full-screen right-to-left drawer that covers everything (incl. bottom nav).
 * Uses shadcn/ui Drawer. Animate from right by applying 'data-[state=open]:animate-in ...' classes (shadcn default).
 */
type MobileMenuDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MaybeLogout = { logout?: () => Promise<void> }; // no `any`, optional logout

const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const { user, ...rest } = useAuth() as {
    user: { id: string } | null;
  } & MaybeLogout;
  const navigate = useNavigate();

  const handleLogout = async () => {
    onOpenChange(false);
    if (rest.logout) {
      await rest.logout();
    } else {
      // Safe fallback if context doesn't expose a logout helper
      await supabase.auth.signOut();
    }
  };

  const go = (path: string, disabled?: boolean) => {
    if (disabled) return;
    onOpenChange(false);
    navigate(path);
  };

  const [themeOpen, setThemeOpen] = React.useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-screen max-w-none p-0 bg-background z-[60] h-[100dvh]
                 pb-[max(env(safe-area-inset-bottom),0px)]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b h-12">
            <div className="text-base font-medium">Menu</div>
            {/* A11y: required dialog title for screen readers (visually hidden) */}
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close menu"
              className="flex items-center justify-center"
              onClick={() => onOpenChange(false)}
            >
              <span className="sr-only">Close</span>
            </Button>
          </div>

          <div className="p-4 space-y-3">
            <MenuItem
              icon={<User className="h-5 w-5" />}
              label="Profile"
              onClick={() => go(`/user/${user?.id ?? ""}`)}
            />
            <MenuItem
              icon={<MoonStar className="h-5 w-5" />}
              label="Theme"
              onClick={() => setThemeOpen(true)}
            />
            <MenuItem
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              disabled
            />
          </div>

          <div className="px-4 pt-6">
            <h3 className="text-sm text-muted-foreground mb-2">Clubs</h3>
            <div className="space-y-3">
              <MenuItem
                icon={<Binoculars className="h-5 w-5" />}
                label="Discover other Clubs"
                disabled
                onClick={() => go("/clubs/discover", true)}
              />
              <MenuItem
                icon={<Trophy className="h-5 w-5" />}
                label="Start a Tournament"
                disabled
                onClick={() => go("/tournaments/new", true)}
              />
            </div>
          </div>

          <div className="mt-10 px-4 pb-6">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left hover:bg-muted text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ThemePicker open={themeOpen} onOpenChange={setThemeOpen} />
    </>
  );
};

export default MobileMenuDrawer;

type ItemProps = {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
};

const MenuItem: React.FC<ItemProps> = ({ icon, label, disabled, onClick }) => (
  <button
    type="button"
    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}`}
    onClick={onClick}
    disabled={disabled}
    aria-disabled={disabled}
  >
    {icon}
    <span className="text-base">{label}</span>
  </button>
);

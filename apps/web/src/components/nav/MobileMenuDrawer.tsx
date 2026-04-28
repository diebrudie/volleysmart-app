import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MoonStar, LogOut, HelpCircle, Mail, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ThemePicker from "./ThemePicker";
import ContactSheet from "@/components/common/ContactSheet";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

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

  const { t } = useTranslation("common");
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-screen max-w-none p-0 bg-background z-[60] h-[100dvh]
                 pb-[max(env(safe-area-inset-bottom),0px)]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b h-12">
            <div className="text-base font-medium">{t("nav.menu")}</div>
            <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
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
              icon={<MoonStar className="h-5 w-5" />}
              label={t("theme.title")}
              onClick={() => setThemeOpen(true)}
            />
            <MenuItem
              icon={<Globe className="h-5 w-5" />}
              label={t("language.title")}
              onClick={() => setLanguageOpen(true)}
            />
            <MenuItem
              icon={<HelpCircle className="h-5 w-5" />}
              label={t("nav.faqs")}
              onClick={() => go("/faqs")}
            />
            <MenuItem
              icon={<Mail className="h-5 w-5" />}
              label={t("nav.contactUs")}
              onClick={() => {
                onOpenChange(false);
                setContactOpen(true);
              }}
            />
          </div>

          <div className="mt-10 px-4 pb-6">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left hover:bg-muted text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>{t("nav.logOut")}</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ThemePicker open={themeOpen} onOpenChange={setThemeOpen} />
      <LanguageSwitcher open={languageOpen} onOpenChange={setLanguageOpen} />
      <ContactSheet open={contactOpen} onOpenChange={setContactOpen} source="hamburger_menu" />
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

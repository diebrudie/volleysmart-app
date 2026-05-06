import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut,
  HelpCircle,
  Mail,
  Globe,
  MoonStar,
  Bell,
  FileText,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ThemePicker from "./ThemePicker";
import ContactSheet from "@/components/common/ContactSheet";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

type MobileMenuDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  } | null;
};

type MaybeLogout = { logout?: () => Promise<void> };

const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  open,
  onOpenChange,
  profile,
}) => {
  const { user, ...rest } = useAuth() as {
    user: { id: string; email?: string } | null;
  } & MaybeLogout;
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);

  const handleLogout = async () => {
    onOpenChange(false);
    if (rest.logout) {
      await rest.logout();
    } else {
      await supabase.auth.signOut();
    }
  };

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const initials = profile
    ? [profile.first_name?.[0], profile.last_name?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase()
    : "";

  const fullName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    : "";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-screen max-w-none p-0 bg-background z-[60] h-[100dvh]
                 pb-[max(env(safe-area-inset-bottom),0px)]"
        >
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>

          <div className="flex flex-col h-full">
            {/* User header */}
            <button
              type="button"
              className="flex flex-col items-center gap-2 px-4 pb-4 pt-10"
              onClick={() => go(`/user/${user?.id}`)}
            >
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.image_url ?? undefined} className="object-cover" />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-lg font-semibold">{fullName}</p>
                {user?.email && (
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                )}
              </div>
            </button>

            {/* Scrollable menu content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
              {/* Help */}
              <MenuGroup label={t("menu.help")}>
                <MenuItem
                  icon={<HelpCircle className="h-5 w-5" />}
                  label={t("menu.consultFaq")}
                  onClick={() => go("/faqs")}
                />
                <MenuItem
                  icon={<Mail className="h-5 w-5" />}
                  label={t("nav.contactUs")}
                  onClick={() => {
                    onOpenChange(false);
                    setContactOpen(true);
                  }}
                  border={false}
                />
              </MenuGroup>

              {/* Preferences */}
              <MenuGroup label={t("menu.preferences")}>
                <MenuItem
                  icon={<Globe className="h-5 w-5" />}
                  label={t("language.title")}
                  onClick={() => setLanguageOpen(true)}
                />
                <MenuItem
                  icon={<MoonStar className="h-5 w-5" />}
                  label={t("theme.title")}
                  onClick={() => setThemeOpen(true)}
                />
                <MenuItem
                  icon={<Bell className="h-5 w-5" />}
                  label={t("menu.notifications")}
                  onClick={() => go("/settings/notifications")}
                  showChevron
                  border={false}
                />
              </MenuGroup>

              {/* Legal */}
              <MenuGroup label={t("menu.legal")}>
                <MenuItem
                  icon={<FileText className="h-5 w-5" />}
                  label={t("menu.termsAndConditions")}
                  disabled
                  badge={t("menu.comingSoon")}
                />
                <MenuItem
                  icon={<Shield className="h-5 w-5" />}
                  label={t("menu.privacyPolicy")}
                  disabled
                  badge={t("menu.comingSoon")}
                  border={false}
                />
              </MenuGroup>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-4 py-4 border-t border-border space-y-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800 px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">{t("nav.logOut")}</span>
              </button>
            </div>
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

const MenuGroup: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
      {label}
    </p>
    <div className="rounded-xl border bg-card overflow-hidden">{children}</div>
  </div>
);

type ItemProps = {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  badge?: string;
  showChevron?: boolean;
  border?: boolean;
  onClick?: () => void;
};

const MenuItem: React.FC<ItemProps> = ({
  icon,
  label,
  disabled,
  badge,
  showChevron,
  border = true,
  onClick,
}) => (
  <button
    type="button"
    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
      ${border ? "border-b border-border" : ""}
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50 active:bg-muted"}`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon}
    <span className="text-sm font-medium flex-1">{label}</span>
    {badge && (
      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
        {badge}
      </span>
    )}
    {showChevron && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
  </button>
);

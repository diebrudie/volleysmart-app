import * as React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Archive as ArchiveIcon,
  Users,
  Building2,
  Plus,
} from "lucide-react";
import { useClub } from "@/contexts/ClubContext";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Fixed bottom tab bar with a prominent center "+" action.
 * Tabs are always visible but disabled if there is no active clubId.
 * Covers safe area and sits above page content.
 */
const MobileBottomNav: React.FC = () => {
  const { clubId } = useClub();
  const disabled = !clubId;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isDark } = useTheme();

  // Active color depends on theme:
  const activeColorClass = isDark ? "text-white" : "text-primary";

  const go = (to: string, isDisabled: boolean) => {
    if (isDisabled) return;
    navigate(to);
  };

  // helpers to build club paths
  const withClub = (base: string) => `${base}/${clubId as string}`;

  const isActive = (pattern: RegExp) => pattern.test(pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70
                 pb-[max(env(safe-area-inset-bottom),0px)]"
      role="navigation"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-xl px-2">
        <div className="relative grid grid-cols-5 items-center h-16">
          <TabButton
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Dashboard"
            active={isActive(/^\/dashboard\//)}
            disabled={disabled}
            onClick={() => go(withClub("/dashboard"), disabled)}
            activeColor={activeColorClass}
          />
          <TabButton
            icon={<ArchiveIcon className="h-5 w-5" />}
            label="Archive"
            active={isActive(/^\/games\//)}
            disabled={disabled}
            onClick={() => go(withClub("/games"), disabled)}
            activeColor={activeColorClass}
          />
          {/*  Center empty slot so the FAB doesn't cover any tab */}
          <div aria-hidden className="h-full" />
          {/* Center FAB */}
          <button
            type="button"
            aria-label="New Game"
            className={`absolute left-1/2 -translate-x-1/2 -top-2 rounded-full h-14 w-14 flex items-center justify-center
            shadow-lg border ring-2 ring-background text-primary-foreground
            ${
              disabled
                ? "bg-primary/40 cursor-not-allowed"
                : "bg-primary hover:opacity-90"
            }`}
            onClick={() => go(withClub("/new-game"), disabled)}
            disabled={disabled}
          >
            <Plus className="h-6 w-6" />
          </button>
          <TabButton
            icon={<Users className="h-5 w-5" />}
            label="Members"
            active={isActive(/^\/members\//)}
            disabled={disabled}
            onClick={() => go(withClub("/members"), disabled)}
            activeColor={activeColorClass}
          />
          <TabLink
            to="/clubs"
            icon={<Building2 className="h-5 w-5" />}
            label="Clubs"
            active={isActive(/^\/clubs(\/|$)/)}
            activeColor={activeColorClass}
          />
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;

type TabBaseProps = {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeColor: string;
};
type TabButtonProps = TabBaseProps & {
  disabled?: boolean;
  onClick: () => void;
};
type TabLinkProps = TabBaseProps & { to: string };

const TabButton: React.FC<TabButtonProps> = ({
  icon,
  label,
  active,
  activeColor,
  disabled,
  onClick,
}) => (
  <button
    type="button"
    className={`flex flex-col items-center justify-center gap-1 text-xs h-full
      ${active ? activeColor : "text-muted-foreground"}
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-100"}`}
    onClick={onClick}
    disabled={disabled}
    aria-current={active ? "page" : undefined}
    aria-disabled={disabled}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const TabLink: React.FC<TabLinkProps> = ({
  to,
  icon,
  label,
  active,
  activeColor,
}) => (
  <NavLink
    to={to}
    className={`flex flex-col items-center justify-center gap-1 text-xs h-full
      ${active ? activeColor : "text-muted-foreground"} hover:opacity-100`}
    aria-current={active ? "page" : undefined}
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

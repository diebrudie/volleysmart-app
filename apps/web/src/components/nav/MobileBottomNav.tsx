import * as React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Building2, Plus, Archive } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Fixed global bottom tab bar. Tabs are always active — no club context required.
 * Center FAB opens the Create Event flow.
 */
const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    const checkStandalone = () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any)?.standalone === true);

    setIsStandalone(checkStandalone());

    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = () => setIsStandalone(checkStandalone());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Safety-net: after any visual-viewport resize on iOS PWA (e.g., keyboard
  // show/hide triggered by a modal), fire a no-op scroll so iOS reanchors all
  // position:fixed elements to the correct bottom.
  React.useEffect(() => {
    if (!isStandalone) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => requestAnimationFrame(() => window.scrollBy(0, 0));
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [isStandalone]);

  const effectiveIsDark = resolvedTheme === "dark";
  const activeColorClass = effectiveIsDark ? "text-white" : "text-primary";
  const navBackgroundClass = isStandalone
    ? "bg-background"
    : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70";

  const isActive = (pattern: RegExp) => pattern.test(pathname);

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 border-t ${navBackgroundClass}
                 pb-[max(env(safe-area-inset-bottom),0px)]`}
      role="navigation"
      aria-label="Primary"
    >
      {/* iOS PWA scroll-drift guard */}
      <div
        className="absolute top-full inset-x-0 h-16 pointer-events-none"
        style={{ background: "hsl(var(--background))" }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-xl px-2 pb-3">
        <div className="relative grid grid-cols-5 items-center h-16">
          <TabLink
            to="/home"
            icon={<Home className="h-5 w-5" />}
            label="Home"
            active={isActive(/^\/home(\/|$)/)}
            activeColor={activeColorClass}
          />

          <TabLink
            to="/archive"
            icon={<Archive className="h-5 w-5" />}
            label="Archive"
            active={isActive(/^\/archive(\/|$)/)}
            activeColor={activeColorClass}
          />

          {/* Center empty slot so the FAB doesn't cover any tab */}
          <div aria-hidden className="h-full" />

          {/* Center FAB — Create Event */}
          <button
            type="button"
            aria-label="Create Event"
            className="absolute left-1/2 -translate-x-1/2 -top-2 rounded-full h-14 w-14 flex items-center justify-center
              shadow-lg border ring-2 ring-background text-primary-foreground bg-primary hover:opacity-90"
            onClick={() => navigate("/events/new")}
          >
            <Plus className="h-6 w-6" />
          </button>

          <TabLink
            to="/clubs"
            icon={<Building2 className="h-5 w-5" />}
            label="Clubs"
            active={isActive(/^\/clubs(\/|$)/)}
            activeColor={activeColorClass}
          />
          <TabLink
            to="/members"
            icon={<Users className="h-5 w-5" />}
            label="Members"
            active={isActive(/^\/members(\/|$)/)}
            activeColor={activeColorClass}
          />
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;

type TabLinkProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeColor: string;
};

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

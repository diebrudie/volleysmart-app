import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useIsCompact } from "@/hooks/use-compact";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/theme-toggle";
import { Menu, ChevronDown, Settings, User, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/common/Logo";

import { useClub } from "@/contexts/ClubContext";
import { supabase } from "@/integrations/supabase/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";

/**
 * Local types to avoid `any` and satisfy ESLint.
 */
type Maybe<T> = T | null | undefined;

interface AuthLikeUser {
  id: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    picture?: string;
    avatar_url?: string;
  };
}

interface PlayerProfile {
  first_name?: string;
  last_name?: string;
  image_url?: string;
}

interface AccountMenuItem {
  label: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/players/onboarding",
];

function isPublic(pathname: string) {
  const p =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  return PUBLIC_PREFIXES.some((prefix) => {
    const pp =
      prefix.endsWith("/") && prefix !== "/" ? prefix.slice(0, -1) : prefix;
    return p === pp || p.startsWith(pp + "/");
  });
}

/**
 * Compute avatar URL and initials from user + player profile.
 */
function getAvatarAndInitials(
  user: Maybe<AuthLikeUser>,
  player: Maybe<PlayerProfile>
): { avatarUrl?: string; initials: string } {
  // 1) Preferred avatar comes from players.image_url
  const avatarUrl =
    player?.image_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.avatar_url;

  // 2) Names – prefer players.*, fallback to user_metadata.*
  const firstName =
    player?.first_name ||
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(" ")?.[0];

  const lastName =
    player?.last_name ||
    user?.user_metadata?.last_name ||
    user?.user_metadata?.full_name?.split(" ")?.slice(-1)?.[0];

  const initialsCandidate =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("") ||
    user?.email?.[0] ||
    "U";

  return {
    avatarUrl,
    initials: initialsCandidate.toUpperCase(),
  };
}

const Navbar = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  //const [isAccountOpen, setIsAccountOpen] = useState(false);
  const { clubId, membershipStatus, initialized } = useClub();

  // Player profile for avatar + names — must be declared BEFORE any early return
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(
    null
  );
  const isCompact = useIsCompact();
  const { pathname } = useLocation();

  // Track scroll direction for public homepage nav auto-hide
  const lastScrollYRef = useRef(0);
  const [isNavHidden, setIsNavHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

      // Ignore tiny movements
      if (Math.abs(delta) < 4) {
        return;
      }

      const isScrollingDown = delta > 0;

      // Hide navbar when scrolling down past a small threshold, show when scrolling up
      if (isScrollingDown && currentY > 80) {
        setIsNavHidden(true);
      } else {
        setIsNavHidden(false);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Suppress all nav chrome on these routes (desktop too)
  const HIDE_NAV_ROUTES = [
    /^\/new-game\/[^/]+$/,
    /^\/edit-game\/[^/]+\/[^/]+\/?$/,
    /^\/join-club\/?$/,
    /^\/new-club\/?$/,
  ];
  const suppressChrome = HIDE_NAV_ROUTES.some((rx) => rx.test(pathname));

  useEffect(() => {
    let isActive = true;

    const fetchPlayer = async () => {
      if (!user?.id) {
        if (isActive) setPlayerProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("players")
        .select("first_name,last_name,image_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isActive) return;

      if (!error && data) {
        setPlayerProfile({
          first_name: data.first_name ?? undefined,
          last_name: data.last_name ?? undefined,
          image_url: data.image_url ?? undefined,
        });
      } else {
        setPlayerProfile(null);
      }
    };

    void fetchPlayer();
    return () => {
      isActive = false;
    };
  }, [user?.id]);

  // --- BOOT GUARD -------------------------------------------------------------
  // During auth boot, render nothing so the public/home navbar never flashes
  // for users who are actually logged in. App-level BootGate will handle
  // the splash and the initial redirect.
  if (isLoading) return null;
  // ---------------------------------------------------------------------------

  const handleLogout = async () => {
    await logout();

    /*console.log(
      "[NAV]",
      "navigating from",
      location.pathname,
      "to",
      "/",
      "reason: Logging Out"
    );
    */

    navigate("/");
  };

  /**
   * Only show restricted tabs if the user is an ACTIVE member of the current club.
   * Otherwise no tabs are exposed.
   */
  const navItems =
    isAuthenticated && initialized && membershipStatus === "active" && clubId
      ? [
          { label: "Dashboard", path: `/dashboard/${clubId}`, visible: true },
          { label: "Archive", path: `/games/${clubId}`, visible: true },
          { label: "Members", path: `/members/${clubId}`, visible: true },
        ]
      : [];

  const accountItems = [
    { label: "Profile", path: `/user/${user?.id}`, icon: User },
    { label: "Clubs", path: "/clubs", icon: UserPlus },
    {
      label: "Settings",
      icon: Settings,
      disabled: true, // visually disabled
    },
  ].filter(Boolean);

  const handleLandingNavClick = (
    sectionId: "features" | "how-it-works" | "faqs"
  ) => {
    // If we're not on the homepage, navigate there with the hash.
    if (pathname !== "/") {
      navigate(`/#${sectionId}`);
      return;
    }

    // On homepage: update URL hash and smooth-scroll to section
    const element = document.getElementById(sectionId);
    if (element) {
      window.history.pushState(null, "", `/#${sectionId}`);
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Homepage/Landing Navbar (when not authenticated)
  const HomepageNav = () => (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 glass bg-white/70 border-b border-glass-border border-gray-200 transition-transform duration-500 ease-out ${
        isNavHidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="inline-block">
            <img
              src="/logo-lightmode.svg"
              alt="VolleySmart"
              className="h-8 sm:h-10 md:h-12 w-auto transition-all duration-300"
              loading="eager"
            />
          </Link>

          {/* Center nav links (desktop only) */}
          <div className="hidden md:flex items-center gap-10">
            <button
              type="button"
              onClick={() => handleLandingNavClick("features")}
              className="text-lg font-medium text-gray-700 hover:text-gray-900"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleLandingNavClick("how-it-works")}
              className="text-lg font-medium text-gray-700 hover:text-gray-900"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => handleLandingNavClick("faqs")}
              className="text-lg font-medium text-gray-700 hover:text-gray-900"
            >
              FAQs
            </button>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-900 bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900"
              >
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button
                variant="primary"
                size="sm"
                className="!bg-[hsl(var(--primary))] !text-white hover:!bg-[hsl(225,80%,28%)]"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );

  const DesktopNav = () => (
    <header className="shadow-sm border-b border-gray-200 dark:border-gray-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 lg:border-none">
          <div className="flex items-center">
            {/* /* If authenticated and we have a clubId → send to that club’s
            dashboard. * If authenticated but NO clubId → send to /clubs
            (fallback). * If not authenticated → send to homepage (/). */}
            <Logo
              size="md"
              linkTo={
                isAuthenticated && membershipStatus === "active" && clubId
                  ? `/dashboard/${clubId}`
                  : "/clubs"
              }
            />
          </div>

          <div className="flex-grow hidden md:flex justify-center">
            <div className="space-x-8">
              {navItems
                .filter((item) => item.visible)
                .map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="text-base font-medium text-gray-700 dark:text-gray-300 hover:text-volleyball-primary dark:hover:text-blue-400 border-b border-transparent hover:border-[#243F8D] dark:hover:border-blue-400 pb-1 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated &&
              initialized &&
              membershipStatus === "active" &&
              clubId && (
                <Button
                  variant="primary"
                  onClick={() => {
                    navigate(`/new-game/${clubId}`);
                  }}
                >
                  Create Game
                </Button>
              )}

            <ThemeToggle
              className="rounded-md p-2
  hover:bg-gray-100 focus:bg-gray-100
  dark:hover:bg-gray-800 dark:focus:bg-gray-800
  transition-colors"
            />
            <DropdownMenu>
              {/* Account trigger with photo or initials */}
              <DropdownMenuTrigger className="flex items-center group">
                {(() => {
                  const { avatarUrl, initials } = getAvatarAndInitials(
                    (user ?? null) as AuthLikeUser | null,
                    playerProfile
                  );

                  return (
                    <div
                      className="h-10 w-10 rounded-full overflow-hidden
                   ring-0 group-hover:ring-2 ring-gray-300 dark:ring-gray-600
                   bg-gray-200 dark:bg-gray-700
                   transition-all flex items-center justify-center"
                      aria-label="Open account menu"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="User avatar"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 select-none">
                          {initials}
                        </span>
                      )}
                    </div>
                  );
                })()}
                <ChevronDown
                  className="ml-1 h-4 w-4 text-gray-500 dark:text-gray-400
               group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors"
                />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-gray-200 shadow-md
             dark:bg-gray-800 dark:border-gray-700"
              >
                {accountItems.map((item: AccountMenuItem, index) => {
                  const base =
                    "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700";

                  if (item.disabled) {
                    // Disabled (e.g., Settings)
                    return (
                      <DropdownMenuItem
                        key={index}
                        disabled
                        className={`${base} opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-500`}
                      >
                        <div className="flex items-center w-full">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                      </DropdownMenuItem>
                    );
                  }

                  // Enabled items keep Link behavior
                  return (
                    <DropdownMenuItem key={index} asChild className={base}>
                      <Link
                        to={item.path}
                        className="flex items-center cursor-pointer"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-gray-700 hover:bg-gray-100 hover:text-gray-900
             focus:bg-gray-100 focus:text-gray-900
             dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </header>
  );

  const MobileNav = () => (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <nav className="px-4 py-3 flex items-center justify-between">
        <Logo
          size="sm"
          linkTo={
            isAuthenticated && membershipStatus === "active" && clubId
              ? `/dashboard/${clubId}`
              : "/clubs"
          }
        />
        <div className="flex items-center space-x-2">
          <ThemeToggle
            className="rounded-md p-2
  hover:bg-gray-100 focus:bg-gray-100
  dark:hover:bg-gray-800 dark:focus:bg-gray-800
  transition-colors"
          />
          <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
              {/* Theme-safe trigger; we keep the hamburger here */}
              <Button
                size="icon"
                aria-expanded={isOpen}
                className={`${
                  isOpen ? "bg-muted" : "bg-transparent"
                } border-border text-foreground hover:bg-muted focus:bg-muted`}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </DrawerTrigger>

            <DrawerContent
              /* Full width bottom drawer, rounded top handled by component defaults */
              className="p-0 bg-background"
            >
              <div className="flex h-full max-h-[calc(100dvh-48px)] flex-col">
                <DrawerHeader className="h-3 border-border">
                  <DrawerTitle className="sr-only">Navigation Menu</DrawerTitle>
                </DrawerHeader>

                {/* Body */}
                <div className="flex flex-1 flex-col justify-center overflow-auto">
                  {navItems
                    .filter((item) => item.visible)
                    .map((item) => (
                      <DrawerClose asChild key={item.path}>
                        <Link
                          to={item.path}
                          className="px-4 py-4 text-lg font-medium hover:bg-muted/50 text-center border-b border-muted dark:text-gray-100"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.label}
                        </Link>
                      </DrawerClose>
                    ))}

                  {/* Account section */}
                  {accountItems.map((item: AccountMenuItem, index) => {
                    const rowBase =
                      "px-4 py-4 text-lg font-medium text-center border-b border-border flex items-center justify-center";
                    if (item.disabled) {
                      // Visible but disabled: no navigation, reduced opacity, not focusable
                      return (
                        <div
                          key={`account-${index}`}
                          aria-disabled="true"
                          className={`${rowBase} opacity-60 cursor-not-allowed select-none dark:text-gray-400`}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                      );
                    }

                    // Enabled items
                    return (
                      <DrawerClose asChild key={`account-${index}`}>
                        <Link
                          to={item.path ?? "#"}
                          data-vaul-no-drag
                          className={`${rowBase} hover:bg-muted/50 dark:text-gray-100`}
                          onClick={() => setIsOpen(false)}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DrawerClose>
                    );
                  })}
                </div>

                {/* Footer with safe-area padding; lifts buttons from the bottom */}
                <DrawerFooter className="mt-auto p-4 pt-6 border-t border-border pb-[calc(env(safe-area-inset-bottom)+24px)]">
                  {isAuthenticated &&
                    initialized &&
                    membershipStatus === "active" &&
                    clubId && (
                      <Button
                        variant="primary"
                        className="w-full mb-2"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/new-game/${clubId}`);
                        }}
                      >
                        Create Game
                      </Button>
                    )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                  >
                    Log Out
                  </Button>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </nav>
    </header>
  );

  // Mobile homepage nav (white sheet, light logo)
  const MobileHomepageNav = () => (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 border-b border-gray-200 transition-transform duration-500 ease-out ${
        isNavHidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Force light logo and link to / */}
          <Link to="/" className="inline-block">
            <img
              src="/logo-lightmode.svg"
              alt="VolleySmart"
              className="h-8 w-auto sm:h-10 transition-all duration-300"
              loading="eager"
            />
          </Link>

          <div className="flex items-center space-x-2">
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
              <DrawerTrigger asChild>
                <Button
                  size="icon"
                  aria-expanded={isOpen}
                  className={`${
                    isOpen ? "bg-gray-100" : "bg-transparent"
                  } text-gray-900 hover:bg-gray-100 focus:bg-gray-100`}
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </DrawerTrigger>

              <DrawerContent className="p-0 bg-white [&>div:first-child]:bg-gray-200 [&>div:first-child]:h-1.5 [&>div:first-child]:w-24 [&>div:first-child]:rounded-full [&>div:first-child]:mx-auto [&>div:first-child]:mt-3">
                <div className="flex h-full max-h-[calc(100dvh-48px)] flex-col">
                  <DrawerHeader className="py-3 border-0">
                    <DrawerTitle className="sr-only">
                      Navigation Menu
                    </DrawerTitle>
                  </DrawerHeader>

                  <div className="flex flex-1 flex-col items-center justify-center space-y-6 px-4">
                    {/* Section links */}
                    <div className="w-full max-w-md space-y-3">
                      <DrawerClose asChild>
                        <button
                          type="button"
                          onClick={() => {
                            handleLandingNavClick("features");
                            setIsOpen(false);
                          }}
                          className="block w-full text-center rounded-md bg-white px-4 py-3 text-lg font-medium text-gray-900 hover:bg-gray-50"
                        >
                          Features
                        </button>
                      </DrawerClose>
                      <DrawerClose asChild>
                        <button
                          type="button"
                          onClick={() => {
                            handleLandingNavClick("how-it-works");
                            setIsOpen(false);
                          }}
                          className="block w-full text-center rounded-md bg-white px-4 py-3 text-lg font-medium text-gray-900 hover:bg-gray-50"
                        >
                          How it works
                        </button>
                      </DrawerClose>
                      <DrawerClose asChild>
                        <button
                          type="button"
                          onClick={() => {
                            handleLandingNavClick("faqs");
                            setIsOpen(false);
                          }}
                          className="block w-full text-center rounded-md bg-white px-4 py-3 text-lg font-medium text-gray-900 hover:bg-gray-50"
                        >
                          FAQs
                        </button>
                      </DrawerClose>
                    </div>

                    {/* Auth buttons */}
                    <DrawerClose asChild>
                      <Link to="/login" className="w-full max-w-xs">
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full border-black text-black bg-white hover:bg-gray-100 text-xl py-6"
                          onClick={() => setIsOpen(false)}
                        >
                          Login
                        </Button>
                      </Link>
                    </DrawerClose>

                    <DrawerClose asChild>
                      <Link to="/signup" className="w-full max-w-xs">
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full text-xl py-6 !bg-[hsl(var(--primary))] !text-white hover:!bg-[hsl(225,80%,28%)]"
                          onClick={() => setIsOpen(false)}
                        >
                          Sign Up
                        </Button>
                      </Link>
                    </DrawerClose>
                  </div>

                  <DrawerFooter className="p-4 pt-0 border-0 border-border pb-[calc(env(safe-area-inset-bottom)+48px)]">
                    {/* Room for any future links or legal text */}
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
    </nav>
  );

  // Return different navbar based on authentication status
  if (!isAuthenticated) {
    // Homepage must stay unchanged on mobile/desktop
    return isCompact ? <MobileHomepageNav /> : <HomepageNav />;
  }
  // On authenticated routes:
  // - On compact screens, DO NOT render this Navbar (MobileTopBar handles it).
  // - On desktop (>= lg), keep the DesktopNav exactly as today.
  // Hide navbar entirely on editor/join/new-club routes (desktop too)
  if (suppressChrome) return null;

  // Authenticated: no legacy navbar on compact; keep desktop
  return isCompact ? null : <DesktopNav />;
};

export default Navbar;

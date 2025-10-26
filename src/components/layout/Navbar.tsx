import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/theme-toggle";
import { Menu, X, ChevronDown, Settings, User, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/common/Logo";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

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
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const { clubId, membershipStatus, setClubId, initialized } = useClub();

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

  // Player profile for avatar + names
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(
    null
  );

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("players")
        .select("first_name,last_name,image_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setPlayerProfile(data as PlayerProfile);
      } else {
        // keep null; initials fallback will be used
      }
    };

    fetchPlayer();
  }, [user?.id]);

  /**
   * Only show restricted tabs if the user is an ACTIVE member of the current club.
   * Otherwise no tabs are exposed.
   */
  const navItems =
    isAuthenticated && membershipStatus === "active" && clubId
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

  // Homepage/Landing Navbar (when not authenticated)
  const HomepageNav = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
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

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-900 text-gray-900 hover:bg-gray-100"
              >
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm">
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
            {isAuthenticated && membershipStatus === "active" && clubId && (
              <Button
                variant="primary"
                onClick={() => {
                  // Only reachable when clubId is valid and membership is active
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
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="w-full h-full p-0">
              <div className="flex flex-col h-full">
                <SheetHeader className="p-4 border-b dark:border-gray-700">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="flex justify-start items-center">
                    <Logo
                      size="sm"
                      linkTo={
                        isAuthenticated &&
                        membershipStatus === "active" &&
                        clubId
                          ? `/dashboard/${clubId}`
                          : "/clubs"
                      }
                    />
                  </div>
                </SheetHeader>

                <div className="flex flex-col flex-1 overflow-auto">
                  {navItems
                    .filter((item) => item.visible)
                    .map((item) => (
                      <SheetClose asChild key={item.path}>
                        <Link
                          to={item.path}
                          className="px-4 py-4 text-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 text-center border-b border-gray-100 dark:border-gray-800 dark:text-gray-100"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}

                  {accountItems.map((item: AccountMenuItem, index) => {
                    if (item.disabled) {
                      return (
                        <div
                          key={`account-${index}`}
                          className="px-4 py-4 text-lg font-medium text-gray-400 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center opacity-60 cursor-not-allowed"
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                      );
                    }

                    return (
                      <SheetClose asChild key={`account-${index}`}>
                        <Link
                          to={item.path}
                          className="px-4 py-4 text-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 text-center border-b border-gray-100 dark:border-gray-800 flex items-center justify-center dark:text-gray-100"
                          onClick={() => setIsOpen(false)}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>

                <div className="p-4 border-t dark:border-gray-700 mt-auto">
                  {isAuthenticated &&
                    membershipStatus === "active" &&
                    clubId && (
                      <SheetClose asChild>
                        <Button
                          variant="primary"
                          className="w-full mb-3"
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/new-game/${clubId}`);
                          }}
                        >
                          Create Game
                        </Button>
                      </SheetClose>
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
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );

  // Mobile homepage nav (white sheet, light logo)
  const MobileHomepageNav = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
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
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-700 hover:bg-gray-100"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>

              {/* White background instead of dark overlay */}
              <SheetContent
                side="top"
                className="w-full h-full p-0 bg-white border-gray-200"
              >
                <div className="flex flex-col h-full">
                  <SheetHeader className="p-4 border-b border-gray-200">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <div className="flex justify-start items-center">
                      <Link
                        to="/"
                        className="inline-block"
                        onClick={() => setIsOpen(false)}
                      >
                        <img
                          src="/logo-lightmode.svg"
                          alt="VolleySmart"
                          className="h-8 w-auto"
                          loading="eager"
                        />
                      </Link>
                    </div>
                  </SheetHeader>

                  <div className="flex flex-col flex-1 justify-center items-center space-y-6 px-4">
                    <SheetClose asChild>
                      <Link to="/login" className="w-full max-w-xs">
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full border-gray-900 text-gray-900 hover:bg-gray-100 text-xl py-6"
                          onClick={() => setIsOpen(false)}
                        >
                          Login
                        </Button>
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link to="/signup" className="w-full max-w-xs">
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full text-xl py-6"
                          onClick={() => setIsOpen(false)}
                        >
                          Sign Up
                        </Button>
                      </Link>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );

  // Return different navbar based on authentication status
  if (!isAuthenticated) {
    return isMobile ? <MobileHomepageNav /> : <HomepageNav />;
  }

  return isMobile ? <MobileNav /> : <DesktopNav />;
};

export default Navbar;

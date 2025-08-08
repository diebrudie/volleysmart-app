import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/theme-toggle";
import {
  Menu,
  X,
  ChevronDown,
  Settings,
  User,
  Users,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/common/Logo";
import { useIsMobile } from "@/hooks/use-mobile";
import { useClub } from "@/contexts/ClubContext";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const { clubId, setClubId } = useClub();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  useEffect(() => {
    const lastClub = localStorage.getItem("lastVisitedClub");
    if (lastClub && lastClub !== clubId) {
      setClubId(lastClub);
    }
  }, [setClubId, clubId]);

  const navItems = clubId
    ? [
        {
          label: "Dashboard",
          path: `/dashboard/${clubId}`,
          visible: isAuthenticated,
        },
        {
          label: "Archive",
          path: `/games/${clubId}`,
          visible: isAuthenticated,
        },
        {
          label: "Members",
          path: `/members/${clubId}`,
          visible: isAuthenticated,
        },
      ]
    : [];

  const accountItems = [
    { label: "Profile", path: `/user/${user?.id}`, icon: User },
    { label: "Clubs", path: "/clubs", icon: UserPlus },
    { label: "Settings", path: "/settings", icon: Settings },
    user?.role === "admin" && { label: "Users", path: "/admin", icon: Users },
  ].filter(Boolean);

  const DesktopNav = () => (
    <header className="shadow-sm border-b border-gray-200 dark:border-gray-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 lg:border-none">
          <div className="flex items-center">
            <Logo
              size="md"
              linkTo={isAuthenticated && clubId ? `/dashboard/${clubId}` : "/"}
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
            {isAuthenticated ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (clubId) {
                      navigate(`/new-game/${clubId}`);
                    } else {
                      navigate("/new-game");
                    }
                  }}
                >
                  Create Game
                </Button>
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <ChevronDown className="ml-1 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {accountItems.map((item, index) => (
                      <DropdownMenuItem key={index} asChild>
                        <Link
                          to={item.path}
                          className="flex items-center cursor-pointer"
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer"
                    >
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="default">Sign up</Button>
                </Link>
              </>
            )}
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
          linkTo={isAuthenticated && clubId ? `/dashboard/${clubId}` : "/"}
        />
        <div className="flex items-center space-x-2">
          <ThemeToggle />
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
                        isAuthenticated && clubId ? `/dashboard/${clubId}` : "/"
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

                  {isAuthenticated &&
                    accountItems.map((item, index) => (
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
                    ))}
                </div>

                <div className="p-4 border-t dark:border-gray-700 mt-auto">
                  {isAuthenticated ? (
                    <>
                      <SheetClose asChild>
                        <Button
                          variant="primary"
                          className="w-full mb-3"
                          onClick={() => {
                            setIsOpen(false);
                            if (clubId) {
                              navigate(`/new-game/${clubId}`);
                            } else {
                              navigate("/new-game");
                            }
                          }}
                        >
                          Create Game
                        </Button>
                      </SheetClose>
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
                    </>
                  ) : (
                    <div className="space-y-3">
                      <SheetClose asChild>
                        <Link to="/login" className="block w-full">
                          <Button variant="outline" className="w-full">
                            Log in
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to="/signup" className="block w-full">
                          <Button variant="default" className="w-full">
                            Sign up
                          </Button>
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );

  return isMobile ? <MobileNav /> : <DesktopNav />;
};

export default Navbar;


import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, Settings, User, Users, UserPlus } from "lucide-react";
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

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const { clubId } = useClub();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };  

  useEffect(() => {
    const lastClub = localStorage.getItem("lastVisitedClub");
    if (lastClub) setClubId(lastClub);
  }, [setClubId]);


  // Get current club ID from localStorage for members link
  /*
  const getCurrentClubId = () => {
    return localStorage.getItem('lastVisitedClub') || '';
  };
  */
  // Navigation items
  const navItems = clubId
  ? [
      { label: "Dashboard", path: `/dashboard/${clubId}`, visible: isAuthenticated },
      { label: "Archive", path: `/matches/${clubId}`, visible: isAuthenticated },
      { label: "Members", path: `/members/${clubId}`, visible: isAuthenticated },
    ]
  : []; // ⬅️ Hide nav links until a club is selected

  // Account dropdown items
  const accountItems = [
    { label: "Profile", path: `/user/${user?.id}`, icon: User },
    { label: "Clubs", path: "/clubs", icon: UserPlus },
    { label: "Settings", path: "/settings", icon: Settings },
    user?.role === "admin" && { label: "Users", path: "/admin", icon: Users },
  ].filter(Boolean);

  // Desktop navbar
  const DesktopNav = () => (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-4 flex items-center justify-between border-b border-gray-200 lg:border-none">
          <div className="flex items-center">
            <Logo size="md" linkTo={isAuthenticated && clubId ? `/dashboard/${clubId}` : "/"} />
          </div>
          
          {/* Centered Navigation Links */}
          <div className="flex-grow hidden md:flex justify-center">
            <div className="space-x-8">
              {navItems.filter(item => item.visible).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-base font-medium text-gray-700 hover:text-volleyball-primary border-b border-transparent hover:border-[#243F8D] pb-1 transition-colors"
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
                  className="rounded-md bg-[#243F8D]"
                  onClick={() => navigate("/generate-teams")}
                >
                  Create Game
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {accountItems.map((item, index) => (
                      <DropdownMenuItem key={index} asChild>
                        <Link to={item.path} className="flex items-center cursor-pointer">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
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

  // Mobile navbar
  const MobileNav = () => (
    <header className="bg-white shadow-sm">
      <nav className="px-4 py-3 flex items-center justify-between">
        <Logo size="md" linkTo={isAuthenticated && clubId ? `/dashboard/${clubId}` : "/"} />
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
            <div className="flex flex-col h-full">
              <SheetHeader className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <Logo size="md" linkTo={isAuthenticated && clubId ? `/dashboard/${clubId}` : "/"} />
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon">
                      <X className="h-6 w-6" />
                    </Button>
                  </SheetClose>
                </div>
              </SheetHeader>
              
              <div className="flex flex-col flex-1 overflow-auto">
                {navItems.filter(item => item.visible).map((item) => (
                  <SheetClose asChild key={item.path}>
                    <Link 
                      to={item.path} 
                      className="px-4 py-3 text-base font-medium hover:bg-gray-50 text-center"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                
                {isAuthenticated && (
                  <div className="mt-2">
                    <div className="px-4 py-2 flex items-center">
                      <span className="text-sm font-semibold">Account</span>
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </div>
                    {accountItems.map((item, index) => (
                      <SheetClose asChild key={index}>
                        <Link 
                          to={item.path} 
                          className="px-8 py-2 text-base flex items-center hover:bg-gray-50"
                          onClick={() => setIsOpen(false)}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t mt-auto">
                {isAuthenticated ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full mb-3" 
                      onClick={handleLogout}
                    >
                      Log Out
                    </Button>
                    <SheetClose asChild>
                      <Button 
                        className="w-full bg-[#243F8D]"
                        onClick={() => {
                          setIsOpen(false);
                          navigate("/generate-teams");
                        }}
                      >
                        Create Game
                      </Button>
                    </SheetClose>
                  </>
                ) : (
                  <div className="space-y-3">
                    <SheetClose asChild>
                      <Link to="/login" className="block w-full">
                        <Button variant="outline" className="w-full">Log in</Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/signup" className="block w-full">
                        <Button variant="default" className="w-full">Sign up</Button>
                      </Link>
                    </SheetClose>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );

  return isMobile ? <MobileNav /> : <DesktopNav />;
};

export default Navbar;

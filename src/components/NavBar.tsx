import { useSessionContext } from "@supabase/auth-helpers-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { Menu, X } from "lucide-react"; // Import icons
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const NavBar = () => {
  const { session } = useSessionContext();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Clear any stale auth data on component mount
  useEffect(() => {
    const clearStaleAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-xmbqoxiozczwnqrmmnzq-auth-token');
      }
    };
    clearStaleAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      // Clear local storage first
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-xmbqoxiozczwnqrmmnzq-auth-token');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (error.message === 'session_not_found') {
          // Session already expired/not found, just redirect
          navigate('/');
          return;
        }
        throw error;
      }
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error("Failed to sign out. Please try again.");
      // Force reload the page if there's an error
      window.location.reload();
    }
  };

  const NavItems = () => (
    <>
      {session && (
        <Button 
          variant="ghost"
          onClick={() => {
            navigate('/');
            setIsOpen(false);
          }}
          className="w-full justify-start md:w-auto"
        >
          My Walls
        </Button>
      )}
      {session ? (
        <>
          <Button 
            variant="outline"
            onClick={() => {
              navigate('/create');
              setIsOpen(false);
            }}
            className="w-full justify-start md:w-auto"
          >
            Create Wall
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={getAvatarUrl(session.user.id)}
                alt={session.user.email || 'User avatar'}
              />
              <AvatarFallback>
                {session.user.email?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hidden md:inline">
              {session.user.email}
            </span>
          </div>
          <Button 
            variant="outline"
            onClick={handleSignOut}
            className="w-full justify-start md:w-auto"
          >
            Sign Out
          </Button>
        </>
      ) : (
        <Button 
          onClick={() => {
            navigate('/');
            setIsOpen(false);
          }}
          className="w-full justify-start md:w-auto"
        >
          Sign In
        </Button>
      )}
    </>
  );

  return (
    <nav className="border-b mb-6 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-lg font-semibold"
          >
            Secret Message
          </Button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavItems />
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
              <div className="flex flex-col space-y-4 mt-8">
                <NavItems />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
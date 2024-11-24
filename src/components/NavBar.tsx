import { useSessionContext } from "@supabase/auth-helpers-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getAvatarUrl } from "@/lib/utils/avatar";

const NavBar = () => {
  const { session } = useSessionContext();
  const navigate = useNavigate();

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

  return (
    <nav className="border-b mb-6">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-lg font-semibold"
          >
            Secret Message
          </Button>
          {session && (
            <Button 
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-sm"
            >
              My Walls
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {session ? (
            <>
              <Button 
                variant="outline"
                onClick={() => navigate('/create')}
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
                <span className="text-sm text-muted-foreground">
                  {session.user.email}
                </span>
              </div>
              <Button 
                variant="outline"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate('/')}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
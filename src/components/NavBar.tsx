import { useSessionContext } from "@supabase/auth-helpers-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const NavBar = () => {
  const { session } = useSessionContext();
  const navigate = useNavigate();

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
        </div>
        <div className="flex items-center space-x-4">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground">
                {session.user.email}
              </span>
              <Button 
                variant="outline"
                onClick={() => supabase.auth.signOut()}
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
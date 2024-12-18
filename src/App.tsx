import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { SessionContextProvider, useSessionContext } from '@supabase/auth-helpers-react';
import { supabase } from "@/integrations/supabase/client";
import NavBar from "./components/NavBar";
import Index from "./pages/Index";
import MessageWall from "./pages/MessageWall";
import SendMessage from "./pages/SendMessage";
import CreateWall from "./pages/CreateWall";
import Login from "./pages/Login";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const queryClient = new QueryClient();

// Protected route wrapper for authenticated routes
const AuthProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useSessionContext();
  
  if (!session) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Wall route wrapper that handles both public and private walls
const WallRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useSessionContext();
  const [isLoading, setIsLoading] = useState(true);
  const wallId = location.pathname.split('/wall/')[1];

  useEffect(() => {
    const checkWallAccess = async () => {
      if (!wallId) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if wall exists and its privacy status
        const { data: wall, error } = await supabase
          .from('links')
          .select('password, user_id')
          .eq('id', wallId)
          .single();

        if (error) throw error;

        // Check access conditions
        const isPublic = !wall.password;
        const isOwner = session?.user?.id === wall.user_id;
        const hasWallSession = localStorage.getItem(`wall-session-${wallId}`);

        // Allow access if wall is public or user is owner
        if (isPublic || isOwner) {
          setIsLoading(false);
          return;
        }

        // For private walls, require password session
        if (wall.password && !hasWallSession) {
          navigate(`/send/${wallId}`, { replace: true });
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking wall access:', error);
        toast.error("Failed to check wall access");
        setIsLoading(false);
      }
    };

    checkWallAccess();
  }, [wallId, session, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const App = () => {
  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Check if we have an access token in the URL
      const hash = window.location.hash;
      if (hash.includes('access_token=')) {
        try {
          // Extract the access token
          const params = new URLSearchParams(hash.replace('#', '').replace('#', ''));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const expiresIn = params.get('expires_in');

          if (accessToken) {
            // Set the session in Supabase
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            if (error) throw error;

            // Clear the URL hash
            window.history.replaceState(null, '', window.location.pathname);

            // Show success message
            toast.success('Successfully signed in with Google!');
          }
        } catch (error) {
          console.error('Error handling auth redirect:', error);
          toast.error('Failed to complete sign in');
        }
      }
    };

    handleAuthRedirect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider supabaseClient={supabase}>
        <TooltipProvider>
          <div className="gradient-bg min-h-screen">
            <Toaster />
            <Sonner />
            <HashRouter>
              <NavBar />
              <div className="container mx-auto px-4">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route 
                    path="/create" 
                    element={
                      <AuthProtectedRoute>
                        <CreateWall />
                      </AuthProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/wall/:userId" 
                    element={
                      <WallRoute>
                        <MessageWall />
                      </WallRoute>
                    } 
                  />
                  <Route path="/send/:userId" element={<SendMessage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </HashRouter>
          </div>
        </TooltipProvider>
      </SessionContextProvider>
    </QueryClientProvider>
  );
};

export default App;

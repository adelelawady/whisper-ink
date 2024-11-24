import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { SessionContextProvider, useSessionContext } from '@supabase/auth-helpers-react';
import { supabase } from "@/integrations/supabase/client";
import NavBar from "./components/NavBar";
import Index from "./pages/Index";
import MessageWall from "./pages/MessageWall";
import SendMessage from "./pages/SendMessage";
import CreateWall from "./pages/CreateWall";
import { useEffect, useState } from "react";

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
  const wallId = location.pathname.split('/')[2];

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

        // Allow access if any condition is met
        if (isPublic || isOwner || hasWallSession) {
          setIsLoading(false);
          return;
        }

        // Only redirect if it's a private wall and no access conditions are met
        if (wall.password && !isOwner && !hasWallSession) {
          navigate(`/send/${wallId}`, { replace: true });
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking wall access:', error);
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionContextProvider supabaseClient={supabase}>
      <TooltipProvider>
        <div className="gradient-bg min-h-screen">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NavBar />
            <div className="container mx-auto px-4">
              <Routes>
                <Route path="/" element={<Index />} />
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
              </Routes>
            </div>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </SessionContextProvider>
  </QueryClientProvider>
);

export default App;
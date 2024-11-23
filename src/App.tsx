import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionContextProvider, useSessionContext } from '@supabase/auth-helpers-react';
import { supabase } from "@/integrations/supabase/client";
import NavBar from "./components/NavBar";
import Index from "./pages/Index";
import MessageWall from "./pages/MessageWall";
import SendMessage from "./pages/SendMessage";
import CreateWall from "./pages/CreateWall";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useSessionContext();
  
  if (!session) {
    return <Navigate to="/" replace />;
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
                    <ProtectedRoute>
                      <CreateWall />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/wall/:userId" 
                  element={
                    <ProtectedRoute>
                      <MessageWall />
                    </ProtectedRoute>
                  } 
                />
                {/* Send message route is now public */}
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
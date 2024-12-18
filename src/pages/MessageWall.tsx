import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WallHeader } from "@/components/wall/WallHeader";
import { MessageCard } from "@/components/wall/MessageCard";
import { PasswordProtection } from "@/components/wall/PasswordProtection";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Share2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getBaseUrl } from "@/lib/utils/url";
import { recordWallVisit } from "@/components/ui/recent-walls";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  comments: Comment[];
}

interface Link {
  id: string;
  title: string;
  password: string | null;
  user_id: string;
}

const MessageWall = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSessionContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const { data: link } = useQuery({
    queryKey: ["link", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data as Link;
    },
  });

  const isPublicWall = !link?.password;

  const { data: messages } = useQuery({
    queryKey: ["messages", userId, isAuthenticated],
    queryFn: async () => {
      if (!userId) return null;
      
      // Don't try to fetch messages if wall is private and not authenticated
      if (!isPublicWall && !isAuthenticated) {
        return null;
      }
      
      // Get stored password
      const storedPassword = localStorage.getItem(`wall-password-${userId}`);
      
      // If wall is private and we don't have the password, return null
      if (!isPublicWall && !storedPassword) {
        setIsAuthenticated(false); // Reset authentication if password is missing
        return null;
      }
      
      const { data, error } = await supabase
        .rpc('get_wall_messages', {
          wall_id: userId,
          wall_password: storedPassword // Send stored password or null
        });

      if (error) {
        console.error('Error fetching messages:', error);
        return null;
      }

      return data as Message[];
    },
    enabled: !!userId && (isPublicWall || isAuthenticated),
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: result, error } = await supabase
        .rpc('check_wall_password', {
          wall_id: userId,
          wall_password: password
        });

      if (error) throw error;

      if (result === true) {
        // First store the password, then set authenticated
        localStorage.setItem(`wall-password-${userId}`, password);
        localStorage.setItem(`wall-session-${userId}`, 'true');
        setIsAuthenticated(true);
        
        // Force refetch messages with new password
        await queryClient.invalidateQueries({ 
          queryKey: ["messages", userId],
          exact: false
        });
        toast.success("Password correct!");
      } else {
        toast.error("Incorrect password");
      }
    } catch (error) {
      console.error('Error checking password:', error);
      toast.error("Failed to verify password");
    }
  };

  // Update the useEffect to handle both session and password
  useEffect(() => {
    const checkAccess = async () => {
      const wallSession = localStorage.getItem(`wall-session-${userId}`);
      const storedPassword = localStorage.getItem(`wall-password-${userId}`);
      
      // Check if we have both session and password for private walls
      if (wallSession && (!link?.password || storedPassword)) {
        setIsAuthenticated(true);
      } else {
        // Clear stale data if we don't have both
        localStorage.removeItem(`wall-session-${userId}`);
        localStorage.removeItem(`wall-password-${userId}`);
        setIsAuthenticated(false);
      }
    };

    if (userId && link) {
      checkAccess();
    }
  }, [userId, link]);

  const isWallOwner = session?.user?.id === link?.user_id;

  const handleDeleteWall = async () => {
    try {
      const { error } = await supabase
        .from("links")
        .delete()
        .eq("id", userId)
        .eq("user_id", session?.user?.id);

      if (error) throw error;

      toast.success("Wall deleted successfully");
      navigate("/");
    } catch (error) {
      console.error("Error deleting wall:", error);
      toast.error("Failed to delete wall");
    }
  };

  // Add this effect to record visits
  useEffect(() => {
    if (link) {
      recordWallVisit(
        link.id,
        link.title,
        !!(link.password && isAuthenticated)
      );
    }
  }, [link, isAuthenticated]);

  // Add this function to handle send message navigation
  const handleSendMessage = () => {
    // If wall is private and user is authenticated, pass the password in the URL
    if (!isPublicWall && isAuthenticated) {
      const storedPassword = localStorage.getItem(`wall-password-${userId}`);
      if (storedPassword) {
        const encodedPassword = encodeURIComponent(storedPassword);
        navigate(`/send/${userId}?password=${encodedPassword}`, {
          state: { fromWall: true }
        });
      } else {
        // If somehow we lost the password, reset auth
        setIsAuthenticated(false);
        localStorage.removeItem(`wall-session-${userId}`);
        toast.error("Please re-enter the wall password");
      }
    } else {
      navigate(`/send/${userId}`);
    }
  };

  if (!link) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-16">
      <div className="flex flex-col items-center mb-12">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-4xl font-bold">{link.title}</h1>
          {isWallOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your wall
                    and all its messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteWall}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Wall
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <p className="text-lg text-muted-foreground">
          Share this link to receive anonymous messages
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Input
            value={`${getBaseUrl()}/send/${userId}`}
            readOnly
            className="max-w-sm bg-white"
          />
          <Button onClick={() => {
            navigator.clipboard.writeText(`${getBaseUrl()}/send/${userId}`);
            toast.success("Link copied to clipboard!");
          }} variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button onClick={handleSendMessage} className="gap-2">
            <Send className="h-4 w-4" />
            Send Message
          </Button>
        </div>
      </div>

      {link.password && !isAuthenticated ? (
        <PasswordProtection 
          password={password}
          setPassword={setPassword}
          handlePasswordSubmit={handlePasswordSubmit}
        />
      ) : messages === null ? (
        <div className="text-center text-muted-foreground">
          No messages to display
        </div>
      ) : (
        <div className="space-y-6">
          {messages?.map((message, index) => (
            <MessageCard
              key={message.id}
              {...message}
              isWallOwner={isWallOwner}
              wallId={userId || ''}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageWall;
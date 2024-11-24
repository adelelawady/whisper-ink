import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WallHeader } from "@/components/wall/WallHeader";
import { MessageCard } from "@/components/wall/MessageCard";
import { PasswordProtection } from "@/components/wall/PasswordProtection";

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

  if (!link) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-16">
      <WallHeader title={link.title} wallId={userId || ''} />

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
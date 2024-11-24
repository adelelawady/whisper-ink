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

  useEffect(() => {
    const checkAccess = async () => {
      const wallSession = localStorage.getItem(`wall-session-${userId}`);
      
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const { data: link } = await supabase
        .from("links")
        .select("user_id")
        .eq("id", userId)
        .single();

      if (wallSession || (currentSession?.user.id === link?.user_id)) {
        setIsAuthenticated(true);
        if (currentSession?.user.id === link?.user_id) {
          localStorage.setItem(`wall-session-${userId}`, 'true');
        }
      }
    };

    if (userId) {
      checkAccess();
    }
  }, [userId]);

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
      if (link?.password && !isAuthenticated) {
        return null;
      }
      
      let query = supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          comments:message_comments (
            id,
            content,
            created_at,
            user_id
          )
        `)
        .eq("link_id", userId)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

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
        .from('links')
        .select('password')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (result.password === password) {
        setIsAuthenticated(true);
        localStorage.setItem(`wall-session-${userId}`, 'true');
        queryClient.invalidateQueries({ queryKey: ["messages", userId] });
      } else {
        toast.error("Incorrect password");
      }
    } catch (error) {
      console.error('Error checking password:', error);
      toast.error("Failed to verify password");
    }
  };

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
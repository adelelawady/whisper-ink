import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { useSessionContext } from "@supabase/auth-helpers-react";

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
  const [newComment, setNewComment] = useState("");
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

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

  const { data: messages } = useQuery({
    queryKey: ["messages", userId, isAuthenticated],
    queryFn: async () => {
      if (link?.password && !isAuthenticated) {
        return null;
      }
      
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          comments:message_comments (
            id,
            content,
            created_at,
            user_id
          )
        `)
        .eq("link_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error fetching messages:', error);
        return null;
      }
      return data as Message[];
    },
    enabled: !!userId && (!!link?.password === false || isAuthenticated),
  });

  const shareUrl = `${window.location.origin}/send/${userId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

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

  const handleAddComment = async (messageId: string) => {
    if (!newComment.trim()) return;

    if (!session?.user) {
      toast.error("You must be logged in to comment");
      return;
    }

    const { error } = await supabase
      .from("message_comments")
      .insert({
        content: newComment.trim(),
        message_id: messageId,
        user_id: session.user.id
      });

    if (error) {
      toast.error("Failed to add comment");
      return;
    }

    setNewComment("");
    setCommentingOn(null);
    queryClient.invalidateQueries({ queryKey: ["messages", userId] });
    toast.success("Comment added successfully!");
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{link?.title}</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Share this link to receive anonymous messages
        </p>
        <div className="flex items-center justify-center gap-4">
          <Input
            value={shareUrl}
            readOnly
            className="max-w-sm bg-white"
          />
          <Button onClick={copyLink} variant="outline">
            Copy Link
          </Button>
        </div>
      </div>

      {link?.password && !isAuthenticated ? (
        <Card className="p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-center">
            This wall is password protected
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password to view messages"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full">
              View Messages
            </Button>
          </form>
        </Card>
      ) : messages === null ? (
        <div className="text-center text-muted-foreground">
          No messages to display
        </div>
      ) : (
        <div className="space-y-6">
          {messages?.map((message, index) => (
            <Card
              key={message.id}
              className="p-6 message-card"
              style={{ "--animation-order": index } as React.CSSProperties}
            >
              <p className="text-lg mb-2">{message.content}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {new Date(message.created_at).toLocaleDateString()}
              </p>

              {/* Comments section */}
              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Comments</h3>
                <div className="space-y-3">
                  {message.comments?.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3 bg-muted p-3 rounded-md">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={getAvatarUrl(comment.user_id)} 
                          alt="User avatar"
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback>
                          {comment.user_id ? comment.user_id.slice(0, 2).toUpperCase() : 'AN'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            User {comment.user_id.slice(0, 6)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {isAuthenticated && (
                  <div className="mt-3">
                    {commentingOn === message.id ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage 
                              src={getAvatarUrl(session?.user?.id)} 
                              alt="Your avatar"
                              referrerPolicy="no-referrer"
                            />
                            <AvatarFallback>ME</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Textarea
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="min-h-[80px]"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm"
                            onClick={() => handleAddComment(message.id)}
                          >
                            Add Comment
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCommentingOn(null);
                              setNewComment("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommentingOn(message.id)}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage 
                            src={getAvatarUrl(session?.user?.id)} 
                            alt="Your avatar"
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback>ME</AvatarFallback>
                        </Avatar>
                        Add Comment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageWall;
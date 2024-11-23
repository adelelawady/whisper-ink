import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

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
      if (!isAuthenticated && link?.password) return [];
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          *,
          comments:message_comments(
            id,
            content,
            created_at,
            user_id
          )
        `)
        .eq("link_id", userId)
        .order("created_at", { ascending: false });
      
      if (messagesError) throw messagesError;
      return messagesData as Message[];
    },
    enabled: !!userId && (isAuthenticated || !link?.password),
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id === link?.user_id) {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, [link]);

  const shareUrl = `${window.location.origin}/send/${userId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === link?.password) {
      setIsAuthenticated(true);
    } else {
      toast.error("Incorrect password");
    }
  };

  const handleAddComment = async (messageId: string) => {
    if (!newComment.trim()) return;

    const { error } = await supabase
      .from("message_comments")
      .insert({
        content: newComment.trim(),
        message_id: messageId,
        user_id: (await supabase.auth.getSession()).data.session?.user.id
      });

    if (error) {
      toast.error("Failed to add comment");
      return;
    }

    toast.success("Comment added successfully!");
    setNewComment("");
    setCommentingOn(null);
  };

  if (link?.password && !isAuthenticated) {
    return (
      <div className="container max-w-md mx-auto px-4 py-16">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-center">Protected Message Wall</h1>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full">Access Messages</Button>
          </form>
        </Card>
      </div>
    );
  }

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
                  <div key={comment.id} className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>

              {isAuthenticated && (
                <div className="mt-3">
                  {commentingOn === message.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
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
                    >
                      Add Comment
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MessageWall;
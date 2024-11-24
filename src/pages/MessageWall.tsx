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
import { getBaseUrl } from "@/lib/utils/url";
import { MoreVertical, Trash2, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
          created_at
        `)
        .eq("link_id", userId)
        .order("created_at", { ascending: false });

      if (session) {
        query = supabase
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
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        return null;
      }
      return data as Message[];
    },
    enabled: !!userId && (isPublicWall || isAuthenticated),
  });

  const shareUrl = `${getBaseUrl()}/send/${userId}`;

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const isWallOwner = session?.user?.id === link?.user_id;

  const handleDeleteMessage = async (messageId: string) => {
    if (!isWallOwner) return;

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      toast.success("Message deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error("Failed to delete message");
    }
  };

  const handleDeleteWall = async () => {
    if (!isWallOwner) return;

    try {
      const { error } = await supabase
        .from("links")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast.success("Wall deleted successfully");
      navigate("/");
    } catch (error) {
      console.error('Error deleting wall:', error);
      toast.error("Failed to delete wall");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold">{link?.title}</h1>
            {isWallOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Wall</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this wall? This action cannot be undone.
                      All messages and comments will be permanently deleted.
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
        </div>

        <div className="flex items-center justify-center gap-4">
          <Input
            value={shareUrl}
            readOnly
            className="max-w-sm bg-white"
          />
          <Button onClick={copyLink} variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
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
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-lg mb-2">{message.content}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {formatDateTime(message.created_at)}
                  </p>
                </div>
                {isWallOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Message
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Comments section - Only show for authenticated users */}
              {session && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold">Comments</h3>
                    {!session && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/login')}
                      >
                        Sign in to view comments
                      </Button>
                    )}
                  </div>

                  {session && (
                    <>
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium">
                                  User {comment.user_id.slice(0, 6)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {session && isAuthenticated && (
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
                    </>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageWall;
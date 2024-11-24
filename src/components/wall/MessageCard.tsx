import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Trash2 } from "lucide-react";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { toast } from "sonner";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface MessageCardProps {
  id: string;
  content: string;
  created_at: string;
  comments: Comment[];
  isWallOwner: boolean;
  wallId: string;
}

export const MessageCard = ({ id, content, created_at, comments, isWallOwner, wallId }: MessageCardProps) => {
  const { session } = useSessionContext();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    if (!session?.user) {
      toast.error("You must be logged in to comment");
      return;
    }

    const { error } = await supabase
      .from("message_comments")
      .insert({
        content: newComment.trim(),
        message_id: id,
        user_id: session.user.id
      });

    if (error) {
      toast.error("Failed to add comment");
      return;
    }

    setNewComment("");
    setCommentingOn(null);
    queryClient.invalidateQueries({ queryKey: ["messages", wallId] });
    toast.success("Comment added successfully!");
  };

  const handleDeleteMessage = async () => {
    if (!isWallOwner) return;

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Message deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["messages", wallId] });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error("Failed to delete message");
    }
  };

  return (
    <Card className="p-6 message-card">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <p className="text-lg mb-2">{content}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {formatDateTime(created_at)}
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
                onClick={handleDeleteMessage}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold">Comments</h3>
          {!session && comments && comments.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/login'}
              className="text-xs"
            >
              Sign in to comment
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {comments?.map((comment) => (
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

        {session && (
          <div className="mt-3">
            {commentingOn === id ? (
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
                    onClick={handleAddComment}
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
                onClick={() => setCommentingOn(id)}
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
  );
};
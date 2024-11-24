import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Trash2 } from "lucide-react";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { toast } from "sonner";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/utils/date";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

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

        <CommentList comments={comments} />

        {session && (
          <div className="mt-3">
            {commentingOn === id ? (
              <CommentForm 
                messageId={id}
                wallId={wallId}
                onCancel={() => setCommentingOn(null)}
              />
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
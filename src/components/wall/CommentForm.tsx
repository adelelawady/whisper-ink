import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { toast } from "sonner";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CommentFormProps {
  messageId: string;
  wallId: string;
  onCancel: () => void;
}

export const CommentForm = ({ messageId, wallId, onCancel }: CommentFormProps) => {
  const { session } = useSessionContext();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

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
        message_id: messageId,
        user_id: session.user.id
      });

    if (error) {
      toast.error("Failed to add comment");
      return;
    }

    setNewComment("");
    onCancel();
    queryClient.invalidateQueries({ queryKey: ["messages", wallId] });
    toast.success("Comment added successfully!");
  };

  return (
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
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils/avatar";
import { formatDateTime } from "@/lib/utils/date";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface CommentListProps {
  comments: Comment[];
}

export const CommentList = ({ comments }: CommentListProps) => {
  return (
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
  );
};
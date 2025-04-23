
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  targetUserId: string;
  currentUserId: string | undefined;
  className?: string;
}

export function LikeButton({ targetUserId, currentUserId, className }: LikeButtonProps) {
  const { likeCount, isLiked, isLoading, toggleLike } = useLikes(targetUserId, currentUserId || '');

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isLoading || !currentUserId || currentUserId === targetUserId}
      onClick={toggleLike}
      data-user-id={targetUserId}
      className={cn(
        "gap-2",
        isLiked && "text-red-500",
        className
      )}
      title={!currentUserId ? "Login to like" : isLiked ? "Unlike profile" : "Like profile"}
    >
      <Heart className={cn(
        "h-5 w-5",
        isLiked && "fill-current text-red-500"
      )} />
      <span>{likeCount}</span>
    </Button>
  );
}

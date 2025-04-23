
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
      variant={isLiked ? "default" : "outline"}
      size="sm"
      disabled={isLoading || !currentUserId || currentUserId === targetUserId}
      onClick={toggleLike}
      data-user-id={targetUserId}
      className={cn(
        "gap-2",
        isLiked && "bg-red-500 hover:bg-red-600 text-white",
        className
      )}
      title={!currentUserId ? "Login to like" : currentUserId === targetUserId ? "Cannot like own profile" : isLiked ? "Unlike profile" : "Like profile"}
    >
      <Heart className={cn(
        "h-5 w-5",
        isLiked && "fill-current"
      )} />
      <span>{likeCount}</span>
    </Button>
  );
}

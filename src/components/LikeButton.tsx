
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  targetUserId: string;
  currentUserId?: string | null;
  className?: string;
}

export function LikeButton({ targetUserId, currentUserId, className }: LikeButtonProps) {
  const { likeCount, isLiked, isLoading, toggleLike } = useLikes(targetUserId, currentUserId);

  const disabled = isLoading || !currentUserId || currentUserId === targetUserId;

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleLike();
      }}
      className={cn(
        "gap-2 transition-colors",
        isLiked && "text-red-500 hover:text-red-600",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      title={
        !currentUserId ? "Please login to like" :
        currentUserId === targetUserId ? "You cannot like your own profile" :
        isLiked ? "Unlike profile" : "Like profile"
      }
    >
      <Heart className={cn(
        "h-5 w-5 transition-all",
        isLiked && "fill-current animate-like"
      )} />
      <span>{likeCount}</span>
    </Button>
  );
}

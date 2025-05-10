
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LikeButtonProps {
  targetUserId: string;
  currentUserId?: string | null;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  [key: `data-${string}`]: string | boolean; // Allow any data-* attributes
}

export function LikeButton({ targetUserId, currentUserId, className, onClick, ...props }: LikeButtonProps) {
  const { likeCount, isLiked, isLoading, toggleLike } = useLikes(targetUserId, currentUserId);

  const disabled = isLoading || !currentUserId || currentUserId === targetUserId;

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={(e) => {
        // Mark the event target to prevent navigation
        (e.target as any).__isLikeButtonClick = true;
        
        // Stop event propagation
        e.preventDefault();
        e.stopPropagation();
        
        // Process the like action
        toggleLike();
        if (onClick) onClick(e);
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
      {...props}
    >
      <Heart className={cn(
        "h-5 w-5 transition-all",
        isLiked && "fill-current animate-like"
      )} />
      <span>{likeCount}</span>
    </Button>
  );
}

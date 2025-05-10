
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  targetUserId: string;
  currentUserId?: string | null;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  [key: `data-${string}`]: string | boolean; // Allow any data-* attributes
}

export function LikeButton({ targetUserId, currentUserId, className, onClick, ...props }: LikeButtonProps) {
  const { likeCount, isLiked, isLoading, toggleLike } = useLikes(targetUserId, currentUserId);
  const { toast } = useToast();

  const disabled = isLoading || !currentUserId || currentUserId === targetUserId;
  
  const handleLikeClick = async (e: React.MouseEvent) => {
    // Mark the event target to prevent navigation
    (e.target as any).__isLikeButtonClick = true;
    
    // Stop event propagation
    e.preventDefault();
    e.stopPropagation();
    
    // Check if the user is logged in
    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to like profiles",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user is trying to like their own profile
    if (currentUserId === targetUserId) {
      toast({
        title: "Action not allowed",
        description: "You cannot like your own profile",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Process the like action
      await toggleLike();
      
      // Show success message
      toast({
        title: isLiked ? "Profile unliked" : "Profile liked",
        description: isLiked ? "You've removed your like" : "You've liked this profile",
        variant: "default"
      });
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: "Failed to process like action. Please try again.",
        variant: "destructive"
      });
    }
    
    if (onClick) onClick(e);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={handleLikeClick}
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

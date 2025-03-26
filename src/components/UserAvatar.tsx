
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface UserAvatarProps {
  src?: string | null;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "away" | "busy" | null;
  className?: string;
}

const UserAvatar = ({ 
  src, 
  fallback, 
  size = "md", 
  status,
  className 
}: UserAvatarProps) => {
  // Map size string to dimensions
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20"
  };
  
  // Handle avatar failure by using fallback with proper size
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log("Avatar image failed to load:", src);
    e.currentTarget.src = "";  // Clear the source to show fallback
  };
  
  // Generate fallback text from name or use default icon
  const getFallback = () => {
    if (!fallback) {
      return <User className="h-full w-full p-1.5" />;
    }
    
    // If it's a name, take first letter or first letters of first and last name
    const parts = fallback.split(" ");
    if (parts.length === 1) {
      return fallback.charAt(0).toUpperCase();
    } else {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
  };
  
  return (
    <div className={cn("relative", className)}>
      <Avatar className={cn(sizeClasses[size], "border-2 border-background")}>
        {src ? (
          <AvatarImage 
            src={src} 
            alt={fallback || "User avatar"}
            onError={handleImageError}
            className="object-cover"
          />
        ) : null}
        <AvatarFallback className="text-primary-foreground bg-primary">
          {getFallback()}
        </AvatarFallback>
      </Avatar>
      
      {status && (
        <div className={cn(
          "absolute bottom-0 right-0 rounded-full border-2 border-background",
          size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5",
          status === "online" ? "bg-green-500" : 
          status === "away" ? "bg-yellow-500" : 
          status === "busy" ? "bg-red-500" : 
          "bg-slate-300"
        )}></div>
      )}
    </div>
  );
};

export default UserAvatar;

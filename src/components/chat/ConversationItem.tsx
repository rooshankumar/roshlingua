import { ChatConversation } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatLastSeen, formatMessageTime } from "@/utils/chatUtils";
import { getOtherParticipant } from "@/utils/chatUtils";

interface ConversationItemProps {
  conversation: ChatConversation;
  currentUserId: string;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem = ({
  conversation,
  currentUserId,
  isActive,
  onClick,
}: ConversationItemProps) => {
  const otherParticipant = getOtherParticipant(conversation, currentUserId);
  // Only show as unread if we have a positive unread count
  const hasUnread = (conversation.unreadCount > 0);
  const lastMessage = conversation.lastMessage;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div
      className={cn(
        "flex items-center p-4 gap-3 cursor-pointer hover:bg-accent/50 transition-colors",
        isActive && "bg-accent",
        hasUnread && !isActive && "bg-chat-unread/50"
      )}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
          <AvatarFallback>{getInitials(otherParticipant.name)}</AvatarFallback>
        </Avatar>
        {/* Online status indicator (green dot) */}
        <span className={cn(
          "absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-background",
          otherParticipant.isOnline ? "bg-green-500" : "bg-gray-400"
        )} />

        {/* Unread notification dot - show in top right only if has unread messages */}
        {conversation.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full min-w-[16px] h-4 flex items-center justify-center text-xs font-medium px-1">
            {conversation.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="font-medium truncate">{otherParticipant.name}</h3>
          {lastMessage && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatMessageTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p
            className={cn(
              "text-sm truncate",
              hasUnread ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {lastMessage.sender_id === currentUserId ? "You: " : ""}
            {lastMessage.content}
          </p>
        )}
      </div>
    </div>
  );
};
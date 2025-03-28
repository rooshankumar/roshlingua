
import { Conversation } from "@/types/chat";
import { formatMessageTime, getOtherParticipant } from "@/utils/chatUtils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: Conversation;
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
  const hasUnread = (conversation.unreadCount || 0) > 0;
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
        {otherParticipant.isOnline && (
          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
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
      {hasUnread && (
        <div className="h-2.5 w-2.5 rounded-full bg-chat-primary" />
      )}
    </div>
  );
};
import { ChatConversation } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatLastSeen } from "@/utils/chatUtils";

interface ConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
}

export const ConversationItem = ({
  conversation,
  isActive,
  onClick,
  currentUserId
}: ConversationItemProps) => {
  const otherParticipant = conversation.participants.find(
    p => p.user_id !== currentUserId
  );

  if (!otherParticipant?.user) return null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-100 transition-colors",
        isActive && "bg-chat-unread",
        conversation.unread_count && "bg-chat-unread"
      )}
    >
      <Avatar>
        <AvatarImage src={otherParticipant.user.avatar_url} />
        <AvatarFallback>
          {otherParticipant.user.full_name?.[0] || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium truncate">
            {otherParticipant.user.full_name}
          </p>
          {conversation.last_message && (
            <span className="text-xs text-gray-500">
              {formatLastSeen(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        {conversation.last_message && (
          <p className="text-sm text-gray-500 truncate">
            {conversation.last_message.content}
          </p>
        )}
      </div>
    </div>
  );
};

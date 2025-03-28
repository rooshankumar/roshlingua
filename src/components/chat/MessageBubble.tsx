
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export const MessageBubble = ({ message, isOwnMessage }: MessageBubbleProps) => {
  const timestamp = format(new Date(message.created_at), "h:mm a");
  
  return (
    <div
      className={cn(
        "flex gap-2",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[80%] px-4 py-2 rounded-lg",
          isOwnMessage
            ? "bg-chat-primary text-white rounded-br-none"
            : "bg-muted rounded-bl-none"
        )}
      >
        <p>{message.content}</p>
        <div className={cn(
          "flex items-center text-xs mt-1 gap-1",
          isOwnMessage ? "text-white/70 justify-end" : "text-muted-foreground"
        )}>
          <span>{timestamp}</span>
          {isOwnMessage && (
            message.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
          )}
        </div>
      </div>
    </div>
  );
};
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { formatMessageDate } from "@/utils/chatUtils";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export const MessageBubble = ({ message, isCurrentUser }: MessageBubbleProps) => {
  return (
    <div className={cn("flex", isCurrentUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2",
          isCurrentUser ? "bg-chat-primary text-white" : "bg-gray-100"
        )}
      >
        <p className="text-sm">{message.content}</p>
        <p className="text-xs mt-1 opacity-70">
          {formatMessageDate(message.created_at)}
        </p>
      </div>
    </div>
  );
};

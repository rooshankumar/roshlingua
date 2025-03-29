
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
import { useState } from "react";
import { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Translate, VolumeIcon, BookMark } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export const MessageBubble = ({ message, isOwnMessage }: MessageBubbleProps) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState("");

  return (
    <div className={`flex flex-col gap-1 max-w-[80%] ${isOwnMessage ? "ml-auto" : ""}`}>
      <div
        className={`p-3 rounded-lg ${
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <p>{message.content}</p>
        {showTranslation && <p className="mt-2 text-sm opacity-80">{translation}</p>}
      </div>
      
      <div className={`flex gap-2 ${isOwnMessage ? "justify-end" : ""}`}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Translate className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <VolumeIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <BookMark className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
